import { browser, defineBackground } from '#imports';
import type { ExtensionMessage, SessionState } from '../shared/types';

const MAX_EVENTS = 500;
const keyForTab = (tabId: number) => `session:${tabId}`;

async function getSession(tabId: number): Promise<SessionState> {
  const key = keyForTab(tabId);
  const stored = await browser.storage.session.get(key);
  const existing = stored[key] as SessionState | undefined;
  return existing ?? { tabId, recording: false, events: [] };
}

async function saveSession(state: SessionState) {
  await browser.storage.session.set({ [keyForTab(state.tabId)]: state });
}

async function broadcast(state: SessionState) {
  try {
    await browser.runtime.sendMessage({ type: 'FOCUSTRACE_SESSION_UPDATED', state } satisfies ExtensionMessage);
  } catch {
    // Side panel may be closed.
  }
}

async function ensureInjected(tabId: number) {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'FOCUSTRACE_PING' });
  } catch {
    await browser.scripting.executeScript({ target: { tabId }, files: ['/content-scripts/runtime.js'] });
  }
}

export default defineBackground(() => {
  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  browser.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
    if (message.type === 'FOCUSTRACE_EVENT') {
      const tabId = sender.tab?.id;
      if (tabId == null) return;
      return (async () => {
        const state = await getSession(tabId);
        const next: SessionState = { ...state, events: [...state.events, message.event].slice(-MAX_EVENTS) };
        await saveSession(next);
        await broadcast(next);
      })();
    }

    if (message.type === 'FOCUSTRACE_GET_SESSION') return getSession(message.tabId);

    if (message.type === 'FOCUSTRACE_CLEAR_SESSION') {
      return (async () => {
        const current = await getSession(message.tabId);
        const next: SessionState = { ...current, tabId: message.tabId, recording: false, events: [] };
        await saveSession(next);
        await broadcast(next);
        return next;
      })();
    }

    if (message.type === 'FOCUSTRACE_SET_RECORDING_STATE') {
      return (async () => {
        const state = await getSession(message.tabId);
        const next: SessionState = {
          ...state,
          recording: message.enabled,
          ...(message.enabled && message.startedAt ? { startedAt: message.startedAt } : {}),
        };
        await saveSession(next);
        await broadcast(next);
        return next;
      })();
    }

    if (message.type === 'FOCUSTRACE_SAVE_SCAN') {
      return (async () => {
        const state = await getSession(message.tabId);
        const next: SessionState = { ...state, scan: message.scan };
        await saveSession(next);
        await broadcast(next);
        return next;
      })();
    }

    if (message.type === 'FOCUSTRACE_ENSURE_INJECTED') return ensureInjected(message.tabId).then(() => true);
  });
});
