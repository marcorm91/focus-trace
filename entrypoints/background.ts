import { browser, defineBackground } from '#imports';
import {
  captureVisibleTabFromSource,
  visibleTabCaptureSource,
} from '../lib/extension/visible-tab-capture';
import {
  recordFocusMemoryScan,
  updateFocusMemoryScanNotes,
} from '../lib/focus-memory/storage';
import { updateStoredMultipageAuditScan } from '../lib/audit/multipage-audit-storage';
import { ensureRuntimeScripts } from '../lib/extension/runtime-injection';
import type { FocusVisibleCaptureMessage } from '../lib/runtime/focus-visible';
import {
  appendRuntimeEventsToSession,
  clearSessionEvents,
  emptySessionState,
  invalidateSessionScanForUrl,
  normalizeSessionState,
  removeSessionInteraction,
  resetSessionState,
  setSessionRecordingState,
  updateSessionBreakpoints,
  updateSessionScan,
} from '../lib/runtime/session-state';
import { updateSessionAuditorNote } from '../shared/auditor-notes';
import type {
  AuditorNotePersistenceWarning,
  ExtensionMessage,
  RuntimeInjectionMode,
  SaveScanResponse,
  SaveAuditorNoteResponse,
  SessionState,
} from '../shared/types';

const keyForTab = (tabId: number) => `session:${tabId}`;
const tabWriteQueues = new Map<number, Promise<unknown>>();

type FirefoxSidebarBrowser = typeof browser & {
  sidebarAction: {
    open: () => Promise<void>;
  };
};

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

async function getSession(tabId: number): Promise<SessionState> {
  const key = keyForTab(tabId);
  const stored = await browser.storage.session.get(key);
  const existing = stored[key] as SessionState | undefined;
  return existing ? normalizeSessionState(existing) : emptySessionState(tabId);
}

async function saveSession(state: SessionState) {
  await browser.storage.session.set({ [keyForTab(state.tabId)]: state });
}

async function broadcast(state: SessionState) {
  try {
    await browser.runtime.sendMessage({ type: 'FOCUSTRACE_SESSION_UPDATED', state } satisfies ExtensionMessage);
  } catch {
    // Sidebar/side panel may be closed.
  }
}

async function ensureInjected(tabId: number, mode: RuntimeInjectionMode): Promise<boolean> {
  return ensureRuntimeScripts(
    mode,
    (pingType) => browser.tabs.sendMessage(tabId, { type: pingType })
      .then((response) => response === true)
      .catch(() => false),
    (file) => browser.scripting.executeScript({ target: { tabId }, files: [file] })
      .then(() => undefined),
  );
}

async function syncContentState(
  tabId: number,
  mode: RuntimeInjectionMode,
) {
  const state = await getSession(tabId);
  // A restored recording always needs the complete Trace instrumentation even
  // if a concurrent static-analysis action requested only the scan runtime.
  await ensureInjected(tabId, state.recording ? 'trace' : mode);
  await browser.tabs.sendMessage(tabId, {
    type: 'FOCUSTRACE_SET_RECORDING',
    enabled: state.recording,
    breakpoints: state.breakpoints,
  } satisfies ExtensionMessage);
}

async function restoreContentStateAfterNavigation(tabId: number, state: SessionState) {
  const injected = await ensureInjected(tabId, 'trace');
  if (!injected) return;
  await browser.tabs.sendMessage(tabId, {
    type: 'FOCUSTRACE_SET_RECORDING',
    enabled: state.recording,
    breakpoints: state.breakpoints,
  } satisfies ExtensionMessage);
}

function invalidateScanAfterNavigation(tabId: number, url: string): Promise<void> {
  return serializeTabWrite(tabId, async () => {
    const state = await getSession(tabId);
    const next = invalidateSessionScanForUrl(state, url);
    if (next === state) return;
    await saveSession(next);
    await broadcast(next);
  });
}

async function flushContentRuntimeEvents(tabId: number): Promise<void> {
  await browser.tabs.sendMessage(tabId, {
    type: 'FOCUSTRACE_FLUSH_CONTENT_EVENTS',
  } satisfies ExtensionMessage).catch(() => undefined);
}

function configurePanelAction() {
  if (import.meta.env.FIREFOX) {
    const firefoxBrowser = browser as FirefoxSidebarBrowser;
    browser.action.onClicked.addListener(() => {
      void firefoxBrowser.sidebarAction.open().catch(() => undefined);
    });
    return;
  }

  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
}

export default defineBackground(() => {
  configurePanelAction();

  browser.runtime.onMessage.addListener((message: ExtensionMessage | FocusVisibleCaptureMessage, sender) => {
    if (message.type === 'FOCUSTRACE_CAPTURE_VIEWPORT') {
      const tab = sender.tab;
      if (tab?.id == null) return Promise.resolve(undefined);
      const source = visibleTabCaptureSource(tab, tab.id, tab.url);
      if (!source) return Promise.resolve(undefined);
      return captureVisibleTabFromSource(source, { format: 'png' });
    }

    if (message.type === 'FOCUSTRACE_EVENT' || message.type === 'FOCUSTRACE_EVENTS') {
      const tabId = sender.tab?.id;
      if (tabId == null) return;
      const events = message.type === 'FOCUSTRACE_EVENTS' ? message.events : [message.event];
      if (events.length === 0) return;
      return serializeTabWrite(tabId, async () => {
        const state = await getSession(tabId);
        const next = appendRuntimeEventsToSession(state, events);
        await saveSession(next);
        await broadcast(next);
      });
    }

    if (message.type === 'FOCUSTRACE_GET_CONTENT_STATE') {
      const tabId = sender.tab?.id;
      if (tabId == null) return;
      return getSession(tabId);
    }

    if (message.type === 'FOCUSTRACE_GET_SESSION') return getSession(message.tabId);

    if (message.type === 'FOCUSTRACE_FLUSH_SESSION') {
      return flushContentRuntimeEvents(message.tabId)
        .then(() => serializeTabWrite(message.tabId, () => getSession(message.tabId)));
    }

    if (message.type === 'FOCUSTRACE_CLEAR_SESSION') {
      return serializeTabWrite(message.tabId, async () => {
        const current = await getSession(message.tabId);
        const next = clearSessionEvents(current, message.tabId);
        await saveSession(next);
        await broadcast(next);
        return next;
      });
    }

    if (message.type === 'FOCUSTRACE_DELETE_INTERACTION') {
      return serializeTabWrite(message.tabId, async () => {
        const current = await getSession(message.tabId);
        const next = removeSessionInteraction(current, message.interactionId);
        if (next === current) return current;
        await saveSession(next);
        await broadcast(next);
        return next;
      });
    }

    if (message.type === 'FOCUSTRACE_SAVE_AUDITOR_NOTE') {
      return serializeTabWrite(message.tabId, async () => {
        const current = await getSession(message.tabId);
        const next = updateSessionAuditorNote(current, message.target, message.text);
        if (next === current) return { state: current } satisfies SaveAuditorNoteResponse;

        await saveSession(next);
        const warnings: AuditorNotePersistenceWarning[] = [];
        if (message.target.kind === 'scan-finding' && next.scan) {
          const results = await Promise.allSettled([
            updateFocusMemoryScanNotes(next.scan),
            updateStoredMultipageAuditScan(next.scan),
          ]);
          if (results[0]?.status === 'rejected') warnings.push('focus-memory-write-failed');
          if (results[1]?.status === 'rejected') warnings.push('multipage-audit-write-failed');
        }
        await broadcast(next);
        return {
          state: next,
          ...(warnings.length ? { warnings } : {}),
        } satisfies SaveAuditorNoteResponse;
      });
    }

    if (message.type === 'FOCUSTRACE_RESET_TAB') {
      return serializeTabWrite(message.tabId, async () => {
        const current = await getSession(message.tabId);
        const next = resetSessionState(current, message.tabId);
        await saveSession(next);
        await browser.tabs.sendMessage(message.tabId, {
          type: 'FOCUSTRACE_SET_RECORDING',
          enabled: false,
          breakpoints: next.breakpoints,
        } satisfies ExtensionMessage).catch(() => undefined);
        await browser.scripting.executeScript({
          target: { tabId: message.tabId },
          func: () => {
            document.documentElement.removeAttribute('data-focustrace-scan-component');
            document.documentElement.removeAttribute('data-focustrace-focus-component');
          },
        }).catch(() => undefined);
        await broadcast(next);
        return next;
      });
    }

    if (message.type === 'FOCUSTRACE_SET_RECORDING_STATE') {
      return serializeTabWrite(message.tabId, async () => {
        const state = await getSession(message.tabId);
        const next = setSessionRecordingState(state, message.enabled, message.startedAt);
        await saveSession(next);
        await broadcast(next);
        return next;
      });
    }

    if (message.type === 'FOCUSTRACE_SAVE_BREAKPOINTS') {
      return serializeTabWrite(message.tabId, async () => {
        const state = await getSession(message.tabId);
        const next = updateSessionBreakpoints(state, message.breakpoints);
        await saveSession(next);
        await broadcast(next);
        return next;
      });
    }

    if (message.type === 'FOCUSTRACE_SAVE_SCAN') {
      return serializeTabWrite(message.tabId, async () => {
        const state = await getSession(message.tabId);
        const next = updateSessionScan(state, message.scan, message.textResizeBaseline);
        await saveSession(next);
        let warning: SaveScanResponse['warning'];
        try {
          await recordFocusMemoryScan(message.scan, message.memoryEvidence);
        } catch {
          warning = 'focus-memory-write-failed';
        }
        await broadcast(next);
        return {
          state: next,
          ...(warning ? { warning } : {}),
        } satisfies SaveScanResponse;
      });
    }

    if (message.type === 'FOCUSTRACE_ENSURE_INJECTED') {
      return syncContentState(message.tabId, message.mode).then(() => true);
    }
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      void invalidateScanAfterNavigation(tabId, changeInfo.url).catch(() => undefined);
    }

    if (changeInfo.status !== 'complete') return;
    void getSession(tabId)
      .then((state) => state.recording ? restoreContentStateAfterNavigation(tabId, state) : undefined)
      .catch(() => undefined);
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    tabWriteQueues.delete(tabId);
    void browser.storage.session.remove(keyForTab(tabId));
  });
});
