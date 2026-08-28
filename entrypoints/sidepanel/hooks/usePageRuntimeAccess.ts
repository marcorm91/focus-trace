import { useCallback } from 'react';
import { browser } from '#imports';
import { requestTabPageAccess } from '../../../lib/extension/page-access';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { ExtensionMessage } from '../../../shared/types';

export function usePageRuntimeAccess(tabId: number | undefined, language: AppLanguage) {
  const requestPageAccess = useCallback(async () => {
    if (tabId != null && await requestTabPageAccess(tabId)) return;
    throw new Error(tr(
      language,
      'FocusTrace needs access to web pages to analyze the DOM, trace focus and highlight elements. Grant page access and try again.',
      'FocusTrace necesita acceso a las páginas web para analizar el DOM, trazar el foco y resaltar elementos. Concede el acceso y vuelve a intentarlo.',
    ));
  }, [language, tabId]);

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
