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

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

async function cropCapture(
  dataUrl: string,
  metrics: { rect: { x: number; y: number; width: number; height: number }; viewport: { width: number; height: number } },
  tone: VisualEvidenceTone,
): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const scaleX = image.naturalWidth / metrics.viewport.width;
  const scaleY = image.naturalHeight / metrics.viewport.height;
  const pad = 28;
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
  context.strokeStyle = tone === 'fail' ? '#b42318' : tone === 'review' ? '#b54708' : '#8a6d00';
  context.lineWidth = Math.max(3, 3 * outputScale);
  context.strokeRect(targetX + 1.5, targetY + 1.5, Math.max(1, targetW - 3), Math.max(1, targetH - 3));

  return canvas.toDataURL('image/jpeg', 0.76);
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
        visuals.push({ selector: component.selector, dataUrl: await cropCapture(screenshot, metrics, tone), tone });
      } catch {
        // Some Firefox versions and restricted pages cannot capture the active tab.
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
