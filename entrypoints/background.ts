import { browser, defineBackground } from '#imports';
import { defaultRuntimeBreakpointSettings, normalizeRuntimeBreakpointSettings } from '../lib/runtime/breakpoints';
import type { ExtensionMessage, SessionState } from '../shared/types';

const MAX_EVENTS = 500;
const keyForTab = (tabId: number) => `session:${tabId}`;
const tabWriteQueues = new Map<number, Promise<unknown>>();

function serializeTabWrite<T>(tabId: number, work: () => Promise<T>): Promise<T> {
  const previous = tabWriteQueues.get(tabId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(work);
  tabWriteQueues.set(tabId, next);

  const release = () => {
    if (tabWriteQueues.get(tabId) === next) tabWriteQueues.delete(tabId);
  };
  next.then(release, release);

  return next;
}

function normalizeSession(state: SessionState): SessionState {
  return {
    ...state,
    breakpoints: normalizeRuntimeBreakpointSettings(state.breakpoints),
  };
}

async function getSession(tabId: number): Promise<SessionState> {
  const key = keyForTab(tabId);
  const stored = await browser.storage.session.get(key);
  const existing = stored[key] as SessionState | undefined;
  return existing
    ? normalizeSession(existing)
    : { tabId, recording: false, events: [], breakpoints: defaultRuntimeBreakpointSettings() };
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
      return serializeTabWrite(tabId, async () => {
        const state = await getSession(tabId);
        const firstBreakpointHit = message.event.breakpointHits?.[0];
        const next: SessionState = {
          ...state,
          recording: firstBreakpointHit ? false : state.recording,
          events: [...state.events, message.event].slice(-MAX_EVENTS),
          ...(firstBreakpointHit ? { pausedByBreakpoint: firstBreakpointHit } : {}),
        };
        await saveSession(next);
        await broadcast(next);
      });
    }

    if (message.type === 'FOCUSTRACE_GET_SESSION') return getSession(message.tabId);

    if (message.type === 'FOCUSTRACE_CLEAR_SESSION') {
      return serializeTabWrite(message.tabId, async () => {
        const current = await getSession(message.tabId);
        const { pausedByBreakpoint: _paused, ...rest } = current;
        const next: SessionState = {
          ...rest,
          tabId: message.tabId,
          recording: false,
          events: [],
        };
        await saveSession(next);
        await broadcast(next);
        return next;
      });
    }

    if (message.type === 'FOCUSTRACE_SET_RECORDING_STATE') {
      return serializeTabWrite(message.tabId, async () => {
        const state = await getSession(message.tabId);
        const { pausedByBreakpoint: _paused, ...rest } = state;
        const next: SessionState = {
          ...rest,
          recording: message.enabled,
          ...(message.enabled && message.startedAt ? { startedAt: message.startedAt } : {}),
        };
        await saveSession(next);
        await broadcast(next);
        return next;
      });
    }

    if (message.type === 'FOCUSTRACE_SAVE_BREAKPOINTS') {
      return serializeTabWrite(message.tabId, async () => {
        const state = await getSession(message.tabId);
        const next: SessionState = {
          ...state,
          breakpoints: normalizeRuntimeBreakpointSettings(message.breakpoints),
        };
        await saveSession(next);
        await broadcast(next);
        return next;
      });
    }

    if (message.type === 'FOCUSTRACE_SAVE_SCAN') {
      return serializeTabWrite(message.tabId, async () => {
        const state = await getSession(message.tabId);
        const next: SessionState = { ...state, scan: message.scan };
        await saveSession(next);
        await broadcast(next);
        return next;
      });
    }

    if (message.type === 'FOCUSTRACE_ENSURE_INJECTED') return ensureInjected(message.tabId).then(() => true);
  });
});
