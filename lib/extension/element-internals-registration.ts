import { browser } from '#imports';

export const ELEMENT_INTERNALS_BRIDGE_SCRIPT_ID = 'focustrace-element-internals-bridge-v1';
export const ELEMENT_INTERNALS_BRIDGE_SCRIPT_FILE = '/content-scripts/element-internals-bridge.js';
const MATCHES = ['http://*/*', 'https://*/*'];

export async function ensureElementInternalsBridgeRegistered(): Promise<boolean> {
  try {
    const existing = await browser.scripting.getRegisteredContentScripts({
      ids: [ELEMENT_INTERNALS_BRIDGE_SCRIPT_ID],
    });
    if (existing.length > 0) return true;

    await browser.scripting.registerContentScripts([{
      id: ELEMENT_INTERNALS_BRIDGE_SCRIPT_ID,
      js: [ELEMENT_INTERNALS_BRIDGE_SCRIPT_FILE.replace(/^\//, '')],
      matches: MATCHES,
      runAt: 'document_start',
      persistAcrossSessions: true,
      world: 'MAIN',
    }]);
    return true;
  } catch {
    // Firefox versions before 128 do not support MAIN-world scripting. The
    // scanner treats missing bridge evidence as unknown instead of inventing
    // semantics, so registration failure is an intentional conservative path.
    return false;
  }
}

export async function injectElementInternalsBridge(tabId: number): Promise<boolean> {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: [ELEMENT_INTERNALS_BRIDGE_SCRIPT_FILE],
      world: 'MAIN',
    });
    return true;
  } catch {
    return false;
  }
}
