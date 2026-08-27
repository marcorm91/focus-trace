import { browser } from '#imports';
import {
  buildReportComponentIndex,
  collectComponentIdentitiesInPage,
  reportComponentSelectors,
} from '../report/component-identity';
import type { AppLanguage } from '../../shared/i18n';
import type { ExtensionMessage, ScanResult } from '../../shared/types';
import { localizedUserError } from '../../shared/user-facing-errors';
import type { SiteAuditPageResult, SitePageStructure } from './model';

const PAGE_LOAD_TIMEOUT = 18_000;

export function collectInternalLinksInPage(origin: string): string[] {
  const urls = new Set<string>();
  for (const anchor of [...document.querySelectorAll('a[href]')]) {
    if (!(anchor instanceof HTMLAnchorElement)) continue;
    try {
      const url = new URL(anchor.href, location.href);
      if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) continue;
      url.hash = '';
      urls.add(url.toString());
      if (urls.size >= 400) break;
    } catch {
      // Ignore malformed author URLs.
    }
  }
  return [...urls];
}

export function collectSitePageStructureInPage(): SitePageStructure {
  const selector = [
    'header', 'nav', 'main', 'footer', 'aside', 'section', 'article',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'form',
    'button', 'a[href]', 'input', 'select', 'textarea', 'details', 'dialog',
    '[role]',
  ].join(',');
  const semanticTokens: string[] = [];
  const headingLevels: number[] = [];
  let interactiveCount = 0;
  let landmarkCount = 0;
  const interactive = new Set(['button', 'a', 'input', 'select', 'textarea']);
  const landmarks = new Set(['header', 'nav', 'main', 'footer', 'aside']);

  for (const element of [...document.querySelectorAll(selector)].slice(0, 700)) {
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role')?.trim().toLowerCase();
    const token = role ? `${tag}[${role}]` : tag;
    if (semanticTokens.at(-1) !== token) semanticTokens.push(token);
    if (/^h[1-6]$/.test(tag)) headingLevels.push(Number(tag.slice(1)));
    if (interactive.has(tag) || ['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'switch'].includes(role ?? '')) interactiveCount += 1;
    if (landmarks.has(tag) || ['banner', 'navigation', 'main', 'contentinfo', 'complementary'].includes(role ?? '')) landmarkCount += 1;
  }

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  const source = `${semanticTokens.slice(0, 360).join('|')}::h=${headingLevels.join(',')}::i=${Math.min(interactiveCount, 99)}::l=${Math.min(landmarkCount, 30)}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return {
    fingerprint: `F${(hash >>> 0).toString(16).padStart(8, '0')}`,
    ...(canonical ? { canonical } : {}),
    semanticTokens: semanticTokens.slice(0, 180),
    headingLevels,
    interactiveCount,
    landmarkCount,
  };
}

export function waitForTabComplete(tabId: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer = 0;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      browser.tabs.onUpdated.removeListener(listener);
      signal?.removeEventListener('abort', aborted);
    };
    const finish = () => { cleanup(); resolve(); };
    const fail = (reason: unknown) => { cleanup(); reject(reason); };
    const aborted = () => fail(new DOMException('Site audit cancelled.', 'AbortError'));
    const listener = (updatedTabId: number, changeInfo: { status?: string }) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') finish();
    };
    browser.tabs.onUpdated.addListener(listener);
    signal?.addEventListener('abort', aborted, { once: true });
    timer = window.setTimeout(() => fail(new Error('Page load timed out.')), PAGE_LOAD_TIMEOUT);
    void browser.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') finish();
    }).catch(fail);
  });
}

export async function sourcePageLinks(tabId: number, origin: string): Promise<string[]> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: collectInternalLinksInPage,
      args: [origin],
    });
    return results[0]?.result ?? [];
  } catch {
    return [];
  }
}

export async function scanRepresentativePage(
  routeFamilyId: string,
  url: string,
  signal?: AbortSignal,
): Promise<SiteAuditPageResult> {
  let createdTabId: number | undefined;
  try {
    if (signal?.aborted) throw new DOMException('Site audit cancelled.', 'AbortError');
    const tab = await browser.tabs.create({ url, active: false });
    if (tab.id == null) throw new Error('Browser did not create a scan tab.');
    createdTabId = tab.id;
    await waitForTabComplete(tab.id, signal);
    if (signal?.aborted) throw new DOMException('Site audit cancelled.', 'AbortError');

    await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_ENSURE_INJECTED',
      tabId: tab.id,
    } satisfies ExtensionMessage);
    const scan = (await browser.tabs.sendMessage(tab.id, {
      type: 'FOCUSTRACE_RUN_SCAN',
    } satisfies ExtensionMessage)) as ScanResult;
    const structureResults = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectSitePageStructureInPage,
    });
    const structure = structureResults[0]?.result as SitePageStructure | undefined;

    const selectors = reportComponentSelectors(scan, []);
    const liveComponents = selectors.length
      ? await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: collectComponentIdentitiesInPage,
          args: [selectors],
        }).then((results) => results[0]?.result ?? []).catch(() => [])
      : [];
    const components = [...buildReportComponentIndex(scan, [], liveComponents).values()];

    return {
      url: scan.url || url,
      routeFamilyId,
      scan,
      ...(structure ? { structure } : {}),
      ...(components.length ? { components } : {}),
    };
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') throw reason;
    const language: AppLanguage = document.documentElement.lang === 'es' ? 'es' : 'en';
    return {
      url,
      routeFamilyId,
      error: localizedUserError(reason, language, 'site-audit-page'),
    };
  } finally {
    if (createdTabId != null) await browser.tabs.remove(createdTabId).catch(() => undefined);
  }
}
