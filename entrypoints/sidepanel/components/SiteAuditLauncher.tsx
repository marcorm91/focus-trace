import { useState } from 'react';
import { browser } from '#imports';
import { tr, type AppLanguage } from '../../../shared/i18n';
import './site-audit-launcher.css';

const PAGE_ACCESS_ORIGINS = ['http://*/*', 'https://*/*'];

export function SiteAuditLauncher({ language }: { language: AppLanguage }) {
  const [opening, setOpening] = useState(false);

  const open = async () => {
    if (opening) return;
    setOpening(true);
    try {
      // Keep the optional host-permission request attached to the explicit
      // Scan site click, just like Analyze page. Without this, Site Audit can
      // appear to work only after another feature has already granted access.
      const granted = await browser.permissions.request({ origins: PAGE_ACCESS_ORIGINS });
      if (!granted) return;

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
      title={tr(language, 'Discover site pages and scan representative templates', 'Descubrir páginas del sitio y analizar plantillas representativas')}
      onClick={() => void open()}
    >
      <span aria-hidden="true">◎</span>
      {opening
        ? tr(language, 'Opening…', 'Abriendo…')
        : tr(language, 'Scan site', 'Escanear sitio')}
    </button>
  );
}
