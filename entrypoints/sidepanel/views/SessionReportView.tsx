import { buildSessionSuggestions } from '../../../lib/report/session-report';
import { localizedScanIssue, tr, type AppLanguage } from '../../../shared/i18n';
import type { HeadingSignal, RuntimeEvent, ScanIssue, ScanResult } from '../../../shared/types';

function headingSignalLabel(signal: HeadingSignal, language: AppLanguage): string {
  if (signal === 'empty') return tr(language, 'Empty', 'Vacío');
  if (signal === 'level-jump') return tr(language, 'Level jump', 'Salto de nivel');
  return tr(language, 'Multiple H1', 'Varios H1');
}

function findingGroup(
  scan: ScanResult,
): Array<{ id: string; label: string; tone: string; issues: ScanIssue[] }> {
  return [
    { id: 'fail', label: 'Fallos', tone: 'fail', issues: scan.issues },
    { id: 'review', label: 'Revisar', tone: 'review', issues: scan.review },
    { id: 'warning', label: 'Avisos', tone: 'warning', issues: scan.warnings ?? [] },
  ];
}

export function SessionReportView({
  scan,
  events,
  language,
  onLocate,
}: {
  scan?: ScanResult | undefined;
  events: RuntimeEvent[];
  language: AppLanguage;
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const headings = scan?.headings ?? [];
  const focusEvents = events.filter((event) => event.kind === 'focus' && event.element);
  const focusFindings = events.filter((event) => event.outcome);
  const walkStart = events.find((event) => event.kind === 'focus-walk-start');
  const walkEnd = [...events].reverse().find((event) => event.kind === 'focus-walk-end');
  const automatic = Boolean(walkStart);
  const suggestions = buildSessionSuggestions(scan, events, language);
  const uniqueFocusTargets = new Map<string, { event: RuntimeEvent; orders: number[] }>();
  focusEvents.forEach((event, index) => {
    const selector = event.element!.selector;
    const existing = uniqueFocusTargets.get(selector);
    if (existing) existing.orders.push(index + 1);
    else uniqueFocusTargets.set(selector, { event, orders: [index + 1] });
  });

  return (
    <section className="panel session-report" aria-labelledby="session-report-title">
      <div className="section-heading">
        <div>
          <h2 id="session-report-title">{tr(language, 'Complete page report', 'Informe completo de página')}</h2>
          <p>
            {scan
              ? tr(language, 'Combined evidence from this page session.', 'Evidencia combinada de la sesión de esta página.')
              : tr(language, 'Analyze the page to start the report.', 'Analiza la página para iniciar el informe.')}
          </p>
        </div>
      </div>

      <div className="report-coverage">
        <div>
          <span>{tr(language, 'Analysis', 'Análisis')}</span>
          <strong>{scan ? tr(language, 'Completed', 'Completado') : tr(language, 'Not run', 'No realizado')}</strong>
          <small>{scan ? `${scan.issues.length + scan.review.length + (scan.warnings?.length ?? 0)} ${tr(language, 'findings', 'hallazgos')}` : '—'}</small>
        </div>
        <div>
          <span>{tr(language, 'Focus', 'Foco')}</span>
          <strong>
            {focusEvents.length
              ? automatic
                ? tr(language, 'Automatic', 'Automático')
                : tr(language, 'Manual', 'Manual')
              : tr(language, 'Not run', 'No realizado')}
          </strong>
          <small>{focusEvents.length ? `${focusEvents.length} ${tr(language, 'steps', 'pasos')}` : '—'}</small>
        </div>
        <div>
          <span>{tr(language, 'Headings', 'Encabezados')}</span>
          <strong>{scan ? tr(language, 'Completed', 'Completado') : tr(language, 'Not run', 'No realizado')}</strong>
          <small>{scan ? `${headings.length} ${tr(language, 'nodes', 'nodos')}` : '—'}</small>
        </div>
      </div>

      {!scan ? (
        <div className="notice">
          <strong>{tr(language, 'No analysis data yet', 'Todavía no hay datos de análisis')}</strong>
          <p>{tr(language, 'Run Analyze this page to generate the complete report.', 'Pulsa Analizar esta página para generar el informe completo.')}</p>
        </div>
      ) : (
        <>
          <section className="report-section" aria-labelledby="report-analysis-title">
            <div className="report-section-heading">
              <div>
                <span>1</span>
                <div>
                  <h3 id="report-analysis-title">{tr(language, 'Automated analysis', 'Análisis automático')}</h3>
                  <p>{scan.engine} · {scan.standard} · {scan.rulesRun} {tr(language, 'rule families', 'familias de reglas')}</p>
                </div>
              </div>
            </div>

            {findingGroup(scan).map((group) => (
              <details className="report-group" key={group.id} open={group.id === 'fail' && group.issues.length > 0}>
                <summary>
                  <span>{group.label}</span>
                  <strong>{group.issues.length}</strong>
                </summary>
                {group.issues.length ? (
                  <div className="report-finding-list">
                    {group.issues.map((issue) => {
                      const copy = localizedScanIssue(issue, language);
                      const target = issue.targets[0];
                      return (
                        <article className="report-finding" key={issue.id}>
                          <div>
                            <span className={`outcome ${group.tone}`}>{group.label}</span>
                            <code>{issue.ruleId}</code>
                          </div>
                          <h4>{copy.title}</h4>
                          <p>{copy.description}</p>
                          {copy.evidence && <p className="evidence">{copy.evidence}</p>}
                          {target && (
                            <button type="button" onClick={() => void onLocate(target)}>
                              {tr(language, 'Review on page', 'Revisar en la página')}
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="report-empty-line">{tr(language, 'No findings in this group.', 'No hay hallazgos en este grupo.')}</p>
                )}
              </details>
            ))}
          </section>

          <section className="report-section" aria-labelledby="report-focus-title">
            <div className="report-section-heading">
              <div>
                <span>2</span>
                <div>
                  <h3 id="report-focus-title">{tr(language, 'Keyboard focus journey', 'Recorrido de foco por teclado')}</h3>
                  <p>
                    {focusEvents.length
                      ? automatic
                        ? tr(language, 'Automatic Tab simulation included.', 'Simulación automática con Tab incluida.')
                        : tr(language, 'Manual keyboard recording included.', 'Grabación manual de teclado incluida.')
                      : tr(language, 'No focus journey was performed.', 'No se ha realizado ningún recorrido de foco.')}
                  </p>
                </div>
              </div>
            </div>

            {focusEvents.length ? (
              <>
                <div className="report-inline-summary">
                  <span><strong>{focusEvents.length}</strong> {tr(language, 'steps', 'pasos')}</span>
                  <span><strong>{uniqueFocusTargets.size}</strong> {tr(language, 'components', 'componentes')}</span>
                  <span><strong>{focusFindings.length}</strong> {tr(language, 'findings', 'hallazgos')}</span>
                  {walkEnd?.focusWalk && <span><strong>{walkEnd.focusWalk.skipped}</strong> {tr(language, 'skipped', 'omitidos')}</span>}
                </div>
                <ol className="report-focus-list">
                  {[...uniqueFocusTargets.values()].map(({ event, orders }) => (
                    <li key={event.element!.selector}>
                      <button type="button" onClick={() => void onLocate(event.element!.selector)}>
                        <span>{orders.join(' · ')}</span>
                        <strong>{event.element!.name || tr(language, 'Unnamed component', 'Componente sin nombre')}</strong>
                        <small>{event.element!.role ?? event.element!.tag}</small>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="report-pending">
                <strong>{tr(language, 'Focus coverage pending', 'Cobertura de foco pendiente')}</strong>
                <p>{tr(language, 'Use manual recording or Walk with Tab; this section will update automatically.', 'Utiliza la grabación manual o Recorrer con Tab; esta sección se actualizará automáticamente.')}</p>
              </div>
            )}
          </section>

          <section className="report-section" aria-labelledby="report-headings-title">
            <div className="report-section-heading">
              <div>
                <span>3</span>
                <div>
                  <h3 id="report-headings-title">{tr(language, 'Heading structure', 'Estructura de encabezados')}</h3>
                  <p>{tr(language, 'Visible H1-H6 elements in DOM order.', 'Elementos H1–H6 visibles en orden DOM.')}</p>
                </div>
              </div>
            </div>

            {headings.length ? (
              <ol className="report-heading-list">
                {headings.map((heading) => (
                  <li className={heading.signals.length ? 'has-signal' : ''} key={heading.id} style={{ marginInlineStart: `${(heading.level - 1) * 12}px` }}>
                    <button type="button" onClick={() => void onLocate(heading.selector)}>
                      <span>H{heading.level}</span>
                      <strong>{heading.text || tr(language, 'Empty heading', 'Encabezado vacío')}</strong>
                      {heading.signals.length > 0 && <small>{heading.signals.map((signal) => headingSignalLabel(signal, language)).join(' · ')}</small>}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="report-empty-line">{tr(language, 'No visible headings were found.', 'No se han encontrado encabezados visibles.')}</p>
            )}
          </section>

          <section className="report-section report-recommendations" aria-labelledby="report-suggestions-title">
            <div className="report-section-heading">
              <div>
                <span>4</span>
                <div>
                  <h3 id="report-suggestions-title">{tr(language, 'Recommended next steps', 'Sugerencias de mejora')}</h3>
                  <p>{tr(language, 'Prioritized from the evidence collected in this session.', 'Priorizadas a partir de la evidencia recogida en esta sesión.')}</p>
                </div>
              </div>
            </div>

            {suggestions.length ? (
              <ol className="suggestion-list">
                {suggestions.map((suggestion) => (
                  <li className={`priority-${suggestion.priority}`} key={suggestion.id}>
                    <div>
                      <span>{suggestion.priority === 'high' ? tr(language, 'High', 'Alta') : suggestion.priority === 'medium' ? tr(language, 'Medium', 'Media') : tr(language, 'Coverage', 'Cobertura')}</span>
                      <small>{suggestion.source}</small>
                    </div>
                    <strong>{suggestion.title}</strong>
                    <p>{suggestion.detail}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="notice">
                <strong>{tr(language, 'No immediate suggestions', 'Sin sugerencias inmediatas')}</strong>
                <p>{tr(language, 'No automated or structural signals were detected. Manual WCAG review is still required.', 'No se han detectado señales automáticas o estructurales. Sigue siendo necesaria una revisión WCAG manual.')}</p>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
