import { tr, type AppLanguage } from './i18n';
import { SUPPORT_URL } from './project-links';
import './support-footer.css';

function currentLanguage(): AppLanguage {
  return document.documentElement.lang === 'es' ? 'es' : 'en';
}

export function mountSupportFooter(supportUrl: string | null = SUPPORT_URL): () => void {
  if (!supportUrl || !document.body) return () => undefined;
  if (document.querySelector('[data-focustrace-support-footer]')) return () => undefined;

  const footer = document.createElement('footer');
  footer.className = 'ft-support-footer';
  footer.dataset.focustraceSupportFooter = '';

  const link = document.createElement('a');
  link.href = supportUrl;
  link.target = '_blank';
  link.rel = 'noreferrer noopener';

  const updateCopy = () => {
    const language = currentLanguage();
    link.textContent = tr(language, '♡ Support FocusTrace ↗', '♡ Apoyar FocusTrace ↗');
    link.setAttribute('aria-label', tr(
      language,
      'Support FocusTrace (opens in a new tab)',
      'Apoyar FocusTrace (se abre en una pestaña nueva)',
    ));
  };

  updateCopy();
  footer.append(link);
  document.body.append(footer);

  const languageObserver = new MutationObserver(updateCopy);
  languageObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });

  return () => {
    languageObserver.disconnect();
    footer.remove();
  };
}
