import { useState } from 'react';
import { browser } from '#imports';
import { tr, type AppLanguage } from '../../../shared/i18n';

export function SiteAuditLauncher({ language }: { language: AppLanguage }) {
  const [opening, setOpening] = useState(false);

  const open = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id == null || !tab.url || !/^https?:/i.test(tab.url)) return;
      const query = new URLSearchParams({
        tabId: String(tab.id),
        url: tab.url,
        language,
      });
      await browser.tabs.create({ url: browser.runtime.getURL(`/site-audit.html?${query.toString()}`) });
    } finally {
      setOpening(false);
    }
  };

  return (
    <button
      className="site-audit-launch"
      type="button"
      disabled={opening}
      title={tr(language, 'Group similar routes and analyze representative site templates', 'Agrupar rutas similares y analizar plantillas representativas del sitio')}
      onClick={() => void open()}
    >
      <span aria-hidden="true">◎</span>
      {opening
        ? tr(language, 'Opening…', 'Abriendo…')
        : tr(language, 'Analyze site', 'Analizar sitio')}
    </button>
  );
}
