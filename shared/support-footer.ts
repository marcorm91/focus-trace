import { tr, type AppLanguage } from './i18n';
import { SUPPORT_URL } from './project-links';
import './support-footer.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

function currentLanguage(): AppLanguage {
  return document.documentElement.lang === 'es' ? 'es' : 'en';
}

function createHeartIcon(): SVGSVGElement {
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.classList.add('ft-support-footer-icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('width', '16');
  icon.setAttribute('height', '16');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    'M12 20.4 4.3 13A5.1 5.1 0 0 1 11.5 5.8l.5.5.5-.5A5.1 5.1 0 0 1 19.7 13L12 20.4Z',
  );
  icon.append(path);

  return icon;
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

  const icon = createHeartIcon();
  const label = document.createElement('span');
  const externalMark = document.createElement('span');
  externalMark.setAttribute('aria-hidden', 'true');
  externalMark.textContent = '↗';

  link.append(icon, label, externalMark);

  const updateCopy = () => {
    const language = currentLanguage();
    label.textContent = tr(language, 'Support FocusTrace', 'Apoyar FocusTrace');
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
