import { browser } from '#imports';
import { normalizeAuditPageUrl } from '../audit/multipage-audit';

interface VisibleTabLike {
  id?: number;
  windowId?: number;
  active?: boolean;
  url?: string;
}

export interface VisibleTabCaptureSource {
  tabId: number;
  windowId: number;
  pageUrl?: string;
}

interface VisibleTabCaptureOptions {
  format: 'jpeg' | 'png';
  quality?: number;
}

function sourceDocumentMatches(
  tab: VisibleTabLike,
  source: VisibleTabCaptureSource,
): boolean {
  if (tab.id !== source.tabId || tab.windowId !== source.windowId) return false;
  if (!source.pageUrl) return true;
  return Boolean(tab.url && normalizeAuditPageUrl(tab.url) === source.pageUrl);
}

export function visibleTabCaptureSource(
  tab: VisibleTabLike,
  tabId: number,
  pageUrl?: string,
): VisibleTabCaptureSource | undefined {
  if (tab.id !== tabId || tab.windowId == null || !tab.active) return undefined;
  const expectedPageUrl = pageUrl ? normalizeAuditPageUrl(pageUrl) : undefined;
  if (expectedPageUrl && (!tab.url || normalizeAuditPageUrl(tab.url) !== expectedPageUrl)) {
    return undefined;
  }
  const lockedPageUrl = expectedPageUrl ?? (tab.url ? normalizeAuditPageUrl(tab.url) : undefined);
  return {
    tabId,
    windowId: tab.windowId,
    ...(lockedPageUrl ? { pageUrl: lockedPageUrl } : {}),
  };
}

export async function resolveVisibleTabCaptureSource(
  tabId: number,
  pageUrl?: string,
): Promise<VisibleTabCaptureSource | undefined> {
  const tab = await browser.tabs.get(tabId).catch(() => undefined);
  return tab ? visibleTabCaptureSource(tab, tabId, pageUrl) : undefined;
}

export async function visibleTabCaptureSourceIsCurrent(
  source: VisibleTabCaptureSource,
  requireActive = true,
): Promise<boolean> {
  const tab = await browser.tabs.get(source.tabId).catch(() => undefined);
  return Boolean(
    tab
    && (!requireActive || tab.active)
    && sourceDocumentMatches(tab, source),
  );
}

export async function captureVisibleTabFromSource(
  source: VisibleTabCaptureSource,
  options: VisibleTabCaptureOptions,
): Promise<string | undefined> {
  if (!await visibleTabCaptureSourceIsCurrent(source)) return undefined;
  const screenshot = await browser.tabs.captureVisibleTab(source.windowId, options).catch(() => undefined);
  if (!screenshot || !await visibleTabCaptureSourceIsCurrent(source)) return undefined;
  return screenshot;
}
