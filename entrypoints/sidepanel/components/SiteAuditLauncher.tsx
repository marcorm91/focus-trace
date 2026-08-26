import { browser } from '#imports';
import { tr, type AppLanguage } from '../../../shared/i18n';

export function SiteAuditLauncher({ language }: { language: AppLanguage }) {
  const open = async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null || !tab.url || !/^https?:/i.test(tab.url)) return;
    const query = new URLSearchParams({
      tabId: String(tab.id),
      url: tab.url,
      language,
    });
    await browser.tabs.create({ url: browser.runtime.getURL(`/site-audit.html?${query.toString()}`) });
  };

  return (
    <button
      className="site-audit-launch"
      type="button"
      title={tr(language, 'Discover site pages and scan representative templates', 'Descubrir páginas del sitio y analizar plantillas representativas')}
      onClick={() => void open()}
    >
      <span aria-hidden="true">◎</span>
      {tr(language, 'Scan site', 'Escanear sitio')}
    </button>
  );
}
