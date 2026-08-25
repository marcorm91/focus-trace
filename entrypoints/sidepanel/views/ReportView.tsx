import type { ExplanationLevel } from '../../../lib/runtime/explanations';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { ElementSnapshot, RuntimeEvent, ScanResult } from '../../../shared/types';
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

function componentFindings(element: ElementSnapshot, language: AppLanguage) {
  const notes: Array<{ tone: 'info' | 'moderate'; title: string; detail: string }> = [];
  const role = element.role?.toLowerCase();
  const nativeInteractive = isNativeInteractive(element);
  const hasInteractiveRole = ['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem'].includes(role ?? '');
  const nameSource = nameSourceLabel(element, language);

  if (element.name) {
    notes.push({
      tone: 'info',
      title: tr(language, 'Accessible name', 'Nombre accesible'),
      detail: tr(
        language,
        `Name "${element.name}" resolved from ${nameSource}.`,
        `Nombre "${element.name}" resuelto desde ${nameSource}.`,
      ),
    });
  } else {
    notes.push({
      tone: 'moderate',
      title: tr(language, 'Accessible name needs review', 'Revisar nombre accesible'),
      detail: tr(
        language,
        'No accessible name was captured for this focusable component. Review visible text, aria-label or aria-labelledby.',
        'No se ha capturado nombre accesible para este componente focusable. Revisa texto visible, aria-label o aria-labelledby.',
      ),
    });
  }

  if (nativeInteractive) {
    notes.push({
      tone: 'info',
      title: tr(language, 'Native semantics', 'Semántica nativa'),
      detail: tr(
        language,
        `${element.tag} provides native keyboard semantics for this focus target.`,
        `${element.tag} aporta semántica de teclado nativa para este foco.`,
      ),
    });
  } else if (hasInteractiveRole) {
    notes.push({
      tone: 'info',
      title: tr(language, 'ARIA role', 'Rol ARIA'),
      detail: tr(
        language,
        `The component exposes role="${role}". Review that keyboard behavior matches that role.`,
        `El componente expone role="${role}". Revisa que el comportamiento de teclado corresponda con ese rol.`,
      ),
    });
  } else {
    notes.push({
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
    notes.push({
      tone: 'moderate',
      title: tr(language, 'Positive tabindex', 'Tabindex positivo'),
      detail: tr(
        language,
        `tabindex="${element.attributes?.tabIndex}" changes the natural keyboard order. Review whether this is intentional.`,
        `tabindex="${element.attributes?.tabIndex}" altera el orden natural de teclado. Revisa si es intencionado.`,
      ),
    });
  } else if (element.attributes?.tabIndex === 0 && !nativeInteractive) {
    notes.push({
      tone: 'info',
      title: tr(language, 'Programmatic focus entry', 'Entrada de foco programática'),
      detail: tr(
        language,
        'tabindex="0" places this custom element in the natural keyboard order.',
        'tabindex="0" coloca este elemento custom en el orden natural de teclado.',
      ),
    });
  }

  return notes;
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
            <Metric label={tr(language, 'Components reviewed', 'Componentes revisados')} value={focusWalk.focusEvents.length} />
            <Metric label={tr(language, 'Needs review', 'Requieren revisión')} value={focusWalk.findings.length} />
            <Metric label={tr(language, 'Skipped', 'Omitidos')} value={focusWalk.summary.skipped} />
          </div>

          <p>
            {tr(
              language,
              'Each card below represents a focused component, with the captured accessible name, semantic source and focus-order evidence.',
              'Cada tarjeta representa un componente enfocado, con el nombre accesible capturado, la fuente semántica y la evidencia de orden de foco.',
            )}
          </p>

          {focusWalk.focusEvents.length > 0 && (
            <div className="issue-list">
              {focusWalk.focusEvents.map((event, index) => {
                if (!event.element) return null;
                const notes = componentFindings(event.element, language);
                return (
                  <article className="focus-card" key={event.id}>
                    <div className="finding-meta">
                      <span className="severity info">#{index + 1}</span>
                      <span className="severity info">{componentLabel(event.element, language)}</span>
                      <time>{timeLabel(event.timestamp)}</time>
                    </div>
                    <h3>{event.element.name || tr(language, 'Unnamed focused component', 'Componente enfocado sin nombre')}</h3>
                    <dl>
                      <div><dt>{tr(language, 'Component', 'Componente')}</dt><dd>{componentLabel(event.element, language)}</dd></div>
                      <div><dt>{tr(language, 'Name source', 'Fuente nombre')}</dt><dd>{nameSourceLabel(event.element, language)}</dd></div>
                      <div><dt>{tr(language, 'Role', 'Rol')}</dt><dd>{event.element.role ?? event.element.tag}</dd></div>
                      {level === 'developer' && <div><dt>Selector</dt><dd><code>{event.element.selector}</code></dd></div>}
                    </dl>
                    <div className="issue-list">
                      {notes.map((note) => (
                        <p className="cause-line" key={`${event.id}-${note.title}`}>
                          <span className={`severity ${note.tone}`}>{note.tone === 'info' ? 'OK' : tr(language, 'Review', 'Revisar')}</span>{' '}
                          <strong>{note.title}:</strong> {note.detail}
                        </p>
                      ))}
                    </div>
                    <button className="focus-path-toggle" type="button" onClick={() => void onLocate(event.element!.selector)}>
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
