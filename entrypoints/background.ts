import { browser, defineBackground } from '#imports';
import {
  applyAuditProfile,
  auditProfileSnapshotKey,
  profileSupportsScope,
  scanScopeForProfile,
  type ProfiledScanResult,
} from '../lib/audit/audit-profiles';
import { loadActiveAuditProfile } from '../lib/audit/audit-profile-storage';
import {
  applyFindingLifecycle,
  deduplicateScanResult,
} from '../lib/audit/finding-lifecycle';
import {
  applyStoredFindingReviews,
  clearFindingReviewHistory,
  resetStoredFindingReview,
  saveFindingReviewState,
  syncStoredFindingReviewNote,
} from '../lib/audit/finding-review-storage';
import {
  removeStoredMultipageAuditTraceInteraction,
  updateStoredMultipageAuditScan,
  updateStoredMultipageAuditTrace,
} from '../lib/audit/multipage-audit-storage';
import {
  captureVisibleTabFromSource,
  visibleTabCaptureSource,
} from '../lib/extension/visible-tab-capture';
import { ensureRuntimeScripts } from '../lib/extension/runtime-injection';
import {
  recordFocusMemoryScan,
  updateFocusMemoryScanNotes,
} from '../lib/focus-memory/storage';
import type { FocusVisibleCaptureMessage } from '../lib/runtime/focus-visible';
import {
  appendRuntimeEventsToSession,
  clearSessionEvents,
  emptySessionState,
  invalidateSessionScanForUrl,
  normalizeSessionState,
  pauseSessionForNavigation,
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
  FocusMemoryCapturedEvidence,
  RuntimeInjectionMode,
  SaveScanResponse,
  SaveAuditorNoteResponse,
  SaveFindingReviewStateResponse,
  ScanResult,
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

function pauseTraceAfterDocumentNavigation(
  tabId: number,
  url: string,
  navigationStartedAt: number,
): Promise<void> {
  return serializeTabWrite(tabId, async () => {
    const state = await getSession(tabId);
    // tabs.onUpdated may have fired before Trace was started while its async
    // storage work is still queued. Do not let that stale navigation pause a
    // recording that began afterwards.
    if (state.startedAt != null && state.startedAt > navigationStartedAt) return;
    const next = pauseSessionForNavigation(state, url);
    if (next === state) return;
    await saveSession(next);
    await updateStoredMultipageAuditTrace(next.events).catch(() => false);
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

function comparableScanContext(previous: ScanResult | undefined, current: ProfiledScanResult): boolean {
  if (!previous || previous.url !== current.url) return false;
  const previousScope = previous.scope?.type ?? 'page';
  const currentScope = current.scope?.type ?? 'page';
  if (previousScope !== currentScope) return false;
  const previousComponentScope = previous.scope?.type === 'component' ? previous.scope : undefined;
  const currentComponentScope = current.scope?.type === 'component' ? current.scope : undefined;
  if (previousComponentScope && currentComponentScope
    && previousComponentScope.selector !== currentComponentScope.selector) return false;
  return auditProfileSnapshotKey(previous) === auditProfileSnapshotKey(current);
}

function remapCapturedEvidence(
  source: ScanResult,
  current: ScanResult,
  capturedEvidence: FocusMemoryCapturedEvidence[] | undefined,
): FocusMemoryCapturedEvidence[] {
  if (!capturedEvidence?.length) return [];
  const byFindingId = new Map<string, FocusMemoryCapturedEvidence>();
  for (const evidence of capturedEvidence) {
    const sourceIssue = source.issues[evidence.issueIndex];
    if (sourceIssue) byFindingId.set(sourceIssue.id, evidence);
  }
  return current.issues.flatMap((issue, issueIndex) => {
    const evidence = byFindingId.get(issue.id);
    return evidence ? [{ ...evidence, issueIndex }] : [];
  });
}

async function normalizeSavedScan(
  state: SessionState,
  scan: ScanResult,
): Promise<ProfiledScanResult> {
  const incoming = scan as ProfiledScanResult;
  const activeProfile = await loadActiveAuditProfile();
  const scanScope = scanScopeForProfile(incoming);
  const profiled = incoming.auditProfile
    ? incoming
    : profileSupportsScope(activeProfile, scanScope)
      ? applyAuditProfile(incoming, activeProfile, scanScope)
      : deduplicateScanResult(incoming) as ProfiledScanResult;

  const normalized = state.scan?.scannedAt === profiled.scannedAt
    ? deduplicateScanResult(profiled) as ProfiledScanResult
    : applyFindingLifecycle(
        comparableScanContext(state.scan, profiled) ? state.scan : undefined,
        profiled,
      ) as ProfiledScanResult;
  return await applyStoredFindingReviews(normalized) as ProfiledScanResult;
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
        if (state.recording && !next.recording) {
          await updateStoredMultipageAuditTrace(next.events).catch(() => false);
        }
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
        await removeStoredMultipageAuditTraceInteraction(message.interactionId).catch(() => false);
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
            syncStoredFindingReviewNote(next.scan, message.target.findingId),
            updateFocusMemoryScanNotes(next.scan),
            updateStoredMultipageAuditScan(next.scan),
          ]);
          if (results[0]?.status === 'rejected') warnings.push('finding-review-write-failed');
          if (results[1]?.status === 'rejected') warnings.push('focus-memory-write-failed');
          if (results[2]?.status === 'rejected') warnings.push('multipage-audit-write-failed');
        } else if (message.target.kind === 'runtime-event') {
          const persisted = await Promise.allSettled([updateStoredMultipageAuditTrace(next.events)]);
          if (persisted[0]?.status === 'rejected') warnings.push('multipage-audit-write-failed');
        }
        await broadcast(next);
        return {
          state: next,
          ...(warnings.length ? { warnings } : {}),
        } satisfies SaveAuditorNoteResponse;
      });
    }

    if (message.type === 'FOCUSTRACE_SAVE_FINDING_REVIEW_STATE') {
      return serializeTabWrite(message.tabId, async () => {
        const current = await getSession(message.tabId);
        if (!current.scan) return { state: current } satisfies SaveFindingReviewStateResponse;
        const nextScan = message.state
          ? await saveFindingReviewState(current.scan, message.findingId, message.state)
          : await resetStoredFindingReview(current.scan, message.findingId);
        const next = nextScan === current.scan ? current : { ...current, scan: nextScan };
        if (next !== current) await saveSession(next);
        const warnings: AuditorNotePersistenceWarning[] = [];
        if (next.scan) {
          const persisted = await Promise.allSettled([updateStoredMultipageAuditScan(next.scan)]);
          if (persisted[0]?.status === 'rejected') warnings.push('multipage-audit-write-failed');
        }
        await broadcast(next);
        return {
          state: next,
          ...(warnings.length ? { warnings } : {}),
        } satisfies SaveFindingReviewStateResponse;
      });
    }

    if (message.type === 'FOCUSTRACE_RESET_TAB') {
      return serializeTabWrite(message.tabId, async () => {
        const current = await getSession(message.tabId);
        const next = resetSessionState(current, message.tabId);
        await clearFindingReviewHistory();
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
        const next = setSessionRecordingState(state, message.enabled, message.startedAt, message.pageUrl);
        await saveSession(next);
        if (!message.enabled) {
          await updateStoredMultipageAuditTrace(next.events).catch(() => false);
        }
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
        const normalizedScan = await normalizeSavedScan(state, message.scan);
        const remappedEvidence = remapCapturedEvidence(message.scan, normalizedScan, message.memoryEvidence);
        const next = updateSessionScan(state, normalizedScan, message.textResizeBaseline);
        await saveSession(next);
        let warning: SaveScanResponse['warning'];
        try {
          await recordFocusMemoryScan(normalizedScan, remappedEvidence);
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

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      void invalidateScanAfterNavigation(tabId, changeInfo.url).catch(() => undefined);
    }

    if (changeInfo.status === 'loading' && tab.url) {
      const navigationStartedAt = Date.now();
      void pauseTraceAfterDocumentNavigation(
        tabId,
        changeInfo.url ?? tab.url,
        navigationStartedAt,
      ).catch(() => undefined);
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
