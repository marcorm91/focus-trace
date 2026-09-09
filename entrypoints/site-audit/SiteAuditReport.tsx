import { buildSiteAuditTextReport, siteAuditFilename } from '../../lib/site-audit/text-report';
import type {
  SiteAuditFindingAggregate,
  SiteAuditResult,
} from '../../lib/site-audit/model';
import { localizedSeverity, tr, type AppLanguage } from '../../shared/i18n';
import { countBySeverity, severityRank } from '../../shared/severity';
import type { Severity } from '../../shared/types';
import { SiteAuditFindingRow } from './SiteAuditFindingRow';

const DISPLAY_SEVERITIES: Severity[] = ['critical', 'serious', 'moderate', 'minor'];

function sortFindingAggregates(findings: SiteAuditFindingAggregate[]): SiteAuditFindingAggregate[] {
  return [...findings].sort(
    (left, right) => severityRank(right.exampleIssue.severity) - severityRank(left.exampleIssue.severity),
  );
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

export function SiteAuditReport({ result, language, onRunAgain }: { result: SiteAuditResult; language: AppLanguage; onRunAgain: () => void }) {
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
                        <SiteAuditFindingRow
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
                        <SiteAuditFindingRow
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
