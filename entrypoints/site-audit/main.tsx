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
import { localizedScanIssue, type AppLanguage } from '../../shared/i18n';
import './style.css';
import './visual-system.css';

function t(language: AppLanguage, en: string, es: string) {
  return language === 'es' ? es : en;
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

function normalizedExtraUrls(value: string, sourceUrl: string) {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const raw of value.split(/\r?\n/)) {
    const normalized = normalizeDiscoveredUrl(raw.trim(), sourceUrl);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }
  return urls;
}

function runActionLabel(status: SiteAuditStatus, language: AppLanguage) {
  if (status === 'discovering') return t(language, 'Discovering…', 'Descubriendo…');
  if (status === 'scanning') return t(language, 'Scanning…', 'Analizando…');
  if (status === 'aggregating') return t(language, 'Building report…', 'Generando informe…');
  return t(language, 'Scan site', 'Escanear sitio');
}

function FindingCard({
  finding,
  language,
  visual,
  onCapture,
  captureBusy,
  captureError,
}: {
  finding: SiteAuditFindingAggregate;
  language: AppLanguage;
  visual?: string | undefined;
  onCapture: () => void;
  captureBusy: boolean;
  captureError?: string | undefined;
}) {
  const issue = localizedScanIssue(finding.exampleIssue, language);
  const reference = finding.references[0];
  const component = finding.component;
  const context = component ? componentContextLabel(component) : '';
  const outcomeLabel = finding.outcome === 'fail'
    ? t(language, 'Fail', 'Fallo')
    : finding.outcome === 'review'
      ? t(language, 'Review', 'Revisión')
      : t(language, 'Warning', 'Aviso');
  return (
    <li>
      <details className={`site-finding outcome-${finding.outcome}`}>
        <summary>
          <span className="finding-outcome">{outcomeLabel}</span>
          <span className="finding-summary-copy">
            <strong>{issue.title}</strong>
            <small>{finding.ruleId} · {finding.sampleCount}/{finding.totalSamples} {t(language, 'samples', 'muestras')}</small>
          </span>
          <span className="finding-expand" aria-hidden="true">+</span>
        </summary>
        <div className="finding-detail">
          <div className="finding-context-grid">
            {component && (
              <section className="finding-component">
                <small>{t(language, 'Affected element', 'Elemento afectado')}</small>
                <strong>{component.componentId} · {componentTypeLabel(component, language)}</strong>
                <span>{componentPrimaryLabel(component)}</span>
                {context && <em>{context}</em>}
              </section>
            )}
            <section>
              <small>{t(language, 'Representative page', 'Página representativa')}</small>
              <a href={finding.exampleUrl} target="_blank" rel="noreferrer">{finding.exampleUrl}</a>
            </section>
          </div>
          <section className="finding-explanation">
            <small>{t(language, 'Finding', 'Hallazgo')}</small>
            <p>{issue.description}</p>
            {issue.evidence && <blockquote>{issue.evidence}</blockquote>}
          </section>
          {(issue.contrast || issue.accessibleName) && (
            <section className="finding-structured-evidence">
              <small>{t(language, 'Evidence', 'Evidencia')}</small>
              {issue.contrast && (
                <>
                  <span>{t(language, 'Contrast', 'Contraste')}</span>
                  <code>{issue.contrast.ratio ?? 'review'}:1 / {issue.contrast.requiredRatio}:1</code>
                </>
              )}
              {issue.accessibleName && (
                <>
                  <span>{t(language, 'Accessible name', 'Nombre accesible')}</span>
                  <code>{issue.accessibleName.name || '∅'}</code>
                </>
              )}
            </section>
          )}
          <section className="finding-solution">
            <small>{t(language, 'Suggested fix', 'Solución sugerida')}</small>
            <p>{remediationForIssue(finding.exampleIssue, language)}</p>
          </section>
          <section className="finding-sample">
            <small>{t(language, 'Coverage', 'Cobertura')}</small>
            <span>{finding.sampleCount}/{finding.totalSamples} {t(language, 'representative samples', 'muestras representativas')}</span>
            {finding.commonToTemplate && <strong>{t(language, 'Common to this template', 'Común a esta plantilla')}</strong>}
            {reference && (
              <span>{reference.type} {reference.id}{reference.level ? ` (${reference.level})` : ''}</span>
            )}
          </section>
          <div className="finding-actions">
            <a href={finding.exampleUrl} target="_blank" rel="noreferrer">{t(language, 'Open sample', 'Abrir muestra')}</a>
            <button type="button" disabled={captureBusy} onClick={onCapture}>
              {captureBusy
                ? t(language, 'Capturing…', 'Capturando…')
                : visual
                  ? t(language, 'Refresh visual evidence', 'Actualizar evidencia visual')
                  : t(language, 'Capture visual evidence', 'Capturar evidencia visual')}
            </button>
          </div>
          {captureError && <p className="finding-capture-error" role="alert">{captureError}</p>}
          {visual && (
            <figure className="finding-visual-evidence">
              <img src={visual} alt="" />
              <figcaption>{t(
                language,
                'Visual evidence from the representative page. The outlined area is the element used for this finding.',
                'Evidencia visual de la página representativa. El área resaltada corresponde al elemento usado para este hallazgo.',
              )}</figcaption>
            </figure>
          )}
        </div>
      </details>
    </li>
  );
}

function SiteAuditApp() {
  const initial = params();
  const [status, setStatus] = useState<SiteAuditStatus>('idle');
  const [result, setResult] = useState<SiteAuditResult>();
  const [extraUrls, setExtraUrls] = useState('');
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState({ completed: 0, total: 0, url: '' });
  const [visuals, setVisuals] = useState<Record<string, string>>({});
  const [captureId, setCaptureId] = useState<string>();
  const [captureErrors, setCaptureErrors] = useState<Record<string, string>>({});
  const cancelled = useRef(false);

  const running = status === 'discovering' || status === 'scanning' || status === 'aggregating';
  const score = useMemo(() => {
    if (!result) return undefined;
    return {
      fail: result.templates.reduce((total, template) => total + template.failures, 0),
      review: result.templates.reduce((total, template) => total + template.reviews, 0),
      warning: result.templates.reduce((total, template) => total + template.warnings, 0),
    };
  }, [result]);

  const run = async () => {
    if (!initial.tabId || running) return;
    setError(undefined);
    setResult(undefined);
    setVisuals({});
    setCaptureErrors({});
    cancelled.current = false;
    try {
      const originPattern = permissionPattern(initial.sourceUrl);
      const granted = await browser.permissions.request({ origins: [originPattern] });
      if (!granted) throw new Error(t(initial.language, 'Site access was not granted.', 'No se concedió acceso al sitio.'));

      setStatus('discovering');
      const sourceLinks = await sourcePageLinks(initial.tabId).catch(() => []);
      const discovery = await discoverSiteUrls({
        sourceUrl: initial.sourceUrl,
        sourcePageLinks: sourceLinks,
      });
      const manualUrls = normalizedExtraUrls(extraUrls, initial.sourceUrl);
      const urls = [...discovery.urls];
      for (const url of manualUrls) {
        if (!urls.includes(url) && urls.length < SITE_AUDIT_MAX_DISCOVERED_URLS) urls.push(url);
      }

      const families = buildRouteFamilies(urls);
      const samples = selectSiteAuditSamples(families).slice(0, SITE_AUDIT_MAX_SCANNED_PAGES);
      const selectedUrls = samples.flatMap((family) => family.sampleUrls);
      setProgress({ completed: 0, total: selectedUrls.length, url: selectedUrls[0] ?? '' });
      setStatus('scanning');

      const scans = [];
      for (let index = 0; index < selectedUrls.length; index += 1) {
        if (cancelled.current) throw new Error(t(initial.language, 'Site audit cancelled.', 'Auditoría cancelada.'));
        const url = selectedUrls[index];
        setProgress({ completed: index, total: selectedUrls.length, url });
        scans.push(await scanRepresentativePage(url, initial.language));
        setProgress({ completed: index + 1, total: selectedUrls.length, url });
      }

      setStatus('aggregating');
      const templates = buildSiteAuditTemplates(families, scans);
      setResult({
        origin: new URL(initial.sourceUrl).origin,
        generatedAt: Date.now(),
        discovery: { ...discovery, urls },
        templates,
        scannedPages: scans.filter((scan) => scan.scan).length,
        failedPages: scans.filter((scan) => !scan.scan).length,
      });
      setStatus('done');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message);
      setStatus('error');
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const blob = new Blob(['\uFEFF', buildSiteAuditTextReport(result, initial.language)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = siteAuditFilename(result);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const captureFinding = async (finding: SiteAuditFindingAggregate) => {
    setCaptureId(finding.id);
    setCaptureErrors((current) => ({ ...current, [finding.id]: '' }));
    try {
      const visual = await captureSiteAuditFindingVisual({
        url: finding.exampleUrl,
        selector: finding.exampleIssue.selector,
      });
      setVisuals((current) => ({ ...current, [finding.id]: visual.dataUrl }));
    } catch (reason) {
      setCaptureErrors((current) => ({
        ...current,
        [finding.id]: reason instanceof Error ? reason.message : String(reason),
      }));
    } finally {
      setCaptureId(undefined);
    }
  };

  if (!initial.sourceUrl) {
    return (
      <main className="site-audit-shell">
        <section className="site-card site-error">
          <h1>{t(initial.language, 'Site Audit', 'Auditoría de sitio')}</h1>
          <p>{t(initial.language, 'No source page was provided.', 'No se ha proporcionado una página de origen.')}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="site-audit-shell">
      <header className="site-brand">
        <img src="/icon/48.png" alt="" />
        <div>
          <strong>FocusTrace</strong>
          <span>{t(initial.language, 'Site Audit', 'Auditoría de sitio')}</span>
        </div>
        <small>{t(initial.language, 'Local representative sampling', 'Muestreo representativo local')}</small>
      </header>

      <section className="site-card site-hero">
        <div>
          <span className="site-kicker">{t(initial.language, 'Representative audit', 'Auditoría representativa')}</span>
          <h1>{t(initial.language, 'Scan the site by templates, not by brute force', 'Analiza el sitio por plantillas, no por fuerza bruta')}</h1>
          <p>{t(
            initial.language,
            'Discover routes, group structurally similar pages and audit representative samples without sending page content to external services.',
            'Descubre rutas, agrupa páginas estructuralmente similares y audita muestras representativas sin enviar contenido de la página a servicios externos.',
          )}</p>
        </div>
        <code>{initial.sourceUrl}</code>
      </section>

      {!result && !running && (
        <section className="site-card site-start">
          <h2>{t(initial.language, 'Audit scope', 'Alcance de la auditoría')}</h2>
          <div className="site-limits">
            <span><strong>{SITE_AUDIT_MAX_DISCOVERED_URLS}</strong>{t(initial.language, 'max discovered URLs', 'URLs máximas descubiertas')}</span>
            <span><strong>{SITE_AUDIT_SAMPLES_PER_FAMILY}</strong>{t(initial.language, 'samples per family', 'muestras por familia')}</span>
            <span><strong>{SITE_AUDIT_MAX_SCANNED_PAGES}</strong>{t(initial.language, 'max scanned pages', 'páginas máximas analizadas')}</span>
          </div>
          <label className="site-extra-urls">
            {t(initial.language, 'Optional extra URLs, one per line', 'URLs extra opcionales, una por línea')}
            <textarea value={extraUrls} onChange={(event) => setExtraUrls(event.currentTarget.value)} rows={4} />
          </label>
          <p className="site-scope-note">{t(
            initial.language,
            'FocusTrace samples representative routes. Dynamic states, authenticated areas and manual WCAG checks still require auditor review.',
            'FocusTrace muestrea rutas representativas. Los estados dinámicos, áreas autenticadas y comprobaciones WCAG manuales siguen requiriendo revisión del auditor.',
          )}</p>
          <button className="site-primary" type="button" onClick={() => void run()}>{runActionLabel(status, initial.language)}</button>
          {error && <p className="site-error-message" role="alert">{error}</p>}
        </section>
      )}

      {running && (
        <section className="site-card site-progress">
          <span className="site-spinner" aria-hidden="true" />
          <div>
            <h2>{runActionLabel(status, initial.language)}</h2>
            <p>{progress.total ? `${progress.completed}/${progress.total}` : ''} {progress.url}</p>
          </div>
          <button type="button" onClick={() => { cancelled.current = true; }}>{t(initial.language, 'Cancel', 'Cancelar')}</button>
        </section>
      )}

      {result && score && (
        <>
          <section className="site-card site-summary">
            <div className="site-report-actions">
              <div>
                <h2>{t(initial.language, 'Site audit report', 'Informe de auditoría de sitio')}</h2>
                <p>{result.origin}</p>
              </div>
              <div>
                <button type="button" onClick={downloadReport}>{t(initial.language, 'Download .txt', 'Descargar .txt')}</button>
                <button type="button" onClick={() => window.print()}>{t(initial.language, 'Print / PDF', 'Imprimir / PDF')}</button>
                <button type="button" onClick={() => { setResult(undefined); setStatus('idle'); }}>{t(initial.language, 'New scan', 'Nuevo análisis')}</button>
              </div>
            </div>
            <div className="site-score-grid">
              <span><strong>{result.discovery.urls.length}</strong>{t(initial.language, 'discovered URLs', 'URLs descubiertas')}</span>
              <span><strong>{result.templates.length}</strong>{t(initial.language, 'route families', 'familias de rutas')}</span>
              <span><strong>{result.scannedPages}</strong>{t(initial.language, 'pages scanned', 'páginas analizadas')}</span>
              <span><strong>{score.fail}</strong>{t(initial.language, 'failures', 'fallos')}</span>
              <span><strong>{score.review}</strong>{t(initial.language, 'reviews', 'revisiones')}</span>
            </div>
            <p>{t(
              initial.language,
              `${result.failedPages} pages could not be audited. Findings are aggregated by representative route family.`,
              `${result.failedPages} páginas no pudieron auditarse. Los hallazgos se agregan por familia de rutas representativa.`,
            )}</p>
          </section>

          <section className="site-template-list" aria-label={t(initial.language, 'Route families', 'Familias de rutas')}>
            {result.templates.map((template) => (
              <details className="site-card site-template" key={template.id}>
                <summary>
                  <span className="template-id">{template.id}</span>
                  <span className="template-title">
                    <strong>{template.label}</strong>
                    <small>{template.discoveredUrls.length} URLs · {template.sampledPages.length} {t(initial.language, 'samples', 'muestras')}</small>
                  </span>
                  <span className={`template-consistency ${template.structurallyConsistent ? 'is-consistent' : ''}`}>
                    {template.structurallyConsistent
                      ? t(initial.language, 'Consistent', 'Consistente')
                      : t(initial.language, 'Variants', 'Variantes')}
                  </span>
                  <span className="template-counts">{template.failures} F · {template.reviews} R</span>
                </summary>
                <div className="template-body">
                  <section>
                    <h3>{t(initial.language, 'Template findings', 'Hallazgos de plantilla')}</h3>
                    <p>{t(
                      initial.language,
                      'Common findings appear across every successful representative sample. Variations appear only in some pages or states.',
                      'Los hallazgos comunes aparecen en todas las muestras representativas válidas. Las variaciones aparecen solo en algunas páginas o estados.',
                    )}</p>
                    {template.findings.length ? (
                      <ul className="template-findings">
                        {template.findings.map((finding) => (
                          <FindingCard
                            key={finding.id}
                            finding={finding}
                            language={initial.language}
                            visual={visuals[finding.id]}
                            captureBusy={captureId === finding.id}
                            captureError={captureErrors[finding.id]}
                            onCapture={() => void captureFinding(finding)}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="site-empty">{t(initial.language, 'No automated findings in the sampled pages.', 'No hay hallazgos automáticos en las páginas muestreadas.')}</p>
                    )}
                  </section>
                  <section className="template-samples">
                    <h3>{t(initial.language, 'Representative samples', 'Muestras representativas')}</h3>
                    <ul>
                      {template.sampledPages.map((page) => (
                        <li key={page.url}>
                          <a href={page.url} target="_blank" rel="noreferrer">{page.url}</a>
                          {page.error && <span className="sample-error">{page.error}</span>}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </details>
            ))}
          </section>

          <footer className="site-card site-footer">
            {t(
              initial.language,
              'Representative automated sampling does not prove complete WCAG conformance. Use the report as evidence and continue with manual and runtime review.',
              'El muestreo automático representativo no demuestra conformidad WCAG completa. Usa el informe como evidencia y continúa con revisión manual y runtime.',
            )}
          </footer>
        </>
      )}
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Site Audit root was not found.');
createRoot(root).render(<SiteAuditApp />);
