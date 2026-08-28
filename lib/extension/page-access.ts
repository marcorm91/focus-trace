import { browser } from '#imports';

export interface WebPageTab {
  id: number;
  url: string;
}

export function pageAccessPattern(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return `${url.origin}/*`;
  } catch {
    return undefined;
  }
}

function webPageTab(tab: { id?: number; url?: string }): WebPageTab | undefined {
  return tab.id != null && tab.url && pageAccessPattern(tab.url)
    ? { id: tab.id, url: tab.url }
    : undefined;
}

export async function activeWebPageTab(): Promise<WebPageTab | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab ? webPageTab(tab) : undefined;
}

export async function webPageTabById(tabId: number): Promise<WebPageTab | undefined> {
  return webPageTab(await browser.tabs.get(tabId));
}

export async function requestPageAccessForUrl(url: string): Promise<boolean> {
  const pattern = pageAccessPattern(url);
  if (!pattern) return false;
  if (await browser.permissions.contains({ origins: [pattern] })) return true;
  return browser.permissions.request({ origins: [pattern] });
}

export async function requestActivePageAccess(): Promise<WebPageTab | undefined> {
  const tab = await activeWebPageTab();
  if (!tab || !(await requestPageAccessForUrl(tab.url))) return undefined;
  return tab;
}

export async function requestTabPageAccess(tabId: number): Promise<WebPageTab | undefined> {
  const tab = await webPageTabById(tabId);
  if (!tab || !(await requestPageAccessForUrl(tab.url))) return undefined;
  return tab;
}
