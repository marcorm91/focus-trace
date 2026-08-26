const language = new URLSearchParams(window.location.search).get('language') === 'es' ? 'es' : 'en';

function applySiteAuditHeroCopy(): boolean {
  const hero = document.querySelector('.site-hero');
  const title = hero?.querySelector('h1');
  const description = hero?.querySelector('p');
  if (!hero || !title || !description) return false;

  title.textContent = language === 'es'
    ? 'Analiza plantillas representativas del sitio'
    : 'Analyze representative site templates';
  description.textContent = language === 'es'
    ? 'Agrupa rutas similares y analiza muestras representativas del mismo origen.'
    : 'Group similar routes and analyze representative samples from the same origin.';
  return true;
}

if (!applySiteAuditHeroCopy()) {
  const observer = new MutationObserver(() => {
    if (!applySiteAuditHeroCopy()) return;
    observer.disconnect();
  });
  observer.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
}
