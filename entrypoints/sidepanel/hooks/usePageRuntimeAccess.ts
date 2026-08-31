import { useCallback } from 'react';
import { browser } from '#imports';
import { requestTabPageAccess } from '../../../lib/extension/page-access';
import type { ExtensionMessage } from '../../../shared/types';

export function usePageRuntimeAccess(tabId: number | undefined) {
  const requestPageAccess = useCallback(async () => {
    if (tabId != null && await requestTabPageAccess(tabId)) return;
    // Keep the internal error language-neutral so localizedUserError can map it
    // consistently instead of treating an already-localized message as an
    // unknown analysis failure.
    throw new Error('FocusTrace page access permission was not granted.');
  }, [tabId]);

  const ensureInjected = useCallback(async () => {
    if (tabId == null) throw new Error('No active tab selected.');
    await requestPageAccess();
    await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_ENSURE_INJECTED',
      tabId,
    } satisfies ExtensionMessage);
  }, [requestPageAccess, tabId]);

  return { requestPageAccess, ensureInjected };
}
