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
  const [session, setSession] = useState<SessionState>(EMPTY_SESSION);
  const selectedTabRef = useRef<number | undefined>(undefined);
  const panelWindowRef = useRef<number | undefined>(undefined);

  const refresh = useCallback(async (id: number) => {
    const state = (await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_SESSION',
      tabId: id,
    } satisfies ExtensionMessage)) as SessionState;
    if (selectedTabRef.current !== id) return;
    setSession(state);
  }, []);

  const selectTab = useCallback(async (id: number) => {
    selectedTabRef.current = id;
    setTabId(id);
    setSession({ ...EMPTY_SESSION, tabId: id });
    onTabSelected();
    await refresh(id);
  }, [onTabSelected, refresh]);

  useEffect(() => {
    void activeTabForCurrentWindow()
      .then(({ tabId: activeTabId, windowId }) => {
        panelWindowRef.current = windowId;
        return selectTab(activeTabId);
      })
      .catch(onError);
  }, [onError, selectTab]);

  useEffect(() => {
    const listener = ({ tabId: nextTabId, windowId }: { tabId: number; windowId: number }) => {
      if (!activationBelongsToPanelWindow(panelWindowRef.current, windowId)) return;
      void selectTab(nextTabId).catch(onError);
    };
    browser.tabs.onActivated.addListener(listener);
    return () => browser.tabs.onActivated.removeListener(listener);
  }, [onError, selectTab]);

  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      if (message.type !== 'FOCUSTRACE_SESSION_UPDATED' || message.state.tabId !== selectedTabRef.current) return;
      setSession(message.state);
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  return { tabId, session, setSession, refresh };
}
