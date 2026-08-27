import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { buildSiteAuditTemplates } from '../../lib/site-audit/aggregate';
import { discoverSiteUrls, normalizeDiscoveredUrl } from '../../lib/site-audit/discovery';
import {
  componentContextLabel,
  componentPrimaryLabel,
  componentTypeLabel,
} from '../../lib/report/component-identity';
import {
  SITE_AUDIT_MAX_DISCOVERED_URLS,
  SITE_AUDIT_MAX_SCANNED_PAGES,
  SITE_AUDIT_SAMPLES_PER_FAMILY,
  type SiteAuditFindingAggregate,
  type SiteAuditResult,
  type SiteAuditStatus,
} from '../../lib/site-audit/model';
import { remediationForIssue } from '../../lib/site-audit/remediation';
import { buildRouteFamilies, selectSiteAuditSamples } from '../../lib/site-audit/routes';
import { scanRepresentativePage, sourcePageLinks } from '../../lib/site-audit/runner';
import { buildSiteAuditTextReport, siteAuditFilename } from '../../lib/site-audit/text-report';
import { captureSiteAuditFindingVisual } from '../../lib/site-audit/visual-evidence';
import { localizedScanIssue, localizedSeverity, type AppLanguage } from '../../shared/i18n';
import { countBySeverity, severityRank } from '../../shared/severity';
import type { FindingOutcome, Severity } from '../../shared/types';
import { localizedUserError } from '../../shared/user-facing-errors';
import './style.css';

const DISPLAY_SEVERITIES: Severity[] = ['critical', 'serious', 'moderate', 'minor'];

function t(language: AppLanguage, en: string, es: string) {
  return language === 'es' ? es : en;
}

function outcomeText(outcome: FindingOutcome, language: AppLanguage): string {
  if (outcome === 'fail') return t(language, 'FAILURE', 'FALLO');
  if (outcome === 'review') return t(language, 'REVIEW', 'REVISIÓN');
  return t(language, 'WARNING', 'AVISO');
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

function permissionPattern(sourceUrl: string) {
  const url = new URL(sourceUrl);
  return `${url.protocol}//${url.host}/*`;
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
  const [status, setStatus] = useState<SiteAuditStatus>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, url: '' });
  const [result, setResult] = useState<SiteAuditResult>();
  const [error, setError] = useState<string>();
  const [extraUrls, setExtraUrls] = useState('');
  const abortRef = useRef<AbortController | undefined>(undefined);
  document.documentElement.lang = language;

  const validSource = useMemo(() => {
    try {
      const url = new URL(source.sourceUrl);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }, [source.sourceUrl]);

  const run = async () => {
    if (!validSource) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setResult(undefined);
    setError(undefined);
    setStatus('discovering');
    setProgress({ current: 0, total: 0, url: source.sourceUrl });

    try {
      const granted = await browser.permissions.request({ origins: [permissionPattern(source.sourceUrl)] });
      if (!granted) throw new Error(t(
        language,
        'Site Audit needs access to this site so representative pages can be discovered and scanned.',
        'Site Audit necesita acceso a este sitio para descubrir y analizar páginas representativas.',
      ));

      const origin = new URL(source.sourceUrl).origin;
      const links = source.tabId != null ? await sourcePageLinks(source.tabId, origin) : [];
      const discovered = await discoverSiteUrls(source.sourceUrl, links);
      const merged = new Set(discovered.urls);
      for (const raw of extraUrls.split(/\r?\n/)) {
        const normalized = normalizeDiscoveredUrl(raw.trim(), origin);
        if (normalized) merged.add(normalized);
        if (merged.size >= SITE_AUDIT_MAX_DISCOVERED_URLS) break;
      }
      const discovery = {
        ...discovered,
        urls: [...merged].slice(0, SITE_AUDIT_MAX_DISCOVERED_URLS),
        truncated: discovered.truncated || merged.size > SITE_AUDIT_MAX_DISCOVERED_URLS,
      };
      if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');

      const families = buildRouteFamilies(discovery.urls);
      const samples = selectSiteAuditSamples(families);
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

  if (!validSource) {
    return (
      <main className="site-audit-shell">
        <header className="site-brand"><img src="/icon/48.png" alt="" /><strong>FocusTrace</strong></header>
        <section className="site-card site-error">
          <h1>Site Audit</h1>
          <p>{t(language, 'Open Site Audit from a normal http/https page.', 'Abre Site Audit desde una página http/https normal.')}</p>
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
          <span className="site-kicker">{t(language, 'Site-level accessibility coverage', 'Cobertura de accesibilidad del sitio')}</span>
          <h1>{t(language, 'Scan representative templates, not thousands of duplicates', 'Analiza plantillas representativas, no miles de duplicados')}</h1>
          <p>{t(
            language,
            'Discover same-origin URLs, group repeated route families and run the real page scanner on representative samples.',
            'Descubre URLs del mismo origen, agrupa familias de rutas repetidas y ejecuta el scanner real sobre muestras representativas.',
          )}</p>
        </div>
        <code>{source.sourceUrl}</code>
      </section>

      {(status === 'idle' || status === 'cancelled' || status === 'error') && (
        <section className="site-card site-start">
          <h2>{t(language, 'Audit scope', 'Alcance de la auditoría')}</h2>
          <div className="site-limits">
            <span><strong>{SITE_AUDIT_MAX_DISCOVERED_URLS}</strong>{t(language, 'max discovered URLs', 'URLs descubiertas máx.')}</span>
            <span><strong>{SITE_AUDIT_MAX_SCANNED_PAGES}</strong>{t(language, 'max pages scanned', 'páginas analizadas máx.')}</span>
            <span><strong>{SITE_AUDIT_SAMPLES_PER_FAMILY}</strong>{t(language, 'samples per route family', 'muestras por familia')}</span>
          </div>
          <label className="site-extra-urls">
            <span>{t(language, 'Additional same-site URLs (optional, one per line)', 'URLs adicionales del mismo sitio (opcional, una por línea)')}</span>
            <textarea value={extraUrls} onChange={(event) => setExtraUrls(event.target.value)} rows={3} placeholder={`${new URL(source.sourceUrl).origin}/private-page`} />
          </label>
          <p className="site-scope-note">{t(
            language,
            'Discovery checks robots.txt and sitemaps first and supplements them with internal links from the current page. Runtime Trace is not automated across the site in this version.',
            'El descubrimiento revisa primero robots.txt y sitemaps y los complementa con enlaces internos de la página actual. En esta versión Trace runtime no se automatiza por todo el sitio.',
          )}</p>
          {error && <p className="site-error-message" role="alert">{error}</p>}
          <button className="site-primary" type="button" onClick={() => void run()}>{t(language, 'Start Site Audit', 'Iniciar Site Audit')}</button>
        </section>
      )}

      {(status === 'discovering' || status === 'scanning') && (
        <section className="site-card site-progress" aria-live="polite">
          <span className="site-spinner" aria-hidden="true" />
          <div>
            <h2>{status === 'discovering' ? t(language, 'Discovering the site…', 'Descubriendo el sitio…') : t(language, 'Scanning representative pages…', 'Analizando páginas representativas…')}</h2>
            {status === 'scanning' && <strong>{progress.current}/{progress.total}</strong>}
            <p title={progress.url}>{progress.url}</p>
          </div>
          <button type="button" onClick={cancel}>{t(language, 'Cancel', 'Cancelar')}</button>
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

  return (
    <>
      <section className="site-card site-summary">
        <div className="site-report-actions">
          <div><span className="site-kicker">{t(language, 'Site Audit complete', 'Site Audit completado')}</span><h2>{result.origin}</h2></div>
          <div>
            <button type="button" onClick={() => downloadText(result, language)}>↓ {t(language, 'Download .txt', 'Descargar .txt')}</button>
            <button type="button" onClick={() => window.print()}>▤ {t(language, 'Print / PDF', 'Imprimir / PDF')}</button>
            <button type="button" onClick={onRunAgain}>↻ {t(language, 'Run again', 'Repetir')}</button>
          </div>
        </div>
        <div className="site-score-grid">
          <span><strong>{result.discovery.urls.length}</strong>{t(language, 'URLs discovered', 'URLs descubiertas')}</span>
          <span><strong>{result.templates.length}</strong>{t(language, 'route families', 'familias de ruta')}</span>
          <span><strong>{result.scannedPages}</strong>{t(language, 'pages scanned', 'páginas analizadas')}</span>
          <span><strong>{commonFindings}</strong>{t(language, 'template-wide signals', 'señales de plantilla')}</span>
          <span><strong>{result.failedPages}</strong>{t(language, 'scan errors', 'errores de escaneo')}</span>
        </div>

        {failureSignals.length > 0 && (
          <div className="site-impact-summary">
            <div>
              <strong>{t(language, 'Failure impact', 'Impacto de los fallos')}</strong>
              <small>{t(
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

        <p>{t(language, `Discovery source: ${result.discovery.source}.`, `Origen del descubrimiento: ${result.discovery.source}.`)} {result.discovery.truncated && t(language, 'URL discovery hit the safety limit.', 'El descubrimiento alcanzó el límite de seguridad.')}</p>
      </section>

      <section className="site-template-list" aria-label={t(language, 'Detected route families', 'Familias de ruta detectadas')}>
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
                <span className="template-title"><strong>{template.label}</strong><small>{template.discoveredUrls.length} {t(language, 'URLs represented', 'URLs representadas')}</small></span>
                <span className={consistent ? 'template-consistency is-consistent' : 'template-consistency'}>
                  {successful.length <= 1
                    ? t(language, '1 sample', '1 muestra')
                    : consistent
                      ? `${successful.length}/${successful.length} ${t(language, 'same structure', 'misma estructura')}`
                      : `${fingerprints.size} ${t(language, 'structural variants', 'variantes estructurales')}`
                </span>
                <span className="template-counts">🔴 {template.failures} · 🟠 {template.reviews} · ⚠ {template.warnings}</span>
              </summary>

              <div className="template-body">
                {common.length > 0 && (
                  <section>
                    <h3>{t(language, 'Common to the template samples', 'Común a las muestras de la plantilla')}</h3>
                    <p>{t(language, 'These signals appeared on every successfully scanned sample in this family.', 'Estas señales aparecieron en todas las muestras analizadas correctamente de esta familia.')}</p>
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
                      ? t(language, 'Findings in the sampled page', 'Hallazgos de la página muestreada')
                      : t(language, 'Variations / page-specific signals', 'Variaciones / señales específicas')}</h3>
                    <p>{successful.length <= 1
                      ? t(language, 'Only one representative page was scanned for this route family; these findings cannot yet be classified as template-wide.', 'Solo se ha analizado una página representativa de esta familia; estos hallazgos todavía no pueden clasificarse como comunes a toda la plantilla.')
                      : t(language, 'These signals appeared in only part of the representative sample.', 'Estas señales aparecieron solo en una parte de la muestra representativa.')}</p>
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
                  <p className="site-empty">{t(language, 'No automated findings were produced in the sampled pages. Manual review is still required.', 'No se generaron hallazgos automáticos en las páginas muestreadas. Sigue siendo necesaria la revisión manual.')}</p>
                )}

                <section className="template-samples">
                  <h3>{t(language, 'Representative pages', 'Páginas representativas')}</h3>
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

      <footer className="site-card site-footer">{t(
        language,
        'Template grouping is representative sampling, not proof that every URL is identical. Runtime states, authentication flows and manual WCAG review still require targeted testing.',
        'La agrupación por plantillas utiliza muestreo representativo; no demuestra que todas las URLs sean idénticas. Los estados runtime, flujos autenticados y la revisión WCAG manual siguen requiriendo pruebas específicas.',
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
      setCaptureError(t(
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
              {finding.ruleId} · {finding.sampleCount}/{finding.totalSamples} {t(language, 'samples', 'muestras')}
              {component ? ` · ${component.componentId}` : ''}
            </small>
          </span>
          <span className="finding-expand" aria-hidden="true">＋</span>
        </summary>

        <div className="finding-detail">
          <div className="finding-context-grid">
            <section className="finding-component">
              <small>{t(language, 'Affected component', 'Componente afectado')}</small>
              {component ? (
                <>
                  <strong>{component.componentId} · {componentTypeLabel(component, language)}</strong>
                  <span>{componentPrimaryLabel(component)}</span>
                  <span>{component.tag}{component.role ? ` · role=${component.role}` : ''}</span>
                  {componentContextLabel(component) && <em>{componentContextLabel(component)}</em>}
                </>
              ) : (
                <strong>{t(language, 'Element identified from recorded selector', 'Elemento identificado mediante el selector registrado')}</strong>
              )}
            </section>
            <section>
              <small>{t(language, 'Observed coverage', 'Cobertura observada')}</small>
              <strong>{finding.commonToTemplate
                ? t(language, `Observed in all ${finding.totalSamples} representative samples`, `Observado en las ${finding.totalSamples} muestras representativas`)
                : t(language, `Observed in ${finding.sampleCount} of ${finding.totalSamples} samples`, `Observado en ${finding.sampleCount} de ${finding.totalSamples} muestras`)}</strong>
              <span>{finding.commonToTemplate
                ? t(language, 'Likely template/component-level issue within the sampled family.', 'Posible problema de plantilla/componente dentro de la familia muestreada.')
                : t(language, 'May depend on page content, state or a structural variant.', 'Puede depender del contenido, del estado o de una variante estructural de la página.')}</span>
            </section>
            <section className={`finding-severity-context severity-${finding.exampleIssue.severity}`}>
              <small>{t(language, 'Estimated impact', 'Impacto estimado')}</small>
              <strong>{localizedSeverity(finding.exampleIssue.severity, language)}</strong>
              <span>{t(
                language,
                'FocusTrace prioritization aid; not a WCAG conformance level.',
                'Prioridad estimada por FocusTrace; no es un nivel de conformidad WCAG.',
              )}</span>
            </section>
          </div>

          <section className="finding-location">
            <small>{t(language, 'Where it was found', 'Dónde se ha encontrado')}</small>
            <div className="finding-location-primary">
              <span><b>{t(language, 'Representative page', 'Página representativa')}:</b> <a href={finding.exampleUrl} target="_blank" rel="noreferrer">{finding.exampleUrl}</a></span>
              <span><b>{t(language, 'Exact selector', 'Selector exacto')}:</b> <code>{finding.exampleSelector === 'page' ? t(language, 'Whole page', 'Página completa') : finding.exampleSelector}</code></span>
            </div>
            {targets.length > 1 && (
              <div className="finding-targets">
                <b>{t(language, 'Targets in the representative scan', 'Elementos detectados en el escaneo representativo')}:</b>
                <ul>{targets.map((target) => <li key={target}><code>{target}</code></li>)}</ul>
              </div>
            )}
            <div className="finding-observed-pages">
              <b>{t(language, 'Observed on sampled pages', 'Observado en las páginas muestreadas')}:</b>
              <ul>{observedPages.map((url) => (
                <li key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>
              ))}</ul>
            </div>
          </section>

          <section className="finding-explanation">
            <small>{t(language, 'What was detected', 'Qué se ha detectado')}</small>
            <p>{issue.description}</p>
            {issue.evidence && <blockquote><strong>{t(language, 'Evidence', 'Evidencia')}:</strong> {issue.evidence}</blockquote>}
          </section>

          {issue.accessibleName && (
            <section className="finding-structured-evidence finding-name-evidence">
              <small>{t(language, 'Accessible name evidence', 'Evidencia del nombre accesible')}</small>
              <span><b>{t(language, 'Computed name', 'Nombre calculado')}:</b> {issue.accessibleName.name || '∅'}</span>
              <span><b>{t(language, 'Source', 'Fuente')}:</b> {issue.accessibleName.source || '—'}</span>
              {issue.accessibleName.role && <span><b>{t(language, 'Computed role', 'Rol calculado')}:</b> {issue.accessibleName.role}</span>}
              {issue.accessibleName.candidates.length > 0 && (
                <div className="finding-evidence-list">
                  <b>{t(language, 'Name sources inspected', 'Fuentes de nombre inspeccionadas')}:</b>
                  <ul>{issue.accessibleName.candidates.map((candidate, index) => (
                    <li key={`${candidate.source}-${candidate.selector}-${index}`}>
                      <span>{candidate.source} · {candidate.used ? t(language, 'used', 'utilizada') : t(language, 'not used', 'no utilizada')}</span>
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
              <small>{t(language, 'Contrast evidence', 'Evidencia de contraste')}</small>
              <span><b>{t(language, 'Measured', 'Medido')}:</b> {issue.contrast.ratio != null ? `${issue.contrast.ratio}:1` : t(language, 'Manual review', 'Revisión manual')}</span>
              <span><b>{t(language, 'Required', 'Requerido')}:</b> {issue.contrast.requiredRatio}:1</span>
              {issue.contrast.subject && <span><b>{t(language, 'Measured subject', 'Señal medida')}:</b> {issue.contrast.subject}</span>}
              {issue.contrast.kind && <span><b>{t(language, 'Contrast kind', 'Tipo de contraste')}:</b> {issue.contrast.kind}</span>}
              {issue.contrast.foreground && <span><b>{t(language, 'Foreground', 'Color frontal')}:</b> <code>{issue.contrast.foreground}</code></span>}
              {issue.contrast.background && <span><b>{t(language, 'Background / adjacent', 'Fondo / adyacente')}:</b> <code>{issue.contrast.background}</code></span>}
              {issue.contrast.fontSizePx != null && <span><b>{t(language, 'Text size', 'Tamaño de texto')}:</b> {issue.contrast.fontSizePx}px</span>}
              {issue.contrast.fontWeight != null && <span><b>{t(language, 'Font weight', 'Peso de fuente')}:</b> {issue.contrast.fontWeight}</span>}
              {issue.contrast.reason && <span><b>{t(language, 'Measurement context', 'Contexto de medición')}:</b> {issue.contrast.reason}</span>}
            </section>
          )}

          <section className="finding-solution">
            <small>{t(language, 'Suggested fix', 'Solución sugerida')}</small>
            <p>{remediationForIssue(finding.exampleIssue, language)}</p>
          </section>

          {finding.references.length > 0 && (
            <section className="finding-references">
              <small>{t(language, 'Standards references', 'Referencias normativas')}</small>
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
            <a className="finding-open-page" href={finding.exampleUrl} target="_blank" rel="noreferrer">↗ {t(language, 'Open sample page', 'Abrir página de muestra')}</a>
            <button type="button" disabled={capturing} onClick={() => void capture()}>
              {capturing ? t(language, 'Capturing…', 'Capturando…') : `▣ ${t(language, visual ? 'Refresh visual evidence' : 'Capture visual evidence', visual ? 'Actualizar evidencia visual' : 'Capturar evidencia visual')}`}
            </button>
          </div>

          {captureError && <p className="finding-capture-error" role="alert">{captureError}</p>}
          {visual && (
            <figure className="finding-visual-evidence">
              <img src={visual} alt={t(language, `Visual crop for ${issue.title}`, `Recorte visual de ${issue.title}`)} />
              <figcaption>{t(language, 'Captured on demand from the representative page. Included when printing/saving this Site Audit as PDF.', 'Capturada bajo demanda desde la página representativa. Se incluirá al imprimir/guardar este Site Audit como PDF.')}</figcaption>
            </figure>
          )}
        </div>
      </details>
    </li>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
