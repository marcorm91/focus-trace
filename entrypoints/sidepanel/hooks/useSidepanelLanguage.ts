import { useCallback, useEffect, useState } from 'react';
import { browser } from '#imports';
import { SETTINGS_STORAGE_KEY, type AppLanguage } from '../../../shared/i18n';

function defaultLanguage(): AppLanguage {
  try {
    return browser.i18n.getUILanguage().toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export function useSidepanelLanguage() {
  const [language, setLanguage] = useState<AppLanguage>(defaultLanguage);

  useEffect(() => {
    void browser.storage.local.get(SETTINGS_STORAGE_KEY).then((stored) => {
      const settings = stored[SETTINGS_STORAGE_KEY] as { language?: AppLanguage } | undefined;
      if (settings?.language === 'en' || settings?.language === 'es') setLanguage(settings.language);
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const updateLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: { language: nextLanguage } });
  }, []);

  return { language, updateLanguage };
}
