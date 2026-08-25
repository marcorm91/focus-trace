import {
  outcomeLabel,
  type ExplanationLevel,
} from '../../../lib/runtime/explanations';
import {
  localizedScanIssue,
  localizedSeverity,
  tr,
  type AppLanguage,
} from '../../../shared/i18n';
import type { ElementSnapshot, RuntimeEvent, ScanIssue, ScanResult } from '../../../shared/types';
import { Metric, ReferenceList } from '../components/Common';

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
  return { started, ended, focusEvents, findings, reportEvents, summary };
}

function isNativeInteractive(element: ElementSnapshot) {
  return ['button', 'input', 'select', 'textarea', 'summary'].includes(element.tag) ||
    (element.tag === 'a' && Boolean(element.attributes?.href));
}

function componentLabel(element: ElementSnapshot, language: AppLanguage) {
  const role = element.role?.toLowerCase();
  const tag = element.tag.toLowerCase();
  if (role === 'button' || tag === 'button') return tr(language, 'Button', 'Botón');
  if (role === 'link' || tag === 'a') return tr(language, 'Link', 'Enlace');
  if (tag === 'input') {
    const type = element.attributes?.type ? ` ${element.attributes.type}` : '';
    return tr(language, `Input${type}`, `Campo${type}`);
  }
  if (tag === 'select') return tr(language, 'Select', 'Selector');
  if (tag === 'textarea') return tr(language, 'Textarea', 'Área de texto');
  if (tag === 'summary') return tr(language, 'Disclosure trigger', 'Control desplegable');
  if (role) return tr(language, `Custom ${role}`, `Componente custom ${role}`);
  if (element.attributes?.tabIndex != null) return tr(language, 'Custom focusable element', 'Elemento focusable custom');
  return tr(language, 'Focusable component', 'Componente focusable');
}

function nameSourceLabel(element: ElementSnapshot, language: AppLanguage) {
  if (element.attributes?.ariaLabel) return tr(language, 'aria-label', 'aria-label');
  if (element.attributes?.ariaLabelledby) return tr(language, 'aria-labelledby', 'aria-labelledby');
  if (element.name) return tr(language, 'visible text or native label', 'texto visible o etiqueta nativa');
  return tr(language, 'missing', 'ausente');
}

function targetMatchesSelector(target: string, selector: string, element: ElementSnapshot) {
  if (target === selector) return true;
  if (target.startsWith(`${selector} `) || target.startsWith(`${selector} >`)) return true;
  if (selector.startsWith(`${target} `) || selector.startsWith(`${target} >`)) return true;
  return Boolean(element.id && target.includes(`#${element.id}`));
}

function scanIssuesForElement(scan: ScanResult | undefined, element: ElementSnapshot): ScanIssue[] {
  if (!scan) return [];
  const all = [...scan.issues, ...scan.review, ...(scan.warnings ?? [])];
  return all.filter((issue) => issue.targets.some((target) => targetMatchesSelector(target, element.selector, element)));
}

function runtimeIssuesForElement(events: RuntimeEvent[], element: ElementSnapshot): RuntimeEvent[] {
  return events.filter((event) => {
    if (!event.outcome || !event.element) return false;
    return targetMatchesSelector(event.element.selector, element.selector, element);
  });
}

function componentSignals({
  element,
  focusIndex,
  focusEvents,
  scanIssues,
  runtimeIssues,
  language,
}: {
  element: ElementSnapshot;
  focusIndex: number;
  focusEvents: RuntimeEvent[];
  scanIssues: ScanIssue[];
  runtimeIssues: RuntimeEvent[];
  language: AppLanguage;
}) {
  const signals: Array<{ tone: 'info' | 'moderate' | 'serious'; title: string; detail: string }> = [];
  const role = element.role?.toLowerCase();
  const nativeInteractive = isNativeInteractive(element);
  const hasInteractiveRole = ['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem'].includes(role ?? '');
  const repeated = focusEvents.findIndex((event) => event.element?.selector === element.selector) !== focusIndex;
  const nameSource = nameSourceLabel(element, language);

  if (element.name) {
    signals.push({
      tone: 'info',
      title: tr(language, 'Accessible name', 'Nombre accesible'),
      detail: tr(
        language,
        `Name "${element.name}" resolved from ${nameSource}.`,
        `Nombre "${element.name}" resuelto desde ${nameSource}.`,
      ),
    });
  } else {
    signals.push({
      tone: 'serious',
      title: tr(language, 'Accessible name missing', 'Nombre accesible ausente'),
      detail: tr(
        language,
        'This focused component has no captured accessible name. Screen reader and voice-control users may not identify it.',
        'Este componente enfocado no tiene nombre accesible capturado. Usuarios de lector de pantalla o control por voz podrían no identificarlo.',
      ),
    });
  }

  if (nativeInteractive) {
    signals.push({
      tone: 'info',
      title: tr(language, 'Native semantics', 'Semántica nativa'),
      detail: tr(
        language,
        `${element.tag} provides native keyboard semantics for this focus target.`,
        `${element.tag} aporta semántica de teclado nativa para este foco.`,
      ),
    });
  } else if (hasInteractiveRole) {
    signals.push({
      tone: 'moderate',
      title: tr(language, 'Custom ARIA control', 'Control ARIA custom'),
      detail: tr(
        language,
        `The component exposes role="${role}". Review keyboard behavior and states because ARIA does not add behavior by itself.`,
        `El componente expone role="${role}". Revisa comportamiento de teclado y estados porque ARIA no añade comportamiento por sí solo.`,
      ),
    });
  } else {
    signals.push({
      tone: 'moderate',
      title: tr(language, 'Focusable custom element', 'Elemento custom focusable'),
      detail: tr(
        language,
        'This element receives focus but is not a native interactive control and no known interactive role was captured.',
        'Este elemento recibe foco pero no es un control interactivo nativo y no se ha capturado un rol interactivo conocido.',
      ),
    });
  }

  if ((element.attributes?.tabIndex ?? 0) > 0) {
    signals.push({
      tone: 'serious',
      title: tr(language, 'Positive tabindex changes order', 'Tabindex positivo altera el orden'),
      detail: tr(
        language,
        `tabindex="${element.attributes?.tabIndex}" forces this component ahead of the natural DOM order. Review the resulting focus sequence.`,
        `tabindex="${element.attributes?.tabIndex}" fuerza este componente por delante del orden natural del DOM. Revisa la secuencia resultante.`,
      ),
    });
  } else if (element.attributes?.tabIndex === 0 && !nativeInteractive) {
    signals.push({
      tone: 'info',
      title: tr(language, 'Programmatic focus entry', 'Entrada de foco programática'),
      detail: tr(
        language,
        'tabindex="0" places this custom element in the natural keyboard order.',
        'tabindex="0" coloca este elemento custom en el orden natural de teclado.',
      ),
    });
  }

  if (repeated) {
    signals.push({
      tone: 'moderate',
      title: tr(language, 'Repeated focus target', 'Destino de foco repetido'),
      detail: tr(
        language,
        'This selector appeared earlier in the automatic walk. Review whether focus is looping or duplicated unexpectedly.',
        'Este selector apareció antes en el recorrido automático. Revisa si el foco está entrando en bucle o duplicado de forma inesperada.',
      ),
    });
  }

  if (scanIssues.length) {
    signals.push({
      tone: scanIssues.some((issue) => issue.outcome === 'fail') ? 'serious' : 'moderate',
      title: tr(language, 'Static analysis overlap', 'Cruce con análisis estático'),
      detail: tr(
        language,
        `${scanIssues.length} scan finding${scanIssues.length === 1 ? '' : 's'} target this focused component or one of its descendants.`,
        `${scanIssues.length} hallazgo${scanIssues.length === 1 ? '' : 's'} del análisis apunta${scanIssues.length === 1 ? '' : 'n'} a este componente enfocado o a alguno de sus descendientes.`,
      ),
    });
  }

  if (runtimeIssues.length) {
    signals.push({
      tone: runtimeIssues.some((event) => ['critical', 'serious'].includes(event.severity)) ? 'serious' : 'moderate',
      title: tr(language, 'Runtime issue overlap', 'Cruce con runtime'),
      detail: tr(
        language,
        `${runtimeIssues.length} runtime finding${runtimeIssues.length === 1 ? '' : 's'} occurred on this focused component during the walk.`,
        `${runtimeIssues.length} hallazgo${runtimeIssues.length === 1 ? '' : 's'} runtime ocurrió${runtimeIssues.length === 1 ? '' : 'n'} sobre este componente enfocado durante el recorrido.`,
      ),
    });
  }

  return signals;
}

function needsReview(signals: Array<{ tone: string }>, scanIssues: ScanIssue[], runtimeIssues: RuntimeEvent[]) {
  return signals.some((signal) => signal.tone !== 'info') || scanIssues.length > 0 || runtimeIssues.length > 0;
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
  onLocate,
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
  onLocate: (selector: string) => void | Promise<void>;
}) {
  const focusWalk = latestFocusWalkReport(events);
  const componentReports = focusWalk?.focusEvents.map((event, index) => {
    const element = event.element!;
    const scanIssues = scanIssuesForElement(scan, element);
    const runtimeIssues = runtimeIssuesForElement(focusWalk.reportEvents, element);
    const signals = componentSignals({
      element,
      focusIndex: index,
      focusEvents: focusWalk.focusEvents,
      scanIssues,
      runtimeIssues,
      language,
    });
    return { event, element, index, runtimeIssues, scanIssues, signals };
  }) ?? [];
  const componentsNeedingReview = componentReports.filter((report) => needsReview(report.signals, report.scanIssues, report.runtimeIssues)).length;
  const orderSignals = componentReports.reduce(
    (total, report) => total + report.signals.filter((signal) => signal.title.includes('tabindex') || signal.title.includes('Tabindex') || signal.title.includes('Repeated') || signal.title.includes('repetido')).length,
    0,
  );
  const staticOverlaps = componentReports.reduce((total, report) => total + report.scanIssues.length, 0);

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
            <Metric label={tr(language, 'Reached focus', 'Focos alcanzados')} value={focusWalk.summary.focusedSteps} />
            <Metric label={tr(language, 'Components reviewed', 'Componentes revisados')} value={componentReports.length} />
            <Metric label={tr(language, 'Components with signals', 'Componentes con señales')} value={componentsNeedingReview} />
            <Metric label={tr(language, 'Static overlaps', 'Cruces estáticos')} value={staticOverlaps} />
            <Metric label={tr(language, 'Order signals', 'Señales de orden')} value={orderSignals} />
            <Metric label={tr(language, 'Skipped', 'Omitidos')} value={focusWalk.summary.skipped} />
          </div>

          <p>
            {tr(
              language,
              'Each card combines focus evidence with static scan findings and focus-order signals for the same component.',
              'Cada tarjeta combina evidencia de foco con hallazgos del análisis estático y señales de orden para el mismo componente.',
            )}
          </p>

          {componentReports.length > 0 && (
            <div className="issue-list">
              {componentReports.map(({ event, element, index, runtimeIssues, scanIssues, signals }) => {
                const review = needsReview(signals, scanIssues, runtimeIssues);
                return (
                  <article className="focus-card" key={event.id}>
                    <div className="finding-meta">
                      <span className="severity info">#{index + 1}</span>
                      <span className="severity info">{componentLabel(element, language)}</span>
                      <span className={`severity ${review ? 'moderate' : 'info'}`}>
                        {review ? tr(language, 'Review', 'Revisar') : 'OK'}
                      </span>
                      <time>{timeLabel(event.timestamp)}</time>
                    </div>
                    <h3>{element.name || tr(language, 'Unnamed focused component', 'Componente enfocado sin nombre')}</h3>
                    <dl>
                      <div><dt>{tr(language, 'Component', 'Componente')}</dt><dd>{componentLabel(element, language)}</dd></div>
                      <div><dt>{tr(language, 'Name source', 'Fuente nombre')}</dt><dd>{nameSourceLabel(element, language)}</dd></div>
                      <div><dt>{tr(language, 'Role', 'Rol')}</dt><dd>{element.role ?? element.tag}</dd></div>
                      <div><dt>{tr(language, 'Linked scan findings', 'Hallazgos vinculados')}</dt><dd>{scanIssues.length}</dd></div>
                      <div><dt>{tr(language, 'Runtime findings', 'Hallazgos runtime')}</dt><dd>{runtimeIssues.length}</dd></div>
                      {level === 'developer' && <div><dt>Selector</dt><dd><code>{element.selector}</code></dd></div>}
                    </dl>

                    <div className="issue-list">
                      {signals.map((signal) => (
                        <p className="cause-line" key={`${event.id}-${signal.title}`}>
                          <span className={`severity ${signal.tone}`}>{signal.tone === 'info' ? 'OK' : tr(language, 'Review', 'Revisar')}</span>{' '}
                          <strong>{signal.title}:</strong> {signal.detail}
                        </p>
                      ))}
                    </div>

                    {scanIssues.length > 0 && (
                      <details className="name-computation" open={level === 'developer'}>
                        <summary>{tr(language, 'Static scan findings on this component', 'Hallazgos estáticos sobre este componente')}</summary>
                        <div className="issue-list">
                          {scanIssues.map((issue) => {
                            const copy = localizedScanIssue(issue, language);
                            return (
                              <article className="issue scan-issue" key={issue.id}>
                                <div className="finding-meta">
                                  <span className={`outcome ${issue.outcome}`}>{outcomeLabel(issue.outcome, level, language)}</span>
                                  {level !== 'simple' && <span className={`severity ${issue.severity}`}>{localizedSeverity(issue.severity, language)}</span>}
                                  {level !== 'simple' && <code>{issue.ruleId}</code>}
                                </div>
                                <h3>{copy.title}</h3>
                                <p>{copy.description}</p>
                                {level !== 'simple' && copy.evidence && (
                                  <p className="evidence"><strong>{tr(language, 'Evidence:', 'Evidencia:')}</strong> {copy.evidence}</p>
                                )}
                                {level === 'developer' && issue.targets.map((target) => <code key={target}>{target}</code>)}
                                {level !== 'simple' && <ReferenceList references={issue.references} language={language} />}
                              </article>
                            );
                          })}
                        </div>
                      </details>
                    )}

                    {runtimeIssues.length > 0 && (
                      <details className="name-computation" open={level === 'developer'}>
                        <summary>{tr(language, 'Runtime findings during focus walk', 'Hallazgos runtime durante el recorrido')}</summary>
                        <div className="issue-list">
                          {runtimeIssues.map((runtimeIssue) => (
                            <article className="issue runtime-finding" key={runtimeIssue.id}>
                              <div className="finding-meta">
                                {runtimeIssue.outcome && <span className={`outcome ${runtimeIssue.outcome}`}>{outcomeLabel(runtimeIssue.outcome, level, language)}</span>}
                                <span className={`severity ${runtimeIssue.severity}`}>{localizedSeverity(runtimeIssue.severity, language)}</span>
                                {runtimeIssue.ruleId && <code>{runtimeIssue.ruleId}</code>}
                              </div>
                              <h3>{runtimeIssue.title}</h3>
                              {runtimeIssue.detail && <p>{runtimeIssue.detail}</p>}
                              {level === 'developer' && runtimeIssue.element && <code>{runtimeIssue.element.selector}</code>}
                              {level !== 'simple' && <ReferenceList references={runtimeIssue.references} language={language} />}
                            </article>
                          ))}
                        </div>
                      </details>
                    )}

                    <button className="focus-path-toggle" type="button" onClick={() => void onLocate(element.selector)}>
                      {tr(language, 'Locate on page', 'Localizar en la página')}
                    </button>
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
