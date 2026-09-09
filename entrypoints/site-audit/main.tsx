import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { pageAccessPattern } from '../../lib/extension/page-access';
import { buildSiteAuditTemplates } from '../../lib/site-audit/aggregate';
import { discoverSiteUrls } from '../../lib/site-audit/discovery';
import {
  SITE_AUDIT_MAX_DISCOVERED_URLS,
  SITE_AUDIT_MAX_SCANNED_PAGES,
  SITE_AUDIT_SAMPLES_PER_FAMILY,
  type SiteAuditDiscovery,
  type SiteAuditResult,
  type SiteAuditStatus,
} from '../../lib/site-audit/model';
import { buildRouteFamilies, selectSiteAuditSamples } from '../../lib/site-audit/routes';
import {
  manualSiteAuditDiscovery,
  normalizeSiteAuditRoot,
  parseManualSiteAuditUrls,
  selectManualSiteAuditSamples,
  type SiteAuditInputMode,
} from '../../lib/site-audit/scope';
import { scanRepresentativePage, sourcePageLinks } from '../../lib/site-audit/runner';
import { useRovingTabs } from '../../lib/ui/roving-tabs';
import { tr, type AppLanguage } from '../../shared/i18n';
import { localizedUserError } from '../../shared/user-facing-errors';
import { SiteAuditReport } from './SiteAuditReport';
import './index.css';

const SITE_AUDIT_SCOPE_MODES: Array<{ id: SiteAuditInputMode }> = [
  { id: 'automatic' },
  { id: 'manual' },
];

function params() {
  const query = new URLSearchParams(location.search);
  const tabId = Number(query.get('tabId'));
  const sourceUrl = query.get('url') ?? '';
  const language: AppLanguage = query.get('language') === 'es' ? 'es' : 'en';
  return { tabId: Number.isInteger(tabId) && tabId >= 0 ? tabId : undefined, sourceUrl, language };
}

function App() {
  const source = useMemo(params, []);
  const { language } = source;
  const sourceMeta = useMemo(() => {
    try {
      const url = new URL(source.sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
      return {
        valid: true,
        origin: url.origin,
        protocol: url.protocol,
        root: `${url.origin}/`,
      };
    } catch {
      return { valid: false, origin: '', protocol: 'https:', root: '' };
    }
  }, [source.sourceUrl]);
  const [mode, setMode] = useState<SiteAuditInputMode>('automatic');
  const [rootUrl, setRootUrl] = useState(sourceMeta.root);
  const [manualUrls, setManualUrls] = useState('');
  const [status, setStatus] = useState<SiteAuditStatus>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, url: '' });
  const [result, setResult] = useState<SiteAuditResult>();
  const [error, setError] = useState<string>();
  const abortRef = useRef<AbortController | undefined>(undefined);
  document.documentElement.lang = language;

  const selectMode = (next: SiteAuditInputMode) => {
    setMode(next);
    setError(undefined);
  };
  const scopeTabProps = useRovingTabs({
    options: SITE_AUDIT_SCOPE_MODES,
    selected: mode,
    onSelect: selectMode,
  });

  const manualSelection = useMemo(
    () => parseManualSiteAuditUrls(manualUrls, sourceMeta.origin),
    [manualUrls, sourceMeta.origin],
  );

  const run = async () => {
    if (!sourceMeta.valid) return;

    const normalizedRoot = mode === 'automatic'
      ? normalizeSiteAuditRoot(rootUrl, sourceMeta.protocol)
      : sourceMeta.root;

    if (!normalizedRoot) {
      setError(tr(
        language,
        'Enter a valid http/https parent domain before starting the automatic audit.',
        'Introduce un dominio padre http/https válido antes de iniciar la auditoría automática.',
      ));
      return;
    }

    if (mode === 'manual' && manualSelection.invalid.length > 0) {
      setError(tr(
        language,
        `There are ${manualSelection.invalid.length} invalid or out-of-site URLs. Remove them before starting the audit.`,
        `Hay ${manualSelection.invalid.length} URL no válidas o ajenas al sitio. Elimínalas antes de iniciar la auditoría.`,
      ));
      return;
    }

    if (mode === 'manual' && manualSelection.urls.length === 0) {
      setError(tr(
        language,
        'Add at least one URL from this site before starting the manual selection audit.',
        'Añade al menos una URL de este sitio antes de iniciar el análisis por selección manual.',
      ));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setResult(undefined);
    setError(undefined);

    const origin = new URL(normalizedRoot).origin;
    const isManual = mode === 'manual';
    setStatus(isManual ? 'scanning' : 'discovering');
    setProgress({
      current: 0,
      total: isManual ? manualSelection.urls.length : 0,
      url: isManual ? manualSelection.urls[0] ?? normalizedRoot : normalizedRoot,
    });

    try {
      const permission = pageAccessPattern(normalizedRoot);
      const granted = permission
        ? await browser.permissions.request({ origins: [permission] })
        : false;
      if (!granted) throw new Error(tr(
        language,
        'Site Audit needs access to this site so its pages can be discovered or scanned.',
        'Site Audit necesita acceso a este sitio para poder descubrir o analizar sus páginas.',
      ));

      let discovery: SiteAuditDiscovery;
      if (isManual) {
        discovery = manualSiteAuditDiscovery(origin, manualSelection);
      } else {
        setRootUrl(normalizedRoot);
        const currentTabMatchesOrigin = sourceMeta.origin === origin;
        const links = currentTabMatchesOrigin && source.tabId != null
          ? await sourcePageLinks(source.tabId, origin)
          : [];
        discovery = await discoverSiteUrls(normalizedRoot, links);
      }

      if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');

      const families = buildRouteFamilies(discovery.urls);
      const samples = isManual
        ? selectManualSiteAuditSamples(families, discovery.urls)
        : selectSiteAuditSamples(families);
      setStatus('scanning');
      setProgress({ current: 0, total: samples.length, url: samples[0]?.url ?? '' });
      const pages = [];

      for (let index = 0; index < samples.length; index += 1) {
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        const sample = samples[index]!;
        setProgress({ current: index + 1, total: samples.length, url: sample.url });
        pages.push(await scanRepresentativePage(sample.routeFamilyId, sample.url, controller.signal));
      }

      const templates = buildSiteAuditTemplates(families, pages);
      const next: SiteAuditResult = {
        origin,
        generatedAt: Date.now(),
        discovery,
        routeFamilies: families,
        pages,
        templates,
        scannedPages: pages.filter((page) => page.scan).length,
        failedPages: pages.filter((page) => page.error).length,
      };
      setResult(next);
      setStatus('complete');
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') {
        setStatus('cancelled');
      } else {
        setError(localizedUserError(reason, language, 'site-audit'));
        setStatus('error');
      }
    } finally {
      abortRef.current = undefined;
    }
  };

  const cancel = () => abortRef.current?.abort();

  if (!sourceMeta.valid) {
    return (
      <main className="site-audit-shell">
        <header className="site-brand"><img src="/icon/48.png" alt="" /><strong>FocusTrace</strong></header>
        <section className="site-card site-error">
          <h1>Site Audit</h1>
          <p>{tr(language, 'Open Site Audit from a normal http/https page.', 'Abre Site Audit desde una página http/https normal.')}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="site-audit-shell">
      <header className="site-brand">
        <img src="/icon/48.png" alt="" />
        <div><strong>FocusTrace</strong><span>Site Audit</span></div>
        <small>v{browser.runtime.getManifest().version}</small>
      </header>

      <section className="site-hero site-card">
        <div>
          <span className="site-kicker">{tr(language, 'Site-level accessibility coverage', 'Cobertura de accesibilidad del sitio')}</span>
          <h1>{tr(language, 'Audit the whole site or only the pages you choose', 'Audita todo el sitio o solo las páginas que elijas')}</h1>
          <p>{tr(
            language,
            'Use automatic discovery from the parent domain, or provide an exact list of same-site URLs and let FocusTrace scan only those pages.',
            'Usa el descubrimiento automático desde el dominio padre o indica una lista exacta de URLs del mismo sitio para que FocusTrace analice solo esas páginas.',
          )}</p>
        </div>
        <code>{sourceMeta.origin}</code>
      </section>

      {(status === 'idle' || status === 'cancelled' || status === 'error') && (
        <section className="site-card site-start">
          <h2>{tr(language, 'Audit scope', 'Alcance de la auditoría')}</h2>

          <div className="site-scope-tabs" role="tablist" aria-label={tr(language, 'Site Audit mode', 'Modo de Site Audit')}>
            <button
              id="site-scope-tab-automatic"
              type="button"
              role="tab"
              aria-selected={mode === 'automatic'}
              aria-controls="site-scope-panel-automatic"
              {...scopeTabProps('automatic')}
              onClick={() => selectMode('automatic')}
            >
              {tr(language, 'Automatic', 'Automático')}
            </button>
            <button
              id="site-scope-tab-manual"
              type="button"
              role="tab"
              aria-selected={mode === 'manual'}
              aria-controls="site-scope-panel-manual"
              {...scopeTabProps('manual')}
              onClick={() => selectMode('manual')}
            >
              {tr(language, 'Manual URLs', 'URLs manuales')}
            </button>
          </div>

          <div
            id="site-scope-panel-automatic"
            className="site-scope-panel"
            role="tabpanel"
            aria-labelledby="site-scope-tab-automatic"
            hidden={mode !== 'automatic'}
          >
            <label className="site-domain-field">
              <span>{tr(language, 'Parent domain to audit', 'Dominio padre a analizar')}</span>
              <input
                type="text"
                inputMode="url"
                value={rootUrl}
                onChange={(event) => setRootUrl(event.target.value)}
                placeholder="https://www.example.com/"
              />
              <small>{tr(
                language,
                'You can enter a domain with or without https://. FocusTrace always starts discovery from its root.',
                'Puedes indicar el dominio con o sin https://. FocusTrace siempre inicia el descubrimiento desde su raíz.',
              )}</small>
            </label>
            <div className="site-limits">
              <span><strong>{SITE_AUDIT_MAX_DISCOVERED_URLS}</strong>{tr(language, 'max discovered URLs', 'URLs descubiertas máx.')}</span>
              <span><strong>{SITE_AUDIT_MAX_SCANNED_PAGES}</strong>{tr(language, 'max pages scanned', 'páginas analizadas máx.')}</span>
              <span><strong>{SITE_AUDIT_SAMPLES_PER_FAMILY}</strong>{tr(language, 'samples per route family', 'muestras por familia')}</span>
            </div>
            <p className="site-mode-description">{tr(
              language,
              'FocusTrace checks robots.txt and sitemaps, supplements discovery with internal links when available, groups repeated route families and automatically scans representative pages.',
              'FocusTrace revisa robots.txt y sitemaps, complementa el descubrimiento con enlaces internos cuando están disponibles, agrupa familias de rutas repetidas y analiza automáticamente páginas representativas.',
            )}</p>
          </div>

          <div
            id="site-scope-panel-manual"
            className="site-scope-panel"
            role="tabpanel"
            aria-labelledby="site-scope-tab-manual"
            hidden={mode !== 'manual'}
          >
            <label className="site-manual-urls">
              <span>{tr(language, 'URLs to audit, one per line', 'URLs a analizar, una por línea')}</span>
              <textarea
                value={manualUrls}
                onChange={(event) => setManualUrls(event.target.value)}
                rows={7}
                placeholder={`${sourceMeta.origin}/\n${sourceMeta.origin}/productos\n${sourceMeta.origin}/contacto`}
              />
              <small>{tr(
                language,
                `Only URLs from ${sourceMeta.origin} are accepted. Relative paths such as /contact are also valid.`,
                `Solo se aceptan URLs de ${sourceMeta.origin}. También puedes usar rutas relativas como /contacto.`,
              )}</small>
            </label>
            <div className="site-manual-summary" aria-live="polite">
              <span><strong>{manualSelection.totalValid}</strong> {tr(language, 'valid URLs', 'URLs válidas')}</span>
              {manualSelection.duplicateCount > 0 && (
                <span><strong>{manualSelection.duplicateCount}</strong> {tr(language, 'duplicates ignored', 'duplicadas ignoradas')}</span>
              )}
              {manualSelection.invalid.length > 0 && (
                <span><strong>{manualSelection.invalid.length}</strong> {tr(language, 'invalid / out of site', 'no válidas / fuera del sitio')}</span>
              )}
            </div>
            {manualSelection.truncated && (
              <p className="site-manual-warning">{tr(
                language,
                `The safety limit is ${SITE_AUDIT_MAX_SCANNED_PAGES} pages. FocusTrace will scan the first ${SITE_AUDIT_MAX_SCANNED_PAGES} valid URLs in the list.`,
                `El límite de seguridad es de ${SITE_AUDIT_MAX_SCANNED_PAGES} páginas. FocusTrace analizará las primeras ${SITE_AUDIT_MAX_SCANNED_PAGES} URLs válidas de la lista.`,
              )}</p>
            )}
            <p className="site-mode-description">{tr(
              language,
              'FocusTrace will automatically scan exactly the selected URLs. It will not discover or add other pages from the site.',
              'FocusTrace analizará automáticamente exactamente las URLs seleccionadas. No descubrirá ni añadirá otras páginas del sitio.',
            )}</p>
          </div>

          <p className="site-scope-note">{tr(
            language,
            'Runtime Trace is not automated across the site in this version; Site Audit runs the page accessibility scanner on the chosen scope.',
            'En esta versión Trace runtime no se automatiza por todo el sitio; Site Audit ejecuta el scanner de accesibilidad de página sobre el alcance elegido.',
          )}</p>
          {error && <p className="site-error-message" role="alert">{error}</p>}
          <button className="site-primary" type="button" onClick={() => void run()}>
            {mode === 'automatic'
              ? tr(language, 'Start automatic audit', 'Iniciar análisis automático')
              : tr(language, 'Scan selected URLs', 'Analizar URLs seleccionadas')}
          </button>
        </section>
      )}

      {(status === 'discovering' || status === 'scanning') && (
        <section className="site-card site-progress" aria-live="polite">
          <span className="site-spinner" aria-hidden="true" />
          <div>
            <h2>{status === 'discovering'
              ? tr(language, 'Discovering the site…', 'Descubriendo el sitio…')
              : mode === 'manual'
                ? tr(language, 'Scanning selected pages…', 'Analizando páginas seleccionadas…')
                : tr(language, 'Scanning representative pages…', 'Analizando páginas representativas…')}</h2>
            {status === 'scanning' && <strong>{progress.current}/{progress.total}</strong>}
            <p title={progress.url}>{progress.url}</p>
          </div>
          <button type="button" onClick={cancel}>{tr(language, 'Cancel', 'Cancelar')}</button>
        </section>
      )}

      {result && status === 'complete' && <SiteAuditReport result={result} language={language} onRunAgain={() => setStatus('idle')} />}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
