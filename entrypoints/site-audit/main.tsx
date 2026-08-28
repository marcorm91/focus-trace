import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { pageAccessPattern } from '../../lib/extension/page-access';
import { buildSiteAuditTemplates } from '../../lib/site-audit/aggregate';
import { discoverSiteUrls } from '../../lib/site-audit/discovery';
import {
  componentContextLabel,
  componentPrimaryLabel,
  componentTypeLabel,
} from '../../lib/report/component-identity';
import {
  SITE_AUDIT_MAX_DISCOVERED_URLS,
  SITE_AUDIT_MAX_SCANNED_PAGES,
  SITE_AUDIT_SAMPLES_PER_FAMILY,
  type SiteAuditDiscovery,
  type SiteAuditFindingAggregate,
  type SiteAuditResult,
  type SiteAuditStatus,
} from '../../lib/site-audit/model';
import { remediationForIssue } from '../../lib/site-audit/remediation';
import { buildRouteFamilies, selectSiteAuditSamples } from '../../lib/site-audit/routes';
import {
  manualSiteAuditDiscovery,
  normalizeSiteAuditRoot,
  parseManualSiteAuditUrls,
  selectManualSiteAuditSamples,
  type SiteAuditInputMode,
} from '../../lib/site-audit/scope';
import { scanRepresentativePage, sourcePageLinks } from '../../lib/site-audit/runner';
import { buildSiteAuditTextReport, siteAuditFilename } from '../../lib/site-audit/text-report';
import { captureSiteAuditFindingVisual } from '../../lib/site-audit/visual-evidence';
import { localizedScanIssue, localizedSeverity, tr, type AppLanguage } from '../../shared/i18n';
import { countBySeverity, severityRank } from '../../shared/severity';
import type { FindingOutcome, Severity } from '../../shared/types';
import { localizedUserError } from '../../shared/user-facing-errors';
import './index.css';

const DISPLAY_SEVERITIES: Severity[] = ['critical', 'serious', 'moderate', 'minor'];

function outcomeText(outcome: FindingOutcome, language: AppLanguage): string {
  if (outcome === 'fail') return tr(language, 'FAILURE', 'FALLO');
  if (outcome === 'review') return tr(language, 'REVIEW', 'REVISIÓN');
  return tr(language, 'WARNING', 'AVISO');
}

function sortFindingAggregates(findings: SiteAuditFindingAggregate[]): SiteAuditFindingAggregate[] {
  return [...findings].sort(
    (left, right) => severityRank(right.exampleIssue.severity) - severityRank(left.exampleIssue.severity),
  );
}

function params() {
  const query = new URLSearchParams(location.search);
  const tabId = Number(query.get('tabId'));
  const sourceUrl = query.get('url') ?? '';
  const language: AppLanguage = query.get('language') === 'es' ? 'es' : 'en';
  return { tabId: Number.isInteger(tabId) && tabId >= 0 ? tabId : undefined, sourceUrl, language };
}

function downloadText(result: SiteAuditResult, language: AppLanguage) {
  const blob = new Blob(['\uFEFF', buildSiteAuditTextReport(result, language)], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = siteAuditFilename(result);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
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
              onClick={() => {
                setMode('automatic');
                setError(undefined);
              }}
            >
              {tr(language, 'Automatic', 'Automático')}
            </button>
            <button
              id="site-scope-tab-manual"
              type="button"
              role="tab"
              aria-selected={mode === 'manual'}
              aria-controls="site-scope-panel-manual"
              onClick={() => {
                setMode('manual');
                setError(undefined);
              }}
            >
              {tr(language, 'Manual URLs', 'URLs manuales')}
            </button>
          </div>

          {mode === 'automatic' ? (
            <div
              id="site-scope-panel-automatic"
              className="site-scope-panel"
              role="tabpanel"
              aria-labelledby="site-scope-tab-automatic"
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
          ) : (
            <div
              id="site-scope-panel-manual"
              className="site-scope-panel"
              role="tabpanel"
              aria-labelledby="site-scope-tab-manual"
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
          )}

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

function SiteAuditReport({ result, language, onRunAgain }: { result: SiteAuditResult; language: AppLanguage; onRunAgain: () => void }) {
  const commonFindings = result.templates.reduce((total, template) => total + template.findings.filter((finding) => finding.commonToTemplate).length, 0);
  const failureSignals = result.templates.flatMap((template) =>
    template.findings
      .filter((finding) => finding.outcome === 'fail')
      .map((finding) => finding.exampleIssue),
  );
  const failureSeverityCounts = countBySeverity(failureSignals);
  const manualScope = result.discovery.source === 'manual';

  return (
    <>
      <section className="site-card site-summary">
        <div className="site-report-actions">
          <div><span className="site-kicker">{tr(language, 'Site Audit complete', 'Site Audit completado')}</span><h2>{result.origin}</h2></div>
          <div>
            <button type="button" onClick={() => downloadText(result, language)}>↓ {tr(language, 'Download .txt', 'Descargar .txt')}</button>
            <button type="button" onClick={() => window.print()}>▤ {tr(language, 'Print / PDF', 'Imprimir / PDF')}</button>
            <button type="button" onClick={onRunAgain}>↻ {tr(language, 'Run again', 'Repetir')}</button>
          </div>
        </div>
        <div className="site-score-grid">
          <span><strong>{result.discovery.urls.length}</strong>{manualScope ? tr(language, 'URLs selected', 'URLs seleccionadas') : tr(language, 'URLs discovered', 'URLs descubiertas')}</span>
          <span><strong>{result.templates.length}</strong>{tr(language, 'route families', 'familias de ruta')}</span>
          <span><strong>{result.scannedPages}</strong>{tr(language, 'pages scanned', 'páginas analizadas')}</span>
          <span><strong>{commonFindings}</strong>{tr(language, 'template-wide signals', 'señales de plantilla')}</span>
          <span><strong>{result.failedPages}</strong>{tr(language, 'scan errors', 'errores de escaneo')}</span>
        </div>

        {failureSignals.length > 0 && (
          <div className="site-impact-summary">
            <div>
              <strong>{tr(language, 'Failure impact', 'Impacto de los fallos')}</strong>
              <small>{tr(
                language,
                'FocusTrace impact helps prioritize aggregated findings; it is not a WCAG conformance level.',
                'El impacto de FocusTrace ayuda a priorizar hallazgos agregados; no es un nivel de conformidad WCAG.',
              )}</small>
            </div>
            <div className="site-impact-counts">
              {DISPLAY_SEVERITIES.map((severity) => (
                <span className={`severity-${severity}`} key={severity}>
                  <strong>{failureSeverityCounts[severity]}</strong>
                  <small>{localizedSeverity(severity, language)}</small>
                </span>
              ))}
            </div>
          </div>
        )}

        <p>{manualScope
          ? tr(language, 'Scope source: manually selected URLs.', 'Origen del alcance: URLs seleccionadas manualmente.')
          : tr(language, `Discovery source: ${result.discovery.source}.`, `Origen del descubrimiento: ${result.discovery.source}.`)} {result.discovery.truncated && tr(
            language,
            manualScope ? 'The selected URL list hit the safety limit.' : 'URL discovery hit the safety limit.',
            manualScope ? 'La lista de URLs seleccionadas alcanzó el límite de seguridad.' : 'El descubrimiento de URLs alcanzó el límite de seguridad.',
          )}</p>
      </section>

      <section className="site-template-list" aria-label={tr(language, 'Detected route families', 'Familias de ruta detectadas')}>
        {result.templates.map((template) => {
          const successful = template.sampledPages.filter((page) => page.scan);
          const fingerprints = new Set(successful.flatMap((page) => page.structure?.fingerprint ? [page.structure.fingerprint] : []));
          const common = sortFindingAggregates(template.findings.filter((finding) => finding.commonToTemplate));
          const variants = sortFindingAggregates(template.findings.filter((finding) => !finding.commonToTemplate));
          const consistent = successful.length > 1 && fingerprints.size === 1;
          return (
            <details className="site-card site-template" key={template.id} open={template.id === 'T01'}>
              <summary>
                <span className="template-id">{template.id}</span>
                <span className="template-title"><strong>{template.label}</strong><small>{template.discoveredUrls.length} {tr(language, 'URLs represented', 'URLs representadas')}</small></span>
                <span className={consistent ? 'template-consistency is-consistent' : 'template-consistency'}>
                  {successful.length <= 1
                    ? tr(language, '1 sample', '1 muestra')
                    : consistent
                      ? `${successful.length}/${successful.length} ${tr(language, 'same structure', 'misma estructura')}`
                      : `${fingerprints.size} ${tr(language, 'structural variants', 'variantes estructurales')}`}
                </span>
                <span className="template-counts">🔴 {template.failures} · 🟠 {template.reviews} · ⚠ {template.warnings}</span>
              </summary>

              <div className="template-body">
                {common.length > 0 && (
                  <section>
                    <h3>{tr(language, 'Common to the template samples', 'Común a las muestras de la plantilla')}</h3>
                    <p>{tr(language, 'These signals appeared on every successfully scanned sample in this family.', 'Estas señales aparecieron en todas las muestras analizadas correctamente de esta familia.')}</p>
                    <ul className="template-findings">
                      {common.map((finding) => (
                        <FindingRow
                          key={finding.key}
                          finding={finding}
                          page={template.sampledPages.find((page) => page.url === finding.exampleUrl)}
                          language={language}
                        />
                      ))}
                    </ul>
                  </section>
                )}

                {variants.length > 0 && (
                  <section>
                    <h3>{successful.length <= 1
                      ? tr(language, 'Findings in the sampled page', 'Hallazgos de la página muestreada')
                      : tr(language, 'Variations / page-specific signals', 'Variaciones / señales específicas')}</h3>
                    <p>{successful.length <= 1
                      ? tr(language, 'Only one representative page was scanned for this route family; these findings cannot yet be classified as template-wide.', 'Solo se ha analizado una página representativa de esta familia; estos hallazgos todavía no pueden clasificarse como comunes a toda la plantilla.')
                      : tr(language, 'These signals appeared in only part of the representative sample.', 'Estas señales aparecieron solo en una parte de la muestra representativa.')}</p>
                    <ul className="template-findings">
                      {variants.map((finding) => (
                        <FindingRow
                          key={finding.key}
                          finding={finding}
                          page={template.sampledPages.find((page) => page.url === finding.exampleUrl)}
                          language={language}
                        />
                      ))}
                    </ul>
                  </section>
                )}

                {!template.findings.length && (
                  <p className="site-empty">{tr(language, 'No automated findings were produced in the sampled pages. Manual review is still required.', 'No se generaron hallazgos automáticos en las páginas muestreadas. Sigue siendo necesaria la revisión manual.')}</p>
                )}

                <section className="template-samples">
                  <h3>{manualScope ? tr(language, 'Selected pages', 'Páginas seleccionadas') : tr(language, 'Representative pages', 'Páginas representativas')}</h3>
                  <ul>{template.sampledPages.map((page) => (
                    <li key={page.url}>
                      <a href={page.url} target="_blank" rel="noreferrer">{page.url}</a>
                      {page.scan
                        ? <span>{page.scan.issues.length} F · {page.scan.review.length} R · {(page.scan.warnings ?? []).length} W</span>
                        : <span className="sample-error">{page.error}</span>}
                    </li>
                  ))}</ul>
                </section>
              </div>
            </details>
          );
        })}
      </section>

      <footer className="site-card site-footer">{tr(
        language,
        manualScope
          ? 'Manual URL mode scans every selected page up to the safety limit and still groups results by route family. Runtime states, authentication flows and manual WCAG review still require targeted testing.'
          : 'Template grouping is representative sampling, not proof that every URL is identical. Runtime states, authentication flows and manual WCAG review still require targeted testing.',
        manualScope
          ? 'El modo de URLs manuales analiza cada página seleccionada hasta el límite de seguridad y mantiene la agrupación por familias de ruta. Los estados runtime, flujos autenticados y la revisión WCAG manual siguen requiriendo pruebas específicas.'
          : 'La agrupación por plantillas utiliza muestreo representativo; no demuestra que todas las URLs sean idénticas. Los estados runtime, flujos autenticados y la revisión WCAG manual siguen requiriendo pruebas específicas.',
      )}</footer>
    </>
  );
}

function FindingRow({
  finding,
  page,
  language,
}: {
  finding: SiteAuditFindingAggregate;
  page: SiteAuditResult['pages'][number] | undefined;
  language: AppLanguage;
}) {
  const issue = localizedScanIssue(finding.exampleIssue, language);
  const component = finding.component;
  const targets = [...new Set(finding.exampleIssue.targets.filter(Boolean))];
  const observedPages = [...new Set(finding.pages)];
  const [visual, setVisual] = useState<string>();
  const [captureError, setCaptureError] = useState<string>();
  const [capturing, setCapturing] = useState(false);

  const capture = async () => {
    setCaptureError(undefined);
    setCapturing(true);
    try {
      setVisual(await captureSiteAuditFindingVisual(finding, page));
    } catch {
      setCaptureError(tr(
        language,
        'Visual evidence could not be captured. The page or affected element may have changed or the browser may have restricted capture.',
        'No se ha podido capturar la evidencia visual. La página o el elemento afectado puede haber cambiado, o el navegador puede haber restringido la captura.',
      ));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <li>
      <details className={`site-finding outcome-${finding.outcome} severity-${finding.exampleIssue.severity}`}>
        <summary>
          <span className="finding-statuses">
            <span className="finding-outcome">{outcomeText(finding.outcome, language)}</span>
            <span className={`finding-severity severity-${finding.exampleIssue.severity}`}>
              {localizedSeverity(finding.exampleIssue.severity, language)}
            </span>
          </span>
          <span className="finding-summary-copy">
            <strong>{issue.title}</strong>
            <small>
              {finding.ruleId} · {finding.sampleCount}/{finding.totalSamples} {tr(language, 'samples', 'muestras')}
              {component ? ` · ${component.componentId}` : ''}
            </small>
          </span>
          <span className="finding-expand" aria-hidden="true">＋</span>
        </summary>

        <div className="finding-detail">
          <div className="finding-context-grid">
            <section className="finding-component">
              <small>{tr(language, 'Affected component', 'Componente afectado')}</small>
              {component ? (
                <>
                  <strong>{component.componentId} · {componentTypeLabel(component, language)}</strong>
                  <span>{componentPrimaryLabel(component)}</span>
                  <span>{component.tag}{component.role ? ` · role=${component.role}` : ''}</span>
                  {componentContextLabel(component) && <em>{componentContextLabel(component)}</em>}
                </>
              ) : (
                <strong>{tr(language, 'Element identified from recorded selector', 'Elemento identificado mediante el selector registrado')}</strong>
              )}
            </section>
            <section>
              <small>{tr(language, 'Observed coverage', 'Cobertura observada')}</small>
              <strong>{finding.commonToTemplate
                ? tr(language, `Observed in all ${finding.totalSamples} representative samples`, `Observado en las ${finding.totalSamples} muestras representativas`)
                : tr(language, `Observed in ${finding.sampleCount} of ${finding.totalSamples} samples`, `Observado en ${finding.sampleCount} de ${finding.totalSamples} muestras`)}</strong>
              <span>{finding.commonToTemplate
                ? tr(language, 'Likely template/component-level issue within the sampled family.', 'Posible problema de plantilla/componente dentro de la familia muestreada.')
                : tr(language, 'May depend on page content, state or a structural variant.', 'Puede depender del contenido, del estado o de una variante estructural de la página.')}</span>
            </section>
            <section className={`finding-severity-context severity-${finding.exampleIssue.severity}`}>
              <small>{tr(language, 'Estimated impact', 'Impacto estimado')}</small>
              <strong>{localizedSeverity(finding.exampleIssue.severity, language)}</strong>
              <span>{tr(
                language,
                'FocusTrace prioritization aid; not a WCAG conformance level.',
                'Prioridad estimada por FocusTrace; no es un nivel de conformidad WCAG.',
              )}</span>
            </section>
          </div>

          <section className="finding-location">
            <small>{tr(language, 'Where it was found', 'Dónde se ha encontrado')}</small>
            <div className="finding-location-primary">
              <span><b>{tr(language, 'Representative page', 'Página representativa')}:</b> <a href={finding.exampleUrl} target="_blank" rel="noreferrer">{finding.exampleUrl}</a></span>
              <span><b>{tr(language, 'Exact selector', 'Selector exacto')}:</b> <code>{finding.exampleSelector === 'page' ? tr(language, 'Whole page', 'Página completa') : finding.exampleSelector}</code></span>
            </div>
            {targets.length > 1 && (
              <div className="finding-targets">
                <b>{tr(language, 'Targets in the representative scan', 'Elementos detectados en el escaneo representativo')}:</b>
                <ul>{targets.map((target) => <li key={target}><code>{target}</code></li>)}</ul>
              </div>
            )}
            <div className="finding-observed-pages">
              <b>{tr(language, 'Observed on sampled pages', 'Observado en las páginas muestreadas')}:</b>
              <ul>{observedPages.map((url) => (
                <li key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>
              ))}</ul>
            </div>
          </section>

          <section className="finding-explanation">
            <small>{tr(language, 'What was detected', 'Qué se ha detectado')}</small>
            <p>{issue.description}</p>
            {issue.evidence && <blockquote><strong>{tr(language, 'Evidence', 'Evidencia')}:</strong> {issue.evidence}</blockquote>}
          </section>

          {issue.accessibleName && (
            <section className="finding-structured-evidence finding-name-evidence">
              <small>{tr(language, 'Accessible name evidence', 'Evidencia del nombre accesible')}</small>
              <span><b>{tr(language, 'Computed name', 'Nombre calculado')}:</b> {issue.accessibleName.name || '∅'}</span>
              <span><b>{tr(language, 'Source', 'Fuente')}:</b> {issue.accessibleName.source || '—'}</span>
              {issue.accessibleName.role && <span><b>{tr(language, 'Computed role', 'Rol calculado')}:</b> {issue.accessibleName.role}</span>}
              {issue.accessibleName.candidates.length > 0 && (
                <div className="finding-evidence-list">
                  <b>{tr(language, 'Name sources inspected', 'Fuentes de nombre inspeccionadas')}:</b>
                  <ul>{issue.accessibleName.candidates.map((candidate, index) => (
                    <li key={`${candidate.source}-${candidate.selector}-${index}`}>
                      <span>{candidate.source} · {candidate.used ? tr(language, 'used', 'utilizada') : tr(language, 'not used', 'no utilizada')}</span>
                      <code>{candidate.selector}</code>
                      <em>{candidate.value || '∅'}</em>
                    </li>
                  ))}</ul>
                </div>
              )}
            </section>
          )}

          {issue.contrast && (
            <section className="finding-structured-evidence finding-contrast-evidence">
              <small>{tr(language, 'Contrast evidence', 'Evidencia de contraste')}</small>
              <span><b>{tr(language, 'Measured', 'Medido')}:</b> {issue.contrast.ratio != null ? `${issue.contrast.ratio}:1` : tr(language, 'Manual review', 'Revisión manual')}</span>
              <span><b>{tr(language, 'Required', 'Requerido')}:</b> {issue.contrast.requiredRatio}:1</span>
              {issue.contrast.subject && <span><b>{tr(language, 'Measured subject', 'Señal medida')}:</b> {issue.contrast.subject}</span>}
              {issue.contrast.kind && <span><b>{tr(language, 'Contrast kind', 'Tipo de contraste')}:</b> {issue.contrast.kind}</span>}
              {issue.contrast.foreground && <span><b>{tr(language, 'Foreground', 'Color frontal')}:</b> <code>{issue.contrast.foreground}</code></span>}
              {issue.contrast.background && <span><b>{tr(language, 'Background / adjacent', 'Fondo / adyacente')}:</b> <code>{issue.contrast.background}</code></span>}
              {issue.contrast.fontSizePx != null && <span><b>{tr(language, 'Text size', 'Tamaño de texto')}:</b> {issue.contrast.fontSizePx}px</span>}
              {issue.contrast.fontWeight != null && <span><b>{tr(language, 'Font weight', 'Peso de fuente')}:</b> {issue.contrast.fontWeight}</span>}
              {issue.contrast.reason && <span><b>{tr(language, 'Measurement context', 'Contexto de medición')}:</b> {issue.contrast.reason}</span>}
            </section>
          )}

          <section className="finding-solution">
            <small>{tr(language, 'Suggested fix', 'Solución sugerida')}</small>
            <p>{remediationForIssue(finding.exampleIssue, language)}</p>
          </section>

          {finding.references.length > 0 && (
            <section className="finding-references">
              <small>{tr(language, 'Standards references', 'Referencias normativas')}</small>
              <ul>{finding.references.map((reference) => (
                <li key={`${reference.type}-${reference.id}-${reference.url}`}>
                  <a href={reference.url} target="_blank" rel="noreferrer">
                    {reference.type} {reference.id}{reference.level ? ` (${reference.level})` : ''} · {reference.label}
                  </a>
                </li>
              ))}</ul>
            </section>
          )}

          <div className="finding-actions">
            <a className="finding-open-page" href={finding.exampleUrl} target="_blank" rel="noreferrer">↗ {tr(language, 'Open sample page', 'Abrir página de muestra')}</a>
            <button type="button" disabled={capturing} onClick={() => void capture()}>
              {capturing ? tr(language, 'Capturing…', 'Capturando…') : `▣ ${tr(language, visual ? 'Refresh visual evidence' : 'Capture visual evidence', visual ? 'Actualizar evidencia visual' : 'Capturar evidencia visual')}`}
            </button>
          </div>

          {captureError && <p className="finding-capture-error" role="alert">{captureError}</p>}
          {visual && (
            <figure className="finding-visual-evidence">
              <img src={visual} alt={tr(language, `Visual crop for ${issue.title}`, `Recorte visual de ${issue.title}`)} />
              <figcaption>{tr(language, 'Captured on demand from the representative page. Included when printing/saving this Site Audit as PDF.', 'Capturada bajo demanda desde la página representativa. Se incluirá al imprimir/guardar este Site Audit como PDF.')}</figcaption>
            </figure>
          )}
        </div>
      </details>
    </li>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
