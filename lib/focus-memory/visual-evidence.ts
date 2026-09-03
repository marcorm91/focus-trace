import { browser } from '#imports';
import type { FocusMemoryCapturedEvidence, ScanResult } from '../../shared/types';
import { focusMemorySettingsState } from './storage';

const MAX_MEMORY_PREVIEWS_PER_SCAN = 8;
const MAX_PREVIEW_WIDTH = 360;
const MAX_PREVIEW_HEIGHT = 240;
const PREVIEW_PADDING = 20;
const PREVIEW_JPEG_QUALITY = 0.62;

type MemoryEvidenceCandidate = {
  issueIndex: number;
  selector: string;
};

type MemoryEvidenceMetrics = {
  issueIndex: number;
  rect: { x: number; y: number; width: number; height: number };
  viewport: { width: number; height: number };
};

function collectVisibleMemoryTargetsInPage(
  candidates: MemoryEvidenceCandidate[],
): MemoryEvidenceMetrics[] {
  const results: MemoryEvidenceMetrics[] = [];

  for (const candidate of candidates) {
    let element: Element | null = null;
    try {
      element = document.querySelector(candidate.selector);
    } catch {
      continue;
    }
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const visible = rect.bottom > 0
      && rect.right > 0
      && rect.top < window.innerHeight
      && rect.left < window.innerWidth;
    if (!visible) continue;

    results.push({
      issueIndex: candidate.issueIndex,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
  }

  return results;
}

function outputScale(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 1;
  return Math.min(1, MAX_PREVIEW_WIDTH / width, MAX_PREVIEW_HEIGHT / height);
}

async function cropMemoryPreview(dataUrl: string, metrics: MemoryEvidenceMetrics): Promise<string | undefined> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const scaleX = image.naturalWidth / metrics.viewport.width;
  const scaleY = image.naturalHeight / metrics.viewport.height;
  const leftCss = Math.max(0, metrics.rect.x - PREVIEW_PADDING);
  const topCss = Math.max(0, metrics.rect.y - PREVIEW_PADDING);
  const rightCss = Math.min(metrics.viewport.width, metrics.rect.x + metrics.rect.width + PREVIEW_PADDING);
  const bottomCss = Math.min(metrics.viewport.height, metrics.rect.y + metrics.rect.height + PREVIEW_PADDING);

  const sx = Math.max(0, Math.floor(leftCss * scaleX));
  const sy = Math.max(0, Math.floor(topCss * scaleY));
  const sw = Math.max(1, Math.ceil((rightCss - leftCss) * scaleX));
  const sh = Math.max(1, Math.ceil((bottomCss - topCss) * scaleY));
  const scale = outputScale(sw, sh);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const context = canvas.getContext('2d');
  if (!context) return undefined;

  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const targetX = (metrics.rect.x - leftCss) * scaleX * scale;
  const targetY = (metrics.rect.y - topCss) * scaleY * scale;
  const targetW = metrics.rect.width * scaleX * scale;
  const targetH = metrics.rect.height * scaleY * scale;

  context.save();
  context.strokeStyle = '#b42318';
  context.lineWidth = Math.max(3, Math.round(4 * scale));
  context.strokeRect(
    Math.max(1, targetX),
    Math.max(1, targetY),
    Math.max(1, targetW),
    Math.max(1, targetH),
  );
  context.restore();

  return canvas.toDataURL('image/jpeg', PREVIEW_JPEG_QUALITY);
}

function compactLocator(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 240);
}

export async function collectFocusMemoryEvidence(
  tabId: number,
  scan: ScanResult,
): Promise<FocusMemoryCapturedEvidence[]> {
  const { settings } = await focusMemorySettingsState();
  if (!settings.enabled || !scan.issues.length) return [];

  const evidence: FocusMemoryCapturedEvidence[] = [];
  const candidates: MemoryEvidenceCandidate[] = [];

  scan.issues.forEach((issue, issueIndex) => {
    const selector = issue.targets[0];
    if (!selector) return;
    const locator = compactLocator(selector);
    if (!locator) return;
    evidence.push({ issueIndex, locator });
    if (candidates.length < MAX_MEMORY_PREVIEWS_PER_SCAN) {
      candidates.push({ issueIndex, selector });
    }
  });

  if (!candidates.length) return evidence;

  let metrics: MemoryEvidenceMetrics[] = [];
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: collectVisibleMemoryTargetsInPage,
      args: [candidates],
    });
    metrics = results[0]?.result ?? [];
  } catch {
    return evidence;
  }
  if (!metrics.length) return evidence;

  try {
    const tab = await browser.tabs.get(tabId);
    if (tab.windowId == null || !tab.active) return evidence;
    const screenshot = await browser.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: 70,
    });
    const capturedAt = Date.now();
    const evidenceByIssue = new Map(evidence.map((item) => [item.issueIndex, item]));

    for (const item of metrics.slice(0, MAX_MEMORY_PREVIEWS_PER_SCAN)) {
      const target = evidenceByIssue.get(item.issueIndex);
      if (!target) continue;
      try {
        const dataUrl = await cropMemoryPreview(screenshot, item);
        if (dataUrl) {
          target.dataUrl = dataUrl;
          target.capturedAt = capturedAt;
        }
      } catch {
        // Keep the compact locator when image decoding/cropping is unavailable.
      }
    }
  } catch {
    // Restricted pages or browser screenshot policies fall back to the locator.
  }

  return evidence;
}
