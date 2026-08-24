import { RUNTIME_BREAKPOINTS } from '../../../lib/runtime/breakpoints';
import {
  explanationForCause,
  humanInteractionTitle,
  humanRuntimeEventTitle,
  outcomeLabel,
  type ExplanationLevel,
} from '../../../lib/runtime/explanations';
import { runtimeInteractionTitle } from '../../../lib/runtime/causality';
import { localizedBreakpoint, localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import type {
  RuntimeBreakpointHit,
  RuntimeBreakpointId,
  RuntimeBreakpointSettings,
  RuntimeEvent,
  RuntimeInteraction,
} from '../../../shared/types';
import { Empty, ReferenceList, timeLabel } from '../components/Common';

export function RuntimeView({
  events,
  interactions,
  recording,
  breakpointSettings,
  pausedByBreakpoint,
  onBreakpointChange,
  level,
  language,
}: {
  events: RuntimeEvent[];
  interactions: RuntimeInteraction[];
  recording: boolean;
  breakpointSettings: RuntimeBreakpointSettings;
  pausedByBreakpoint?: RuntimeBreakpointHit | undefined;
  onBreakpointChange: (breakpointId: RuntimeBreakpointId, enabled: boolean) => void | Promise<void>;
  level: ExplanationLevel;
  language: AppLanguage;
}) {
  const enabledCount = RUNTIME_BREAKPOINTS.filter((breakpoint) => breakpointSettings[breakpoint.id]).length;
  const pauseExplanation = pausedByBreakpoint ? explanationForCause(pausedByBreakpoint.causeType, language) : undefined;

  return (
    <section className="panel" aria-labelledby="runtime-title">
      <div className="section-heading">
        <div>
          <h2 id="runtime-title">{tr(language, 'Runtime causality', 'Causalidad runtime')}</h2>
          <p>
            {recording
              ? tr(language, 'Use the inspected page normally.', 'Usa la página inspeccionada con normalidad.')
              : tr(
                  language,
                  `${events.length} events · ${interactions.filter((item) => item.correlated).length} interactions.`,
                  `${events.length} eventos · ${interactions.filter((item) => item.correlated).length} interacciones.`,
                )}
          </p>
        </div>
      </div>

      {pausedByBreakpoint && pauseExplanation && (
        <div className="breakpoint-pause" role="status">
          <strong>{tr(language, 'Paused on accessibility breakpoint', 'Pausado por breakpoint de accesibilidad')}</strong>
          <h3>{pauseExplanation.title}</h3>
          <p>{pauseExplanation.summary}</p>
          {level !== 'simple' && <p><strong>{tr(language, 'Accessibility:', 'Accesibilidad:')}</strong> {pauseExplanation.accessibility}</p>}
          {level === 'developer' && <code>{pausedByBreakpoint.causeType}</code>}
        </div>
      )}

      <details className="breakpoint-panel" open={pausedByBreakpoint != null}>
        <summary>
          <strong>{tr(language, 'Accessibility breakpoints', 'Breakpoints de accesibilidad')}</strong>
          <span>
            {tr(
              language,
              `${enabledCount}/${RUNTIME_BREAKPOINTS.length} enabled`,
              `${enabledCount}/${RUNTIME_BREAKPOINTS.length} activados`,
            )}
          </span>
        </summary>
        <div className="breakpoint-list">
          {RUNTIME_BREAKPOINTS.map((breakpoint) => {
            const copy = localizedBreakpoint(breakpoint.id, breakpoint, language);
            return (
              <label key={breakpoint.id} className="breakpoint-option">
                <input
                  type="checkbox"
                  checked={breakpointSettings[breakpoint.id]}
                  onChange={(event: { currentTarget: HTMLInputElement }) => void onBreakpointChange(breakpoint.id, event.currentTarget.checked)}
                />
                <span>
                  <strong>{copy.label}</strong>
                  <small>{copy.description}</small>
                </span>
              </label>
            );
          })}
        </div>
        <p className="breakpoint-note">
          {tr(
            language,
            'Breakpoints are optional and off by default. An enabled hit pauses FocusTrace after saving the triggering event; it never pauses JavaScript in the page.',
            'Los breakpoints son opcionales y vienen desactivados. Si activas uno, FocusTrace pausa la grabación después de guardar el evento; nunca pausa el JavaScript de la página.',
          )}
        </p>
      </details>

      {events.length === 0 ? (
        <Empty
          title={tr(language, 'Timeline is empty', 'La línea temporal está vacía')}
          text={tr(
            language,
            'Record a user journey to trace actions, focus changes and dynamic UI updates.',
            'Graba un recorrido para seguir acciones, cambios de foco y actualizaciones dinámicas de la interfaz.',
          )}
        />
      ) : (
        <RuntimeInteractionList interactions={interactions} level={level} language={language} />
      )}
    </section>
  );
}

function RuntimeInteractionList({
  interactions,
  level,
  language,
}: {
  interactions: RuntimeInteraction[];
  level: ExplanationLevel;
  language: AppLanguage;
}) {
  const indexed = interactions.map((interaction, index) => ({ interaction, number: index + 1 }));

  return (
    <ol className="interaction-list">
      {[...indexed].reverse().map(({ interaction, number }) => {
        const classNames = [
          'interaction',
          interaction.findings ? 'has-finding' : '',
          interaction.breakpointHits.length ? 'has-breakpoint' : '',
        ].filter(Boolean).join(' ');
        const primaryCause = interaction.causes[0];
        const explanation = primaryCause ? explanationForCause(primaryCause.type, language) : undefined;
        const eventCount = interaction.events.length;
        const findingCount = interaction.findings;

        return (
          <li key={interaction.id} className={classNames}>
            <details open={interaction.findings > 0 || interaction.breakpointHits.length > 0}>
              <summary>
                <span>
                  <strong>
                    {interaction.correlated
                      ? tr(language, `Interaction #${number}`, `Interacción #${number}`)
                      : tr(language, 'Background activity', 'Actividad en segundo plano')}
                  </strong>
                  <small>{level === 'developer' ? runtimeInteractionTitle(interaction) : humanInteractionTitle(interaction, language)}</small>
                </span>
                <span className="interaction-summary">
                  {level === 'developer' && (
                    <time dateTime={new Date(interaction.startedAt).toISOString()}>{timeLabel(interaction.startedAt, language)}</time>
                  )}
                  <small>
                    {tr(
                      language,
                      `${eventCount} event${eventCount === 1 ? '' : 's'}`,
                      `${eventCount} evento${eventCount === 1 ? '' : 's'}`,
                    )}
                    {findingCount
                      ? tr(
                          language,
                          ` · ${findingCount} finding${findingCount === 1 ? '' : 's'}`,
                          ` · ${findingCount} hallazgo${findingCount === 1 ? '' : 's'}`,
                        )
                      : ''}
                  </small>
                </span>
              </summary>

              {interaction.breakpointHits.length > 0 && (
                <div className="breakpoint-hit-box">
                  <strong>{tr(language, 'Breakpoint hit', 'Breakpoint activado')}</strong>
                  {interaction.breakpointHits.map((hit) => {
                    const hitExplanation = explanationForCause(hit.causeType, language);
                    return (
                      <p key={`${hit.breakpointId}-${hit.eventId}`}>
                        {level === 'developer' && <code>{hit.breakpointId}</code>} {hitExplanation.title}
                      </p>
                    );
                  })}
                </div>
              )}

              {explanation && (
                <div className="cause-box human-cause-box">
                  <strong>
                    {level === 'developer'
                      ? tr(language, 'Root cause', 'Causa raíz')
                      : tr(language, 'What happened', 'Qué ha ocurrido')}
                  </strong>
                  <h3>{explanation.title}</h3>
                  <p>{explanation.summary}</p>
                  <p><strong>{tr(language, 'Impact:', 'Impacto:')}</strong> {explanation.impact}</p>
                  <p><strong>{tr(language, 'What to review:', 'Qué revisar:')}</strong> {explanation.recommendation}</p>
                  {level !== 'simple' && <p><strong>{tr(language, 'Accessibility:', 'Accesibilidad:')}</strong> {explanation.accessibility}</p>}
                  {level === 'developer' && interaction.causes.map((item) => (
                    <p key={`${item.type}-${item.summary}`}><code>{item.type}</code> {item.summary}</p>
                  ))}
                </div>
              )}

              <ol className="causal-chain">
                {interaction.events.map((event) => (
                  <RuntimeEventRow event={event} level={level} language={language} key={event.id} />
                ))}
              </ol>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

function RuntimeEventRow({
  event,
  level,
  language,
}: {
  event: RuntimeEvent;
  level: ExplanationLevel;
  language: AppLanguage;
}) {
  const title = level === 'developer' ? event.title : humanRuntimeEventTitle(event, language);
  return (
    <li className={`${event.outcome ? 'runtime-finding ' : ''}${level === 'simple' ? 'simple-event' : ''}`.trim()}>
      {level === 'developer' && (
        <time dateTime={new Date(event.timestamp).toISOString()}>{timeLabel(event.timestamp, language)}</time>
      )}
      <div>
        <div className="finding-meta">
          {event.breakpointHits?.length ? <span className="breakpoint-badge">breakpoint</span> : null}
          {event.outcome && <span className={`outcome ${event.outcome}`}>{outcomeLabel(event.outcome, level, language)}</span>}
          {level !== 'simple' && <span className={`severity ${event.severity}`}>{event.kind}</span>}
          {level !== 'simple' && event.ruleId && <code>{event.ruleId}</code>}
        </div>
        <strong>{title}</strong>
        {level !== 'simple' && event.detail && <p>{event.detail}</p>}
        {level === 'developer' && event.mutation?.attribute && (
          <p className="mutation-values">
            <code>{event.mutation.attribute}</code> {JSON.stringify(event.mutation.previousValue)} →{' '}
            {JSON.stringify(event.mutation.currentValue)}
          </p>
        )}
        {level === 'developer' && event.element && <code>{event.element.selector}</code>}
        {level === 'developer' && event.fromUrl && event.toUrl && <p className="route">{event.fromUrl} → {event.toUrl}</p>}
        {level !== 'simple' && <ReferenceList references={event.references} language={language} />}
      </div>
    </li>
  );
}
