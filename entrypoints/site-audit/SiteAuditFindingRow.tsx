import { useState } from 'react';
import {
  componentContextLabel,
  componentPrimaryLabel,
  componentTypeLabel,
} from '../../lib/report/component-identity';
import type {
  SiteAuditFindingAggregate,
  SiteAuditResult,
} from '../../lib/site-audit/model';
import { remediationForIssue } from '../../lib/site-audit/remediation';
import { captureSiteAuditFindingVisual } from '../../lib/site-audit/visual-evidence';
import {
  localizedScanIssue,
  localizedSeverity,
  tr,
  type AppLanguage,
} from '../../shared/i18n';
import type { FindingOutcome } from '../../shared/types';

function outcomeText(outcome: FindingOutcome, language: AppLanguage): string {
  if (outcome === 'fail') return tr(language, 'FAILURE', 'FALLO');
  if (outcome === 'review') return tr(language, 'REVIEW', 'REVISIÓN');
  return tr(language, 'WARNING', 'AVISO');
}

export function SiteAuditFindingRow({
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

          {issue.references.length > 0 && (
            <section className="finding-references">
              <small>{tr(language, 'Standards references', 'Referencias normativas')}</small>
              <ul>{issue.references.map((reference) => (
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
