import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from '#imports';
import { buildSiteAuditTemplates } from '../../lib/site-audit/aggregate';
import { discoverSiteUrls, normalizeDiscoveredUrl } from '../../lib/site-audit/discovery';
import {
  SITE_AUDIT_MAX_DISCOVERED_URLS,
  SITE_AUDIT_MAX_SCANNED_PAGES,
  SITE_AUDIT_SAMPLES_PER_FAMILY,
  type SiteAuditResult,
  type SiteAuditStatus,
} from '../../lib/site-audit/model';
import { buildRouteFamilies, selectSiteAuditSamples } from '../../lib/site-audit/routes';
import { scanRepresentativePage, sourcePageLinks } from '../../lib/site-audit/runner';
import { buildSiteAuditTextReport, siteAuditFilename } from '../../lib/site-audit/text-report';
import type { AppLanguage } from '../../shared/i18n';
import './style.css';

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
        'Site Audit needs access to this site so FocusTrace can discover and scan representative pages.',
        'Site Audit necesita acceso a este sitio para que FocusTrace pueda descubrir y analizar páginas representativas.',
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
        setError(reason instanceof Error ? reason.message : String(reason));
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
            'FocusTrace discovers same-origin URLs, groups repeated route families and runs the real page scanner on representative samples.',
            'FocusTrace descubre URLs del mismo origen, agrupa familias de rutas repetidas y ejecuta el scanner real sobre muestras representativas.',
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
        <p>{t(language, `Discovery source: ${result.discovery.source}.`, `Origen del descubrimiento: ${result.discovery.source}.`)} {result.discovery.truncated && t(language, 'URL discovery hit the safety limit.', 'El descubrimiento alcanzó el límite de seguridad.')}</p>
      </section>

      <section className="site-template-list" aria-label={t(language, 'Detected route families', 'Familias de ruta detectadas')}>
        {result.templates.map((template) => {
          const successful = template.sampledPages.filter((page) => page.scan);
          const fingerprints = new Set(successful.flatMap((page) => page.structure?.fingerprint ? [page.structure.fingerprint] : []));
          const common = template.findings.filter((finding) => finding.commonToTemplate);
          const variants = template.findings.filter((finding) => !finding.commonToTemplate);
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
                      : `${fingerprints.size} ${t(language, 'structural variants', 'variantes estructurales')}`}
                </span>
                <span className="template-counts">🔴 {template.failures} · 🟠 {template.reviews} · ⚠ {template.warnings}</span>
              </summary>

              <div className="template-body">
                {common.length > 0 && (
                  <section>
                    <h3>{t(language, 'Common to the template samples', 'Común a las muestras de la plantilla')}</h3>
                    <p>{t(language, 'These signals appeared on every successfully scanned sample in this family.', 'Estas señales aparecieron en todas las muestras analizadas correctamente de esta familia.')}</p>
                    <ul className="template-findings">
                      {common.map((finding) => <FindingRow key={finding.key} finding={finding} language={language} />)}
                    </ul>
                  </section>
                )}

                {variants.length > 0 && (
                  <section>
                    <h3>{t(language, 'Variations / page-specific signals', 'Variaciones / señales específicas')}</h3>
                    <ul className="template-findings">
                      {variants.map((finding) => <FindingRow key={finding.key} finding={finding} language={language} />)}
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

function FindingRow({ finding, language }: { finding: SiteAuditResult['templates'][number]['findings'][number]; language: AppLanguage }) {
  const reference = finding.references[0];
  return (
    <li className={`site-finding outcome-${finding.outcome}`}>
      <span>{finding.outcome.toUpperCase()}</span>
      <div>
        <strong>{finding.title}</strong>
        <small>{finding.ruleId} · {finding.sampleCount}/{finding.totalSamples} {t(language, 'samples', 'muestras')}</small>
        {reference && <a href={reference.url} target="_blank" rel="noreferrer">{reference.type} {reference.id}{reference.level ? ` (${reference.level})` : ''}</a>}
      </div>
    </li>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
