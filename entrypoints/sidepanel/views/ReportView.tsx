import type { ExplanationLevel } from '../../../lib/runtime/explanations';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { RuntimeEvent, ScanResult } from '../../../shared/types';
import { Metric } from '../components/Common';

function timeLabel(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function latestFocusWalkReport(events: RuntimeEvent[]) {
  let startIndex = -1;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.kind === 'focus-walk-start') {
      startIndex = index;
      break;
    }
  }
  if (startIndex < 0) return undefined;

  const endIndex = events.findIndex((event, index) => index > startIndex && event.kind === 'focus-walk-end');
  const reportEvents = events.slice(startIndex, endIndex >= 0 ? endIndex + 1 : undefined);
  const started = events[startIndex];
  const ended = endIndex >= 0 ? events[endIndex] : undefined;
  const focusEvents = reportEvents.filter((event) => event.kind === 'focus' && event.element);
  const findings = reportEvents.filter((event) => event.outcome);
  const summary = ended?.focusWalk ?? started?.focusWalk;

  if (!summary) return undefined;
  return { started, ended, focusEvents, findings, summary };
}

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
  events,
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
  events: RuntimeEvent[];
  scan?: ScanResult | undefined;
  level: ExplanationLevel;
  language: AppLanguage;
}) {
  const focusWalk = latestFocusWalkReport(events);

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

      {focusWalk && (
        <section className="notice" aria-labelledby="focus-walk-report-title">
          <div className="section-heading">
            <div>
              <h2 id="focus-walk-report-title">
                {tr(language, 'Automatic focus report', 'Informe automático de foco')}
              </h2>
              <p>
                {focusWalk.ended
                  ? tr(
                      language,
                      `Completed at ${timeLabel(focusWalk.ended.timestamp)}`,
                      `Completado a las ${timeLabel(focusWalk.ended.timestamp)}`,
                    )
                  : tr(language, 'Simulation still has no closing event.', 'La simulación todavía no tiene evento de cierre.')}
              </p>
            </div>
          </div>

          <div className="metrics">
            <Metric label={tr(language, 'Candidates', 'Candidatos')} value={focusWalk.summary.totalCandidates} />
            <Metric label={tr(language, 'Reached focus', 'Focos alcanzados')} value={focusWalk.summary.focusedSteps} />
            <Metric label={tr(language, 'Skipped', 'Omitidos')} value={focusWalk.summary.skipped} />
            <Metric label={tr(language, 'Findings', 'Hallazgos')} value={focusWalk.findings.length} />
          </div>

          <p>
            {focusWalk.summary.stopped
              ? tr(
                  language,
                  'The automatic walk stopped before finishing. Review the captured steps and rerun it if the page changed during simulation.',
                  'El recorrido automático se detuvo antes de terminar. Revisa los pasos capturados y repítelo si la página cambió durante la simulación.',
                )
              : tr(
                  language,
                  'FocusTrace moved through the computed keyboard order and recorded each focus event as evidence for this report.',
                  'FocusTrace recorrió el orden de teclado calculado y registró cada evento de foco como evidencia para este informe.',
                )}
          </p>

          {focusWalk.focusEvents.length > 0 && (
            <div className="issue-list">
              {focusWalk.focusEvents.map((event, index) => {
                if (!event.element) return null;
                return (
                  <article className="focus-card" key={event.id}>
                    <div className="finding-meta">
                      <span className="severity info">#{index + 1}</span>
                      <span className="severity info">{event.element.role ?? event.element.tag}</span>
                      <time>{timeLabel(event.timestamp)}</time>
                    </div>
                    <h3>{event.element.name || event.title.replace(/^Focus → /, '')}</h3>
                    {level !== 'simple' && event.detail && <p>{event.detail}</p>}
                    {level === 'developer' && <code>{event.element.selector}</code>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

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
