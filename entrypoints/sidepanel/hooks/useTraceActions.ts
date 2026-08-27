import {
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { browser } from '#imports';
import { normalizeRuntimeBreakpointSettings } from '../../../lib/runtime/breakpoints';
import { groupRuntimeInteractions } from '../../../lib/runtime/causality';
import {
  buildFocusGraph,
  buildObservedFocusPath,
} from '../../../lib/runtime/focus-graph';
import {
  clearFocusPathInPage,
  showFocusPathInPage,
  type FocusPathOverlayEntry,
  type FocusPathOverlayResult,
} from '../../../lib/runtime/focus-path-overlay';
import { buildFocusJourney } from '../../../lib/runtime/focus-journey';
import { buildPageInspectorEntries } from '../../../lib/runtime/page-inspector';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type {
  ExtensionMessage,
  FocusWalkResult,
  RuntimeBreakpointId,
  RuntimeBreakpointSettings,
  ScanResult,
  SessionState,
} from '../../../shared/types';

type UseTraceActionsOptions = {
  tabId: number | undefined;
  session: SessionState;
  scan: ScanResult | undefined;
  language: AppLanguage;
  setSession: Dispatch<SetStateAction<SessionState>>;
  refresh: (tabId: number) => Promise<void>;
  ensureInjected: () => Promise<void>;
  requestPageAccess: () => Promise<void>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | undefined>>;
  focusPathVisible: boolean;
  setFocusPathVisible: Dispatch<SetStateAction<boolean>>;
  setSelectedFocusSelector: Dispatch<SetStateAction<string | undefined>>;
  resetFocusPathState: () => void;
  onOpenTrace: () => void;
};

async function waitForRuntimeFlush(tabId: number) {
  await browser.runtime.sendMessage({
    type: 'FOCUSTRACE_FLUSH_SESSION',
    tabId,
  } satisfies ExtensionMessage);
}

export function useTraceActions({
  tabId,
  session,
  scan,
  language,
  setSession,
  refresh,
  ensureInjected,
  requestPageAccess,
  setBusy,
  setError,
  focusPathVisible,
  setFocusPathVisible,
  setSelectedFocusSelector,
  resetFocusPathState,
  onOpenTrace,
}: UseTraceActionsOptions) {
  const breakpointSettings = useMemo(
    () => normalizeRuntimeBreakpointSettings(session.breakpoints),
    [session.breakpoints],
  );

  const toggleRecording = useCallback(async () => {
    if (tabId == null) return;
    setBusy(true);
    setError(undefined);
    try {
      await ensureInjected();
      const enabled = !session.recording;
      const resumingFromBreakpoint = enabled && session.pausedByBreakpoint != null;

      if (enabled) {
        await browser.scripting.executeScript({
          target: { tabId },
          func: clearFocusPathInPage,
        }).catch(() => undefined);
        resetFocusPathState();
      }

      if (enabled && !resumingFromBreakpoint) {
        await browser.runtime.sendMessage({ type: 'FOCUSTRACE_CLEAR_SESSION', tabId } satisfies ExtensionMessage);
      }

      const startedAt = enabled ? Date.now() : undefined;
      await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_SET_RECORDING',
        enabled,
        breakpoints: breakpointSettings,
      } satisfies ExtensionMessage);

      const next = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SET_RECORDING_STATE',
        tabId,
        enabled,
        ...(startedAt ? { startedAt } : {}),
      } satisfies ExtensionMessage)) as SessionState;
      setSession(next);
      onOpenTrace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }, [
    breakpointSettings,
    ensureInjected,
    onOpenTrace,
    resetFocusPathState,
    session.pausedByBreakpoint,
    session.recording,
    setBusy,
    setError,
    setSession,
    tabId,
  ]);

  const runFocusWalk = useCallback(async () => {
    if (tabId == null) return;
    setBusy(true);
    setError(undefined);
    let contentRecording = false;

    try {
      await ensureInjected();
      await browser.scripting.executeScript({
        target: { tabId },
        func: clearFocusPathInPage,
      }).catch(() => undefined);
      resetFocusPathState();

      await browser.runtime.sendMessage({ type: 'FOCUSTRACE_CLEAR_SESSION', tabId } satisfies ExtensionMessage);
      await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_SET_RECORDING',
        enabled: true,
        breakpoints: breakpointSettings,
      } satisfies ExtensionMessage);
      contentRecording = true;

      const started = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SET_RECORDING_STATE',
        tabId,
        enabled: true,
        startedAt: Date.now(),
      } satisfies ExtensionMessage)) as SessionState;
      setSession(started);
      onOpenTrace();

      const result = (await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_RUN_FOCUS_WALK',
        options: { delayMs: 180, maxSteps: 80 },
      } satisfies ExtensionMessage)) as FocusWalkResult;

      await waitForRuntimeFlush(tabId);
      await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_SET_RECORDING',
        enabled: false,
        breakpoints: breakpointSettings,
      } satisfies ExtensionMessage);
      contentRecording = false;

      const stopped = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SET_RECORDING_STATE',
        tabId,
        enabled: false,
      } satisfies ExtensionMessage)) as SessionState;
      setSession(stopped);
      await waitForRuntimeFlush(tabId);
      await refresh(tabId);
      onOpenTrace();

      if (result.focusedSteps === 0) {
        setError(tr(
          language,
          'No keyboard-focusable elements were detected on this page.',
          'No se han detectado elementos enfocables por teclado en esta página.',
        ));
      }
    } catch (reason) {
      if (contentRecording) {
        await browser.tabs.sendMessage(tabId, {
          type: 'FOCUSTRACE_SET_RECORDING',
          enabled: false,
          breakpoints: breakpointSettings,
        } satisfies ExtensionMessage).catch(() => undefined);
        await browser.runtime.sendMessage({
          type: 'FOCUSTRACE_SET_RECORDING_STATE',
          tabId,
          enabled: false,
        } satisfies ExtensionMessage).catch(() => undefined);
      }
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }, [
    breakpointSettings,
    ensureInjected,
    language,
    onOpenTrace,
    refresh,
    resetFocusPathState,
    setBusy,
    setError,
    setSession,
    tabId,
  ]);

  const setBreakpoint = useCallback(async (breakpointId: RuntimeBreakpointId, enabled: boolean) => {
    if (tabId == null) return;
    setError(undefined);

    const nextSettings: RuntimeBreakpointSettings = {
      ...normalizeRuntimeBreakpointSettings(session.breakpoints),
      [breakpointId]: enabled,
    };
    setSession((current) => ({ ...current, breakpoints: nextSettings }));

    try {
      await ensureInjected();
      await browser.tabs.sendMessage(tabId, {
        type: 'FOCUSTRACE_CONFIGURE_BREAKPOINTS',
        breakpoints: nextSettings,
      } satisfies ExtensionMessage);
      const next = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_SAVE_BREAKPOINTS',
        tabId,
        breakpoints: nextSettings,
      } satisfies ExtensionMessage)) as SessionState;
      setSession(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [ensureInjected, session.breakpoints, setError, setSession, tabId]);

  const interactions = useMemo(() => groupRuntimeInteractions(session.events), [session.events]);
  const focusGraph = useMemo(() => buildFocusGraph(session.events), [session.events]);
  const focusJourney = useMemo(() => buildFocusJourney(session.events), [session.events]);
  const focusPath = useMemo(() => buildObservedFocusPath(session.events), [session.events]);
  const focusPathSteps = focusPath.reduce((total, target) => total + target.orders.length, 0);

  const showFocusPath = useCallback(async (selectedSelector?: string) => {
    if (tabId == null || focusPath.length === 0) return;
    setError(undefined);

    try {
      await requestPageAccess();
      const entries: FocusPathOverlayEntry[] = buildPageInspectorEntries(
        focusPath,
        scan,
        session.events,
        language,
      );
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: showFocusPathInPage,
        args: [entries, selectedSelector ?? null],
      });
      const result = results[0]?.result as FocusPathOverlayResult | undefined;
      if (!result?.found) {
        resetFocusPathState();
        setError(tr(
          language,
          'The recorded focus elements are no longer present on the page.',
          'Los elementos de foco grabados ya no están presentes en la página.',
        ));
        return;
      }

      setFocusPathVisible(true);
      setSelectedFocusSelector(selectedSelector);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [
    focusPath,
    language,
    requestPageAccess,
    resetFocusPathState,
    scan,
    session.events,
    setError,
    setFocusPathVisible,
    setSelectedFocusSelector,
    tabId,
  ]);

  const hideFocusPath = useCallback(async () => {
    if (tabId == null) return;
    setError(undefined);
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        func: clearFocusPathInPage,
      });
      resetFocusPathState();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [resetFocusPathState, setError, tabId]);

  const toggleFocusPath = useCallback(async () => {
    if (focusPathVisible) {
      await hideFocusPath();
      return;
    }
    await showFocusPath();
  }, [focusPathVisible, hideFocusPath, showFocusPath]);

  const selectFocusPoint = useCallback(async (selector: string) => {
    await showFocusPath(selector);
  }, [showFocusPath]);

  const clearFocusSelection = useCallback(async () => {
    if (!focusPathVisible) {
      setSelectedFocusSelector(undefined);
      return;
    }
    await showFocusPath();
  }, [focusPathVisible, setSelectedFocusSelector, showFocusPath]);

  return {
    breakpointSettings,
    interactions,
    focusGraph,
    focusJourney,
    focusPathSteps,
    toggleRecording,
    runFocusWalk,
    setBreakpoint,
    toggleFocusPath,
    selectFocusPoint,
    clearFocusSelection,
  };
}
