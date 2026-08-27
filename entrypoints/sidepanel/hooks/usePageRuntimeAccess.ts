import { useCallback } from 'react';
import { browser } from '#imports';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { ExtensionMessage } from '../../../shared/types';

const PAGE_ACCESS_ORIGINS = ['http://*/*', 'https://*/*'];

export function usePageRuntimeAccess(tabId: number | undefined, language: AppLanguage) {
  const requestPageAccess = useCallback(async () => {
    const granted = await browser.permissions.request({ origins: PAGE_ACCESS_ORIGINS });
    if (granted) return;
    throw new Error(tr(
      language,
      'FocusTrace needs access to web pages to analyze the DOM, trace focus and highlight elements. Grant page access and try again.',
      'FocusTrace necesita acceso a las páginas web para analizar el DOM, trazar el foco y resaltar elementos. Concede el acceso y vuelve a intentarlo.',
    ));
  }, [language]);

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
