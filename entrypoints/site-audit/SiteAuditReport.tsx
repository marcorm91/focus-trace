import { buildSiteAuditTextReport, siteAuditFilename } from '../../lib/site-audit/text-report';
import type {
  SiteAuditDiscoveryReason,
  SiteAuditFindingAggregate,
  SiteAuditResult,
  SiteAuditSampleReason,
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

function discoveryReason(reason: SiteAuditDiscoveryReason, language: AppLanguage): string {
  const labels: Record<SiteAuditDiscoveryReason, [string, string]> = {
    root: ['audit root', 'raíz de auditoría'],
    sitemap: ['sitemap', 'sitemap'],
    'internal-link': ['internal link', 'enlace interno'],
    'manual-selection': ['manual selection', 'selección manual'],
    'current-session': ['current-session route', 'ruta de sesión actual'],
    duplicate: ['canonical duplicate', 'duplicada tras canonicalización'],
    'excluded-path': ['excluded path', 'ruta excluida'],
    'safety-limit': ['safety limit', 'límite de seguridad'],
  };
  const label = labels[reason];
  return language === 'es' ? label[1] : label[0];
}

function sampleReason(reason: SiteAuditSampleReason | undefined, language: AppLanguage): string | undefined {
  if (!reason) return undefined;
  const labels: Record<SiteAuditSampleReason, [string, string]> = {
    'family-first': ['first representative for this route family', 'primera representante de esta familia de ruta'],
    'family-spread': ['spread across this route family', 'distribuida dentro de esta familia de ruta'],
    'manual-selection': ['explicitly selected', 'seleccionada explícitamente'],
    'current-session': ['explicit private route using the current browser session', 'ruta privada explícita usando la sesión actual del navegador'],
  };
  const label = labels[reason];
  return language === 'es' ? label[1] : label[0];
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
  const sessionScope = result.discovery.source === 'session';
  const selectedScope = manualScope || sessionScope;
  const includedDecisions = result.discovery.decisions?.filter((decision) => decision.status === 'included') ?? [];
  const excludedDecisions = result.discovery.decisions?.filter((decision) => decision.status === 'excluded') ?? [];
  const inclusionCounts = new Map<SiteAuditDiscoveryReason, number>();
  for (const decision of includedDecisions) inclusionCounts.set(decision.reason, (inclusionCounts.get(decision.reason) ?? 0) + 1);
  const canonicalAliases = result.pages.filter((page) => {
    const canonical = page.structure?.canonical;
    if (!canonical) return false;
    try {
      return new URL(canonical, page.url).toString() !== page.url;
    } catch {
      return false;
    }
  });

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
          <span><strong>{result.discovery.urls.length}</strong>{selectedScope ? tr(language, 'URLs selected', 'URLs seleccionadas') : tr(language, 'URLs discovered', 'URLs descubiertas')}</span>
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
          : sessionScope
            ? tr(language, 'Scope source: explicit private routes opened with the current browser session. No credentials are stored.', 'Origen del alcance: rutas privadas explícitas abiertas con la sesión actual del navegador. No se guardan credenciales.')
            : tr(language, `Discovery source: ${result.discovery.source}.`, `Origen del descubrimiento: ${result.discovery.source}.`)} {result.discovery.truncated && tr(
            language,
            selectedScope ? 'The selected URL list hit the configured safety limit.' : 'URL discovery hit the configured safety limit.',
            selectedScope ? 'La lista de URLs seleccionadas alcanzó el límite de seguridad configurado.' : 'El descubrimiento de URLs alcanzó el límite de seguridad configurado.',
          )}</p>
        {result.discovery.scope && (
          <p>{tr(
            language,
            `Scope configuration: ${result.discovery.scope.maxDiscoveredUrls} discovered max · ${result.discovery.scope.maxScannedPages} scanned max · ${result.discovery.scope.samplesPerFamily} samples/family · ${result.discovery.scope.exclusionPrefixes.length} exclusions.`,
            `Configuración del alcance: ${result.discovery.scope.maxDiscoveredUrls} descubiertas máx. · ${result.discovery.scope.maxScannedPages} analizadas máx. · ${result.discovery.scope.samplesPerFamily} muestras/familia · ${result.discovery.scope.exclusionPrefixes.length} exclusiones.`,
          )}</p>
        )}
      </section>

      {(includedDecisions.length > 0 || excludedDecisions.length > 0) && (
        <section className="site-card site-summary" aria-label={tr(language, 'Discovery decisions', 'Decisiones de descubrimiento')}>
          <h2>{tr(language, 'Why pages were included or excluded', 'Por qué se incluyeron o excluyeron páginas')}</h2>
          <p>{tr(
            language,
            'FocusTrace keeps bounded, display-safe discovery evidence. Query values and credential-like parameters are not retained in these decisions.',
            'FocusTrace conserva evidencia de descubrimiento acotada y segura para mostrar. Los valores de query y parámetros similares a credenciales no se conservan en estas decisiones.',
          )}</p>
          {inclusionCounts.size > 0 && (
            <ul>
              {[...inclusionCounts.entries()].map(([reason, count]) => (
                <li key={reason}><strong>{count}</strong> {discoveryReason(reason, language)}</li>
              ))}
            </ul>
          )}
          {excludedDecisions.length > 0 && (
            <details>
              <summary>{excludedDecisions.length} {tr(language, 'excluded discovery candidates', 'candidatas de descubrimiento excluidas')}</summary>
              <ul>
                {excludedDecisions.slice(0, 30).map((decision, index) => (
                  <li key={`${decision.reason}-${decision.url}-${index}`}><code>{decision.url}</code> — {discoveryReason(decision.reason, language)}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {result.comparison && (
        <section className="site-card site-summary" aria-label={tr(language, 'Baseline comparison', 'Comparación con baseline')}>
          <h2>{tr(language, 'Changes since the previous Site Audit', 'Cambios desde el Site Audit anterior')}</h2>
          {result.comparison.compatible ? (
            <>
              <div className="site-score-grid">
                <span><strong>{result.comparison.newCount}</strong>{tr(language, 'new', 'nuevos')}</span>
                <span><strong>{result.comparison.changedCount}</strong>{tr(language, 'changed', 'cambiados')}</span>
                <span><strong>{result.comparison.resolvedCount}</strong>{tr(language, 'resolved', 'resueltos')}</span>
                <span><strong>{result.comparison.persistentCount}</strong>{tr(language, 'persistent', 'persistentes')}</span>
              </div>
              {(result.comparison.newCount + result.comparison.changedCount + result.comparison.resolvedCount) > 0 && (
                <ul>
                  {result.comparison.findings
                    .filter((finding) => finding.state !== 'persistent')
                    .slice(0, 30)
                    .map((finding) => (
                      <li key={`${finding.state}-${finding.key}`}>
                        <strong>{finding.state.toUpperCase()}</strong> · <code>{finding.ruleId}</code> · {finding.routePattern} · {finding.title}
                      </li>
                    ))}
                </ul>
              )}
            </>
          ) : (
            <p>{tr(
              language,
              'A previous baseline exists, but its audit scope is different. FocusTrace starts a new comparison baseline instead of claiming missing findings were resolved.',
              'Existe un baseline anterior, pero su alcance de auditoría es distinto. FocusTrace inicia un nuevo baseline de comparación en lugar de afirmar que los hallazgos ausentes se han resuelto.',
            )}</p>
          )}
        </section>
      )}

      {canonicalAliases.length > 0 && (
        <section className="site-card site-summary">
          <h2>{tr(language, 'Observed canonical aliases', 'Alias canonical observados')}</h2>
          <p>{tr(
            language,
            'These sampled pages declared a different canonical target. FocusTrace keeps the scan evidence but surfaces the relationship so duplicate/template interpretation is explicit.',
            'Estas páginas muestreadas declararon un destino canonical distinto. FocusTrace conserva la evidencia del análisis pero muestra la relación para que la interpretación de duplicados/plantillas sea explícita.',
          )}</p>
          <ul>{canonicalAliases.slice(0, 20).map((page) => <li key={page.url}><code>{page.url}</code> → <code>{page.structure?.canonical}</code></li>)}</ul>
        </section>
      )}

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
                  <h3>{selectedScope ? tr(language, 'Selected pages', 'Páginas seleccionadas') : tr(language, 'Representative pages', 'Páginas representativas')}</h3>
                  <ul>{template.sampledPages.map((page) => (
                    <li key={page.url}>
                      <a href={page.url} target="_blank" rel="noreferrer">{page.url}</a>
                      {sampleReason(page.selectionReason, language) && <small>{sampleReason(page.selectionReason, language)}</small>}
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
        sessionScope
          ? 'Current-session mode reuses the browser session only while scanning the explicitly selected routes. FocusTrace does not persist credentials, cookies, session tokens or private URLs in Site Audit baseline history.'
          : manualScope
            ? 'Manual URL mode scans every selected page up to the configured safety limit and still groups results by route family. Runtime states and manual WCAG review still require targeted testing.'
            : 'Template grouping is representative sampling, not proof that every URL is identical. Discovery/sampling decisions are shown above; runtime states and manual WCAG review still require targeted testing.',
        sessionScope
          ? 'El modo de sesión actual reutiliza la sesión del navegador solo mientras analiza las rutas seleccionadas explícitamente. FocusTrace no persiste credenciales, cookies, tokens de sesión ni URLs privadas en el historial de baseline de Site Audit.'
          : manualScope
            ? 'El modo de URLs manuales analiza cada página seleccionada hasta el límite de seguridad configurado y mantiene la agrupación por familias de ruta. Los estados runtime y la revisión WCAG manual siguen requiriendo pruebas específicas.'
            : 'La agrupación por plantillas utiliza muestreo representativo; no demuestra que todas las URLs sean idénticas. Las decisiones de descubrimiento/muestreo se muestran arriba; los estados runtime y la revisión WCAG manual siguen requiriendo pruebas específicas.',
      )}</footer>
    </>
  );
}
