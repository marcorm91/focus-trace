import { browser } from '#imports';

export const WEB_PAGE_ACCESS_ORIGINS = ['http://*/*', 'https://*/*'] as const;

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

/**
 * Requests normal web-page access before reading privileged tab URL fields.
 *
 * A fresh Chromium installation may hide Tab.url until host access has already
 * been granted. This request must therefore be the first extension API call in
 * the user's click path; looking up the tab first creates a permission
 * bootstrap loop and can also lose the transient user gesture required by
 * permissions.request().
 */
export function requestWebPageAccess(): Promise<boolean> {
  return browser.permissions.request({ origins: [...WEB_PAGE_ACCESS_ORIGINS] });
}

export async function requestActivePageAccess(): Promise<WebPageTab | undefined> {
  if (!(await requestWebPageAccess())) return undefined;
  const tab = await activeWebPageTab();
  return tab;
}

export async function requestTabPageAccess(tabId: number): Promise<WebPageTab | undefined> {
  if (!(await requestWebPageAccess())) return undefined;
  const tab = await webPageTabById(tabId);
  return tab;
}
