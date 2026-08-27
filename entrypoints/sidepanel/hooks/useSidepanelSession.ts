import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { browser } from '#imports';
import { defaultRuntimeBreakpointSettings } from '../../../lib/runtime/breakpoints';
import type { ExtensionMessage, SessionState } from '../../../shared/types';

const EMPTY_SESSION: SessionState = {
  tabId: -1,
  recording: false,
  events: [],
  breakpoints: defaultRuntimeBreakpointSettings(),
};

async function activeTabId() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) throw new Error('No active browser tab is available.');
  return tab.id;
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

  const refresh = useCallback(async (id: number) => {
    const state = (await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_SESSION',
      tabId: id,
    } satisfies ExtensionMessage)) as SessionState;
    setSession(state);
  }, []);

  const selectTab = useCallback(async (id: number) => {
    setTabId(id);
    setSession({ ...EMPTY_SESSION, tabId: id });
    onTabSelected();
    await refresh(id);
  }, [onTabSelected, refresh]);

  useEffect(() => {
    void activeTabId()
      .then(selectTab)
      .catch(onError);
  }, [onError, selectTab]);

  useEffect(() => {
    const listener = ({ tabId: nextTabId }: { tabId: number }) => {
      void selectTab(nextTabId).catch(onError);
    };
    browser.tabs.onActivated.addListener(listener);
    return () => browser.tabs.onActivated.removeListener(listener);
  }, [onError, selectTab]);

  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      if (message.type !== 'FOCUSTRACE_SESSION_UPDATED' || message.state.tabId !== tabId) return;
      setSession(message.state);
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [tabId]);

  return { tabId, session, setSession, refresh };
}
