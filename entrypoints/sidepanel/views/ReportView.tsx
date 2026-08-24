import type { ExplanationLevel } from '../../../lib/runtime/explanations';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { ScanResult } from '../../../shared/types';
import { Metric } from '../components/Common';

export function ReportView({
  runtimeCount,
  interactionCount,
  runtimeFindings,
  causalFindings,
  breakpointHits,
  focusPoints,
  graphSignals,
  serious,
  runtimeWarnings,
  scan,
  level,
  language,
}: {
  runtimeCount: number;
  interactionCount: number;
  runtimeFindings: number;
  causalFindings: number;
  breakpointHits: number;
  focusPoints: number;
  graphSignals: number;
  serious: number;
  runtimeWarnings: number;
  scan?: ScanResult | undefined;
  level: ExplanationLevel;
  language: AppLanguage;
}) {
  return (
    <section className="panel" aria-labelledby="report-title">
      <div className="section-heading">
        <div>
          <h2 id="report-title">{tr(language, 'Session report', 'Informe de sesión')}</h2>
          <p>{tr(language, 'Local summary for the current tab.', 'Resumen local de la pestaña actual.')}</p>
        </div>
      </div>
      <div className="metrics">
        <Metric label={tr(language, 'Interactions', 'Interacciones')} value={interactionCount} />
        <Metric label={tr(language, 'Focus points', 'Puntos de foco')} value={focusPoints} />
        <Metric label={tr(language, 'Runtime findings', 'Hallazgos runtime')} value={runtimeFindings} />
        <Metric label={tr(language, 'Focus graph signals', 'Señales del grafo de foco')} value={graphSignals} />
        <Metric label={tr(language, 'Breakpoint hits', 'Breakpoints activados')} value={breakpointHits} />
        {level === 'developer' && <Metric label={tr(language, 'Runtime events', 'Eventos runtime')} value={runtimeCount} />}
        {level !== 'simple' && <Metric label={tr(language, 'Causal findings', 'Hallazgos causales')} value={causalFindings} />}
        {level !== 'simple' && <Metric label={tr(language, 'Serious', 'Graves')} value={serious} />}
        {level !== 'simple' && <Metric label={tr(language, 'Runtime warnings', 'Avisos runtime')} value={runtimeWarnings} />}
        <Metric label={tr(language, 'Scan failures', 'Fallos de análisis')} value={scan?.issues.length ?? 0} />
        <Metric label={tr(language, 'Needs review', 'Requiere revisión')} value={scan?.review.length ?? 0} />
        <Metric label={tr(language, 'Authoring warnings', 'Avisos de autoría')} value={scan?.warnings?.length ?? 0} />
      </div>
      <div className="notice">
        <strong>{tr(language, 'Evidence first', 'La evidencia primero')}</strong>
        <p>
          {tr(
            language,
            'FocusTrace separates automated failures, items that need human review, standards warnings and runtime observations. Passing automated checks never proves full WCAG conformance.',
            'FocusTrace separa fallos automáticos, elementos que requieren revisión humana, avisos de estándares y observaciones en tiempo de ejecución. Superar las comprobaciones automáticas nunca demuestra por sí solo el cumplimiento completo de WCAG.',
          )}
        </p>
      </div>
      <div className="notice">
        <strong>{tr(language, 'Privacy first', 'La privacidad primero')}</strong>
        <p>
          {tr(
            language,
            'FocusTrace analyzes the inspected page locally. No DOM, screenshots or session data are sent to a FocusTrace server or AI API.',
            'FocusTrace analiza localmente la página inspeccionada. No se envían DOM, capturas ni datos de sesión a un servidor de FocusTrace ni a una API de IA.',
          )}
        </p>
      </div>
    </section>
  );
}
