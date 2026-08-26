import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { browser } from '#imports';
import { tr, type AppLanguage } from '../../../shared/i18n';
import './site-audit-launcher.css';

const PAGE_ACCESS_ORIGINS = ['http://*/*', 'https://*/*'];

export function SiteAuditLauncher({ language }: { language: AppLanguage }) {
  const [opening, setOpening] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  useEffect(() => {
    setPortalTarget(document.querySelector('.quick-actions'));
  }, []);

  const open = async () => {
    if (opening) return;
    setOpening(true);
    try {
      // Reuse an existing grant. Requesting optional permissions again after an
      // awaited call can lose the browser's user-gesture eligibility.
      const alreadyGranted = await browser.permissions.contains({ origins: PAGE_ACCESS_ORIGINS });
      if (!alreadyGranted) {
        const granted = await browser.permissions.request({ origins: PAGE_ACCESS_ORIGINS });
        if (!granted) return;
      }

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

  const button = (
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

  return portalTarget ? createPortal(button, portalTarget) : null;
}
