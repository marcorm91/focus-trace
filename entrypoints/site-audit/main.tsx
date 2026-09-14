import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { pageAccessPattern } from '../../lib/extension/page-access';
import { buildSiteAuditTemplates } from '../../lib/site-audit/aggregate';
import {
  appendSiteAuditBaseline,
  compareSiteAuditBaselines,
  latestSiteAuditBaseline,
  normalizeSiteAuditBaselineStore,
  siteAuditBaselineFromResult,
} from '../../lib/site-audit/baseline';
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
  normalizeSiteAuditExclusionPrefixes,
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

const SITE_AUDIT_BASELINES_STORAGE_KEY = 'focusTraceSiteAuditBaselinesV1';
const SITE_AUDIT_SCOPE_MODES: Array<{ id: SiteAuditInputMode }> = [
  { id: 'automatic' },
  { id: 'manual' },
  { id: 'session' },
];

function params() {
  const query = new URLSearchParams(location.search);
  const tabId = Number(query.get('tabId'));
  const sourceUrl = query.get('url') ?? '';
  const language: AppLanguage = query.get('language') === 'es' ? 'es' : 'en';
  return { tabId: Number.isInteger(tabId) && tabId >= 0 ? tabId : undefined, sourceUrl, language };
}

function boundedNumber(value: number, maximum: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(maximum, Math.floor(value)));
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
  const [exclusions, setExclusions] = useState('');
  const [maxDiscoveredUrls, setMaxDiscoveredUrls] = useState(SITE_AUDIT_MAX_DISCOVERED_URLS);
  const [maxScannedPages, setMaxScannedPages] = useState(SITE_AUDIT_MAX_SCANNED_PAGES);
  const [samplesPerFamily, setSamplesPerFamily] = useState(SITE_AUDIT_SAMPLES_PER_FAMILY);
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
  const scanLimit = boundedNumber(maxScannedPages, SITE_AUDIT_MAX_SCANNED_PAGES, SITE_AUDIT_MAX_SCANNED_PAGES);
  const discoveryLimit = boundedNumber(maxDiscoveredUrls, SITE_AUDIT_MAX_DISCOVERED_URLS, SITE_AUDIT_MAX_DISCOVERED_URLS);
  const sampleLimit = boundedNumber(samplesPerFamily, SITE_AUDIT_SAMPLES_PER_FAMILY, SITE_AUDIT_SAMPLES_PER_FAMILY);
  const exclusionPrefixes = useMemo(() => normalizeSiteAuditExclusionPrefixes(exclusions), [exclusions]);
  const manualSelection = useMemo(
    () => parseManualSiteAuditUrls(manualUrls, sourceMeta.origin, scanLimit),
    [manualUrls, scanLimit, sourceMeta.origin],
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

    const selectedUrlsMode = mode !== 'automatic';
    if (selectedUrlsMode && manualSelection.invalid.length > 0) {
      setError(tr(
        language,
        `There are ${manualSelection.invalid.length} invalid or out-of-site URLs. Remove them before starting the audit.`,
        `Hay ${manualSelection.invalid.length} URL no válidas o ajenas al sitio. Elimínalas antes de iniciar la auditoría.`,
      ));
      return;
    }

    if (selectedUrlsMode && manualSelection.urls.length === 0) {
      setError(tr(
        language,
        'Add at least one URL from this site before starting the selected-page audit.',
        'Añade al menos una URL de este sitio antes de iniciar el análisis de páginas seleccionadas.',
      ));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setResult(undefined);
    setError(undefined);

    const origin = new URL(normalizedRoot).origin;
    setStatus(selectedUrlsMode ? 'scanning' : 'discovering');
    setProgress({
      current: 0,
      total: selectedUrlsMode ? manualSelection.urls.length : 0,
      url: selectedUrlsMode ? manualSelection.urls[0] ?? normalizedRoot : normalizedRoot,
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
      if (selectedUrlsMode) {
        discovery = manualSiteAuditDiscovery(origin, manualSelection, mode);
      } else {
        setRootUrl(normalizedRoot);
        const currentTabMatchesOrigin = sourceMeta.origin === origin;
        const links = currentTabMatchesOrigin && source.tabId != null
          ? await sourcePageLinks(source.tabId, origin)
          : [];
        discovery = await discoverSiteUrls(normalizedRoot, links, {
          maxDiscoveredUrls: discoveryLimit,
          exclusionPrefixes,
        });
      }
      discovery.scope = {
        mode,
        maxDiscoveredUrls: discoveryLimit,
        maxScannedPages: scanLimit,
        samplesPerFamily: sampleLimit,
        exclusionPrefixes: mode === 'automatic' ? exclusionPrefixes : [],
      };

      if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');

      const families = buildRouteFamilies(discovery.urls, sampleLimit);
      const samples = selectedUrlsMode
        ? selectManualSiteAuditSamples(families, discovery.urls, mode, scanLimit)
        : selectSiteAuditSamples(families, scanLimit);
      setStatus('scanning');
      setProgress({ current: 0, total: samples.length, url: samples[0]?.url ?? '' });
      const pages = [];

      for (let index = 0; index < samples.length; index += 1) {
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        const sample = samples[index]!;
        setProgress({ current: index + 1, total: samples.length, url: sample.url });
        const page = await scanRepresentativePage(sample.routeFamilyId, sample.url, controller.signal);
        pages.push({ ...page, selectionReason: sample.selectionReason });
      }

      const templates = buildSiteAuditTemplates(families, pages);
      const nextBase: SiteAuditResult = {
        origin,
        generatedAt: Date.now(),
        discovery,
        routeFamilies: families,
        pages,
        templates,
        scannedPages: pages.filter((page) => page.scan).length,
        failedPages: pages.filter((page) => page.error).length,
      };
      const stored = await browser.storage.local.get(SITE_AUDIT_BASELINES_STORAGE_KEY);
      const baselineStore = normalizeSiteAuditBaselineStore(stored[SITE_AUDIT_BASELINES_STORAGE_KEY]);
      const currentBaseline = siteAuditBaselineFromResult(nextBase);
      const previousBaseline = latestSiteAuditBaseline(baselineStore, origin);
      const comparison = compareSiteAuditBaselines(currentBaseline, previousBaseline);
      const next: SiteAuditResult = comparison ? { ...nextBase, comparison } : nextBase;
      await browser.storage.local.set({
        [SITE_AUDIT_BASELINES_STORAGE_KEY]: appendSiteAuditBaseline(baselineStore, currentBaseline),
      });
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
          <h1>{tr(language, 'Audit the site, selected pages or private routes', 'Audita el sitio, páginas seleccionadas o rutas privadas')}</h1>
          <p>{tr(
            language,
            'Use explainable automatic discovery, provide exact same-site URLs, or scan private routes with the browser session you are already signed into.',
            'Usa descubrimiento automático explicable, indica URLs exactas del mismo sitio o analiza rutas privadas con la sesión del navegador en la que ya has iniciado sesión.',
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
            <button
              id="site-scope-tab-session"
              type="button"
              role="tab"
              aria-selected={mode === 'session'}
              aria-controls="site-scope-panel-session"
              {...scopeTabProps('session')}
              onClick={() => selectMode('session')}
            >
              {tr(language, 'Current session', 'Sesión actual')}
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
            <div className="site-limit-controls">
              <label>
                <span>{tr(language, 'Discovery limit', 'Límite de descubrimiento')}</span>
                <input type="number" min="1" max={SITE_AUDIT_MAX_DISCOVERED_URLS} value={maxDiscoveredUrls} onChange={(event) => setMaxDiscoveredUrls(Number(event.target.value))} />
              </label>
              <label>
                <span>{tr(language, 'Pages to scan', 'Páginas a analizar')}</span>
                <input type="number" min="1" max={SITE_AUDIT_MAX_SCANNED_PAGES} value={maxScannedPages} onChange={(event) => setMaxScannedPages(Number(event.target.value))} />
              </label>
              <label>
                <span>{tr(language, 'Samples / family', 'Muestras / familia')}</span>
                <input type="number" min="1" max={SITE_AUDIT_SAMPLES_PER_FAMILY} value={samplesPerFamily} onChange={(event) => setSamplesPerFamily(Number(event.target.value))} />
              </label>
            </div>
            <label className="site-manual-urls">
              <span>{tr(language, 'Exclude path prefixes, one per line', 'Excluir prefijos de ruta, uno por línea')}</span>
              <textarea value={exclusions} onChange={(event) => setExclusions(event.target.value)} rows={4} placeholder={'/logout\n/account/settings\n/internal'} />
              <small>{tr(
                language,
                'Exclusions are local to this audit. Matching paths are recorded as excluded evidence and are never scanned.',
                'Las exclusiones son locales a esta auditoría. Las rutas coincidentes se registran como excluidas y nunca se analizan.',
              )}</small>
            </label>
            <div className="site-limits">
              <span><strong>{discoveryLimit}</strong>{tr(language, 'URL discovery limit', 'límite de URLs')}</span>
              <span><strong>{scanLimit}</strong>{tr(language, 'page scan limit', 'límite de páginas')}</span>
              <span><strong>{sampleLimit}</strong>{tr(language, 'samples per route family', 'muestras por familia')}</span>
            </div>
            <p className="site-mode-description">{tr(
              language,
              'FocusTrace checks robots.txt and sitemaps, supplements discovery with internal links, canonicalizes common URL noise, groups repeated route families and spreads representative samples deterministically.',
              'FocusTrace revisa robots.txt y sitemaps, complementa el descubrimiento con enlaces internos, canonicaliza ruido habitual de URL, agrupa familias de rutas repetidas y distribuye muestras representativas de forma determinista.',
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
              {manualSelection.duplicateCount > 0 && <span><strong>{manualSelection.duplicateCount}</strong> {tr(language, 'duplicates ignored', 'duplicadas ignoradas')}</span>}
              {manualSelection.invalid.length > 0 && <span><strong>{manualSelection.invalid.length}</strong> {tr(language, 'invalid / out of site', 'no válidas / fuera del sitio')}</span>}
            </div>
            <label className="site-domain-field">
              <span>{tr(language, 'Maximum selected pages', 'Máximo de páginas seleccionadas')}</span>
              <input type="number" min="1" max={SITE_AUDIT_MAX_SCANNED_PAGES} value={maxScannedPages} onChange={(event) => setMaxScannedPages(Number(event.target.value))} />
            </label>
            {manualSelection.truncated && (
              <p className="site-manual-warning">{tr(
                language,
                `The configured safety limit is ${scanLimit} pages. FocusTrace will scan the first ${scanLimit} valid URLs in the list.`,
                `El límite de seguridad configurado es de ${scanLimit} páginas. FocusTrace analizará las primeras ${scanLimit} URLs válidas de la lista.`,
              )}</p>
            )}
            <p className="site-mode-description">{tr(
              language,
              'FocusTrace scans exactly the selected URLs and does not discover additional pages. Results are still grouped by route family for reporting.',
              'FocusTrace analiza exactamente las URLs seleccionadas y no descubre páginas adicionales. Los resultados siguen agrupándose por familia de ruta en el informe.',
            )}</p>
          </div>

          <div
            id="site-scope-panel-session"
            className="site-scope-panel"
            role="tabpanel"
            aria-labelledby="site-scope-tab-session"
            hidden={mode !== 'session'}
          >
            <label className="site-manual-urls">
              <span>{tr(language, 'Private routes to audit, one per line', 'Rutas privadas a analizar, una por línea')}</span>
              <textarea
                value={manualUrls}
                onChange={(event) => setManualUrls(event.target.value)}
                rows={7}
                placeholder={`${sourceMeta.origin}/cuenta\n${sourceMeta.origin}/panel`}
              />
              <small>{tr(
                language,
                'Sign in to the site normally first. FocusTrace opens these routes in temporary tabs that reuse the browser session; it never asks for or stores a password, cookie or session token.',
                'Inicia sesión en el sitio de forma normal primero. FocusTrace abre estas rutas en pestañas temporales que reutilizan la sesión del navegador; nunca solicita ni guarda contraseñas, cookies ni tokens de sesión.',
              )}</small>
            </label>
            <div className="site-manual-summary" aria-live="polite">
              <span><strong>{manualSelection.totalValid}</strong> {tr(language, 'valid private routes', 'rutas privadas válidas')}</span>
              {manualSelection.duplicateCount > 0 && <span><strong>{manualSelection.duplicateCount}</strong> {tr(language, 'duplicates ignored', 'duplicadas ignoradas')}</span>}
              {manualSelection.invalid.length > 0 && <span><strong>{manualSelection.invalid.length}</strong> {tr(language, 'invalid / out of site', 'no válidas / fuera del sitio')}</span>}
            </div>
            <label className="site-domain-field">
              <span>{tr(language, 'Maximum private routes', 'Máximo de rutas privadas')}</span>
              <input type="number" min="1" max={SITE_AUDIT_MAX_SCANNED_PAGES} value={maxScannedPages} onChange={(event) => setMaxScannedPages(Number(event.target.value))} />
            </label>
            <p className="site-mode-description">{tr(
              language,
              'No login is automated and no credentials are persisted. Baseline history stores only redacted aggregate finding identities, never the private page URLs or query values.',
              'No se automatiza ningún inicio de sesión ni se persisten credenciales. El historial de baseline guarda solo identidades agregadas y redactadas de los hallazgos, nunca las URLs privadas ni sus valores de query.',
            )}</p>
          </div>

          <p className="site-scope-note">{tr(
            language,
            'Runtime Trace is not automated across the site; Site Audit runs the page accessibility scanner on the chosen scope and compares compatible runs locally.',
            'Trace runtime no se automatiza por todo el sitio; Site Audit ejecuta el scanner de accesibilidad de página sobre el alcance elegido y compara localmente ejecuciones compatibles.',
          )}</p>
          {error && <p className="site-error-message" role="alert">{error}</p>}
          <button className="site-primary" type="button" onClick={() => void run()}>
            {mode === 'automatic'
              ? tr(language, 'Start automatic audit', 'Iniciar análisis automático')
              : mode === 'session'
                ? tr(language, 'Scan with current session', 'Analizar con la sesión actual')
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
              : mode === 'automatic'
                ? tr(language, 'Scanning representative pages…', 'Analizando páginas representativas…')
                : tr(language, 'Scanning selected pages…', 'Analizando páginas seleccionadas…')}</h2>
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
