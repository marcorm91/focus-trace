import { browser } from '#imports';
import type { RuntimeEvent, ScanResult } from '../../shared/types';
import {
  buildReportComponentIndex,
  collectComponentIdentitiesInPage,
  reportComponentSelectors,
  type LiveComponentIdentity,
  type ReportComponentIdentity,
} from './component-identity';

export type VisualEvidenceTone = 'fail' | 'review' | 'warning';

export interface ReportVisualEvidence {
  selector: string;
  dataUrl: string;
  tone: VisualEvidenceTone;
}

export interface PrintableReportEvidenceBundle {
  components: ReportComponentIdentity[];
  visuals: ReportVisualEvidence[];
  visualEvidenceRequested: boolean;
  visualEvidenceLimitReached: boolean;
}

export const REPORT_EVIDENCE_STORAGE_PREFIX = 'focustrace:report-evidence:';
const MAX_VISUAL_EVIDENCE = 24;
const VISUAL_CAPTURE_HOST_PERMISSION = '<all_urls>';
let pendingVisualCapturePermission: Promise<boolean> | undefined;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * permissions.request() must run directly inside the user's click handler.
 * The sidepanel installs this in the capture phase so the permission request
 * starts before React awaits component collection and loses user activation.
 */
export function armReportVisualEvidencePermissionRequest(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  if (!target.closest('.export-pdf-report')) return;
  const option = document.querySelector<HTMLInputElement>('.report-visual-evidence-option input');
  if (!option?.checked) {
    pendingVisualCapturePermission = undefined;
    return;
  }
  pendingVisualCapturePermission = browser.permissions.request({
    origins: [VISUAL_CAPTURE_HOST_PERMISSION],
  }).catch(() => false);
}

async function hasVisualCapturePermission(): Promise<boolean> {
  const pending = pendingVisualCapturePermission;
  pendingVisualCapturePermission = undefined;
  if (pending) return pending;
  return browser.permissions.contains({ origins: [VISUAL_CAPTURE_HOST_PERMISSION] }).catch(() => false);
}

async function releaseVisualCapturePermission() {
  await browser.permissions.remove({ origins: [VISUAL_CAPTURE_HOST_PERMISSION] }).catch(() => false);
}

export async function collectReportComponents(
  tabId: number,
  scan: ScanResult | undefined,
  events: RuntimeEvent[],
): Promise<ReportComponentIdentity[]> {
  const selectors = reportComponentSelectors(scan, events);
  if (!selectors.length) return [];
  let live: LiveComponentIdentity[] = [];
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: collectComponentIdentitiesInPage,
      args: [selectors],
    });
    live = results[0]?.result ?? [];
  } catch {
    // A changed/restricted page can still use runtime/selector fallbacks.
  }
  return [...buildReportComponentIndex(scan, events, live).values()];
}

function toneForSelector(
  selector: string,
  scan: ScanResult | undefined,
  events: RuntimeEvent[],
): VisualEvidenceTone {
  if (scan?.issues.some((issue) => issue.targets.includes(selector))) return 'fail';
  if (events.some((event) => event.element?.selector === selector && event.outcome === 'fail')) return 'fail';
  if (scan?.review.some((issue) => issue.targets.includes(selector))) return 'review';
  if (events.some((event) =>
    (event.element?.selector === selector || event.mutation?.target.selector === selector)
    && (event.outcome === 'review' || Boolean(event.causes?.length)),
  )) return 'review';
  return 'warning';
}

function prepareCaptureTargetInPage(selector: string) {
  let element: Element | null = null;
  try {
    element = document.querySelector(selector);
  } catch {
    return null;
  }
  if (!element) return null;
  element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };
}

function readScrollPositionInPage() {
  return { x: window.scrollX, y: window.scrollY };
}

function restoreScrollPositionInPage(position: { x: number; y: number }) {
  window.scrollTo({ left: position.x, top: position.y, behavior: 'auto' });
}

function evidenceColor(tone: VisualEvidenceTone): string {
  return tone === 'fail' ? '#b42318' : tone === 'review' ? '#b54708' : '#8a6d00';
}

async function cropCapture(
  dataUrl: string,
  metrics: { rect: { x: number; y: number; width: number; height: number }; viewport: { width: number; height: number } },
  tone: VisualEvidenceTone,
  componentId: string,
): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const scaleX = image.naturalWidth / metrics.viewport.width;
  const scaleY = image.naturalHeight / metrics.viewport.height;
  const pad = 52;
  const leftCss = Math.max(0, metrics.rect.x - pad);
  const topCss = Math.max(0, metrics.rect.y - pad);
  const rightCss = Math.min(metrics.viewport.width, metrics.rect.x + metrics.rect.width + pad);
  const bottomCss = Math.min(metrics.viewport.height, metrics.rect.y + metrics.rect.height + pad);

  const sx = Math.max(0, Math.floor(leftCss * scaleX));
  const sy = Math.max(0, Math.floor(topCss * scaleY));
  const sw = Math.max(1, Math.ceil((rightCss - leftCss) * scaleX));
  const sh = Math.max(1, Math.ceil((bottomCss - topCss) * scaleY));

  const maxWidth = 1100;
  const outputScale = Math.min(1, maxWidth / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * outputScale));
  canvas.height = Math.max(1, Math.round(sh * outputScale));
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const targetX = (metrics.rect.x - leftCss) * scaleX * outputScale;
  const targetY = (metrics.rect.y - topCss) * scaleY * outputScale;
  const targetW = metrics.rect.width * scaleX * outputScale;
  const targetH = metrics.rect.height * scaleY * outputScale;
  const color = evidenceColor(tone);

  // De-emphasize the crop around the target, then redraw the target region at
  // full brightness so the evidence remains obvious even in a busy UI.
  context.save();
  context.fillStyle = 'rgba(15, 23, 42, 0.38)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.roundRect(
    Math.max(0, targetX - 5),
    Math.max(0, targetY - 5),
    Math.max(1, targetW + 10),
    Math.max(1, targetH + 10),
    7,
  );
  context.clip();
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  context.restore();

  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(5, 5 * outputScale);
  context.shadowColor = color;
  context.shadowBlur = Math.max(8, 12 * outputScale);
  context.strokeRect(targetX + 2, targetY + 2, Math.max(1, targetW - 4), Math.max(1, targetH - 4));
  context.restore();

  const badgeText = componentId || 'E';
  const fontSize = Math.max(18, Math.round(19 * outputScale));
  context.font = `800 ${fontSize}px system-ui, sans-serif`;
  const textWidth = context.measureText(badgeText).width;
  const badgeWidth = Math.ceil(textWidth + 22);
  const badgeHeight = Math.ceil(fontSize + 14);
  const badgeX = Math.max(4, Math.min(canvas.width - badgeWidth - 4, targetX));
  const badgeY = targetY >= badgeHeight + 10
    ? Math.max(4, targetY - badgeHeight - 7)
    : Math.min(canvas.height - badgeHeight - 4, targetY + 7);
  context.fillStyle = color;
  context.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
  context.fillStyle = '#fff';
  context.fillText(badgeText, badgeX + 11, badgeY + badgeHeight - 9);

  return canvas.toDataURL('image/jpeg', 0.8);
}

function reportEvidenceSelectors(
  scan: ScanResult | undefined,
  events: RuntimeEvent[],
): Set<string> {
  const selectors = new Set<string>();
  if (scan) {
    for (const issue of [...scan.issues, ...scan.review, ...(scan.warnings ?? [])]) {
      issue.targets.forEach((selector) => selectors.add(selector));
    }
  }
  for (const event of events) {
    if (!event.outcome && !event.causes?.length) continue;
    if (event.element?.selector) selectors.add(event.element.selector);
    if (event.mutation?.target.selector) selectors.add(event.mutation.target.selector);
  }
  return selectors;
}

export async function captureReportVisualEvidence(
  tabId: number,
  scan: ScanResult | undefined,
  components: ReportComponentIdentity[],
  events: RuntimeEvent[] = [],
): Promise<{ visuals: ReportVisualEvidence[]; limitReached: boolean }> {
  if (!components.length) return { visuals: [], limitReached: false };
  const captureAllowed = await hasVisualCapturePermission();
  if (!captureAllowed) return { visuals: [], limitReached: false };

  try {
    const tab = await browser.tabs.get(tabId);
    if (tab.windowId == null || !tab.active) return { visuals: [], limitReached: false };

    const evidenceSelectors = reportEvidenceSelectors(scan, events);
    const eligible = components.filter((component) => evidenceSelectors.has(component.selector));
    const selected = eligible.slice(0, MAX_VISUAL_EVIDENCE);
    const original = await browser.scripting.executeScript({ target: { tabId }, func: readScrollPositionInPage })
      .then((results) => results[0]?.result)
      .catch(() => undefined);
    const visuals: ReportVisualEvidence[] = [];

    try {
      for (const component of selected) {
        const metrics = await browser.scripting.executeScript({
          target: { tabId },
          func: prepareCaptureTargetInPage,
          args: [component.selector],
        }).then((results) => results[0]?.result).catch(() => null);
        if (!metrics) continue;
        await wait(90);
        try {
          const screenshot = await browser.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 78 });
          const tone = toneForSelector(component.selector, scan, events);
          visuals.push({
            selector: component.selector,
            dataUrl: await cropCapture(screenshot, metrics, tone, component.componentId),
            tone,
          });
        } catch {
          // Restricted browser pages can still reject screenshot capture.
        }
      }
    } finally {
      if (original) {
        await browser.scripting.executeScript({
          target: { tabId },
          func: restoreScrollPositionInPage,
          args: [original],
        }).catch(() => undefined);
      }
    }

    return { visuals, limitReached: eligible.length > MAX_VISUAL_EVIDENCE };
  } finally {
    // Screenshot access is intentionally scoped to this export operation.
    await releaseVisualCapturePermission();
  }
}

export async function storePrintableReportEvidence(bundle: PrintableReportEvidenceBundle): Promise<string> {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await browser.storage.session.set({ [`${REPORT_EVIDENCE_STORAGE_PREFIX}${token}`]: bundle });
  return token;
}

export async function readPrintableReportEvidence(token: string): Promise<PrintableReportEvidenceBundle | undefined> {
  const key = `${REPORT_EVIDENCE_STORAGE_PREFIX}${token}`;
  const stored = await browser.storage.session.get(key);
  const bundle = stored[key] as PrintableReportEvidenceBundle | undefined;
  if (bundle) await browser.storage.session.remove(key).catch(() => undefined);
  return bundle;
}
