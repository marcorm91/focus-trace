import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { browser } from '#imports';
import { defaultRuntimeBreakpointSettings } from '../../../lib/runtime/breakpoints';
import type { ExtensionMessage, SessionState } from '../../../shared/types';
import { activationBelongsToPanelWindow } from './window-session';

const EMPTY_SESSION: SessionState = {
  tabId: -1,
  recording: false,
  events: [],
  breakpoints: defaultRuntimeBreakpointSettings(),
};

function fixedDevtoolsTabId(): number | undefined {
  try {
    const value = new URLSearchParams(window.location.search).get('focustraceTabId');
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function activeTabForCurrentWindow() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null || tab.windowId == null) throw new Error('No active browser tab is available.');
  return { tabId: tab.id, windowId: tab.windowId };
}

export function useSidepanelSession({
  onError,
  onTabSelected,
}: {
  onError: (reason: unknown) => void;
  onTabSelected: () => void;
}): {
  tabId: number | undefined;
  session: SessionState;
  setSession: Dispatch<SetStateAction<SessionState>>;
  refresh: (tabId: number) => Promise<void>;
} {
  const [tabId, setTabId] = useState<number>();
  const [session, setSessionState] = useState<SessionState>(EMPTY_SESSION);
  const [inspectedTabId] = useState(fixedDevtoolsTabId);
  const selectedTabRef = useRef<number | undefined>(undefined);
  const panelWindowRef = useRef<number | undefined>(undefined);

  const revisionRef = useRef(0);
  const selectionRef = useRef(0);
  const mountedRef = useRef(true);
  const callbacksRef = useRef({ onError, onTabSelected });
  callbacksRef.current = { onError, onTabSelected };
  const pendingActivationsRef = useRef(new Map<number, number>());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      revisionRef.current += 1;
    };
  }, []);

  const selection = selectionRef.current;
  const setSession: Dispatch<SetStateAction<SessionState>> = useCallback((update) => {
    if (!mountedRef.current || selectedTabRef.current !== tabId || selectionRef.current !== selection) return;
    // Action callbacks can finish after the user has selected another tab.
    if (typeof update !== 'function' && update.tabId !== tabId) return;
    revisionRef.current += 1;
    setSessionState((current) => {
      if (selectedTabRef.current !== tabId || selectionRef.current !== selection) return current;
      const next = typeof update === 'function' ? update(current) : update;
      return next.tabId === tabId ? next : current;
    });
  }, [selection, tabId]);

  const refresh = useCallback(async (id: number) => {
    if (!mountedRef.current || selectedTabRef.current !== id) return;
    const revision = ++revisionRef.current;
    try {
      const state = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_GET_SESSION',
        tabId: id,
      } satisfies ExtensionMessage)) as SessionState;
      if (!mountedRef.current || selectedTabRef.current !== id || revisionRef.current !== revision) return;
      if (state.tabId === id) setSessionState(state);
    } catch (reason) {
      if (mountedRef.current && selectedTabRef.current === id && revisionRef.current === revision) throw reason;
    }
  }, []);

  const selectTab = useCallback(async (id: number) => {
    selectionRef.current += 1;
    revisionRef.current += 1;
    selectedTabRef.current = id;
    setTabId(id);
    setSessionState({ ...EMPTY_SESSION, tabId: id });
    callbacksRef.current.onTabSelected();
    await refresh(id);
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const reportError = (reason: unknown) => {
      if (!cancelled) callbacksRef.current.onError(reason);
    };
    if (inspectedTabId != null) {
      void selectTab(inspectedTabId).catch(reportError);
    } else {
      void activeTabForCurrentWindow()
        .then(({ tabId: activeTabId, windowId }) => {
          if (cancelled) return;
          panelWindowRef.current = windowId;
          const latestTabId = pendingActivationsRef.current.get(windowId) ?? activeTabId;
          pendingActivationsRef.current.clear();
          return selectTab(latestTabId);
        })
        .catch(reportError);
    }
    return () => { cancelled = true; };
  }, [inspectedTabId, selectTab]);

  useEffect(() => {
    if (inspectedTabId != null) return;

    const listener = ({ tabId: nextTabId, windowId }: { tabId: number; windowId: number }) => {
      if (panelWindowRef.current == null) {
        pendingActivationsRef.current.set(windowId, nextTabId);
        return;
      }
      if (!activationBelongsToPanelWindow(panelWindowRef.current, windowId)) return;
      void selectTab(nextTabId).catch((reason) => {
        if (mountedRef.current) callbacksRef.current.onError(reason);
      });
    };
    browser.tabs.onActivated.addListener(listener);
    return () => browser.tabs.onActivated.removeListener(listener);
  }, [inspectedTabId, selectTab]);

  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      if (message.type !== 'FOCUSTRACE_SESSION_UPDATED' || message.state.tabId !== selectedTabRef.current) return;
      revisionRef.current += 1;
      setSessionState(message.state);
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  return { tabId, session, setSession, refresh };
}
