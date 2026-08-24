import { RUNTIME_BREAKPOINTS } from '../../../lib/runtime/breakpoints';
import {
  explanationForCause,
  humanInteractionTitle,
  humanRuntimeEventTitle,
  outcomeLabel,
  type ExplanationLevel,
} from '../../../lib/runtime/explanations';
import { runtimeInteractionTitle } from '../../../lib/runtime/causality';
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
}: {
  events: RuntimeEvent[];
  interactions: RuntimeInteraction[];
  recording: boolean;
  breakpointSettings: RuntimeBreakpointSettings;
  pausedByBreakpoint?: RuntimeBreakpointHit | undefined;
  onBreakpointChange: (breakpointId: RuntimeBreakpointId, enabled: boolean) => void | Promise<void>;
  level: ExplanationLevel;
}) {
  const enabledCount = RUNTIME_BREAKPOINTS.filter((breakpoint) => breakpointSettings[breakpoint.id]).length;
  const pauseExplanation = pausedByBreakpoint ? explanationForCause(pausedByBreakpoint.causeType) : undefined;

  return (
    <section className="panel" aria-labelledby="runtime-title">
      <div className="section-heading">
        <div>
          <h2 id="runtime-title">Runtime causality</h2>
          <p>
            {recording
              ? 'Use the inspected page normally.'
              : `${events.length} events · ${interactions.filter((item) => item.correlated).length} interactions.`}
          </p>
        </div>
      </div>

      {pausedByBreakpoint && pauseExplanation && (
        <div className="breakpoint-pause" role="status">
          <strong>Paused on accessibility breakpoint</strong>
          <h3>{pauseExplanation.title}</h3>
          <p>{pauseExplanation.summary}</p>
          {level !== 'simple' && <p><strong>Accessibility:</strong> {pauseExplanation.accessibility}</p>}
          {level === 'developer' && <code>{pausedByBreakpoint.causeType}</code>}
        </div>
      )}

      <details className="breakpoint-panel" open={pausedByBreakpoint != null}>
        <summary>
          <strong>Accessibility breakpoints</strong>
          <span>{enabledCount}/{RUNTIME_BREAKPOINTS.length} enabled</span>
        </summary>
        <div className="breakpoint-list">
          {RUNTIME_BREAKPOINTS.map((breakpoint) => (
            <label key={breakpoint.id} className="breakpoint-option">
              <input
                type="checkbox"
                checked={breakpointSettings[breakpoint.id]}
                onChange={(event: { currentTarget: HTMLInputElement }) => void onBreakpointChange(breakpoint.id, event.currentTarget.checked)}
              />
              <span>
                <strong>{breakpoint.label}</strong>
                <small>{breakpoint.description}</small>
              </span>
            </label>
          ))}
        </div>
        <p className="breakpoint-note">
          A hit pauses FocusTrace recording after the triggering event is saved. It does not pause JavaScript execution in the inspected page.
        </p>
      </details>

      {events.length === 0 ? (
        <Empty title="Timeline is empty" text="Record a user journey to trace actions, focus changes and dynamic UI updates." />
      ) : (
        <RuntimeInteractionList interactions={interactions} level={level} />
      )}
    </section>
  );
}

function RuntimeInteractionList({ interactions, level }: { interactions: RuntimeInteraction[]; level: ExplanationLevel }) {
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
        const explanation = primaryCause ? explanationForCause(primaryCause.type) : undefined;

        return (
          <li key={interaction.id} className={classNames}>
            <details open={interaction.findings > 0 || interaction.breakpointHits.length > 0}>
              <summary>
                <span>
                  <strong>{interaction.correlated ? `Interaction #${number}` : 'Background activity'}</strong>
                  <small>{level === 'developer' ? runtimeInteractionTitle(interaction) : humanInteractionTitle(interaction)}</small>
                </span>
                <span className="interaction-summary">
                  {level === 'developer' && (
                    <time dateTime={new Date(interaction.startedAt).toISOString()}>{timeLabel(interaction.startedAt)}</time>
                  )}
                  <small>
                    {interaction.events.length} event{interaction.events.length === 1 ? '' : 's'}
                    {interaction.findings ? ` · ${interaction.findings} finding${interaction.findings === 1 ? '' : 's'}` : ''}
                  </small>
                </span>
              </summary>

              {interaction.breakpointHits.length > 0 && (
                <div className="breakpoint-hit-box">
                  <strong>Breakpoint hit</strong>
                  {interaction.breakpointHits.map((hit) => {
                    const hitExplanation = explanationForCause(hit.causeType);
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
                  <strong>{level === 'developer' ? 'Root cause' : 'What happened'}</strong>
                  <h3>{explanation.title}</h3>
                  <p>{explanation.summary}</p>
                  <p><strong>Impact:</strong> {explanation.impact}</p>
                  <p><strong>What to review:</strong> {explanation.recommendation}</p>
                  {level !== 'simple' && <p><strong>Accessibility:</strong> {explanation.accessibility}</p>}
                  {level === 'developer' && interaction.causes.map((item) => (
                    <p key={`${item.type}-${item.summary}`}><code>{item.type}</code> {item.summary}</p>
                  ))}
                </div>
              )}

              <ol className="causal-chain">
                {interaction.events.map((event) => <RuntimeEventRow event={event} level={level} key={event.id} />)}
              </ol>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

function RuntimeEventRow({ event, level }: { event: RuntimeEvent; level: ExplanationLevel }) {
  const title = level === 'developer' ? event.title : humanRuntimeEventTitle(event);
  return (
    <li className={`${event.outcome ? 'runtime-finding ' : ''}${level === 'simple' ? 'simple-event' : ''}`.trim()}>
      {level === 'developer' && (
        <time dateTime={new Date(event.timestamp).toISOString()}>{timeLabel(event.timestamp)}</time>
      )}
      <div>
        <div className="finding-meta">
          {event.breakpointHits?.length ? <span className="breakpoint-badge">breakpoint</span> : null}
          {event.outcome && <span className={`outcome ${event.outcome}`}>{outcomeLabel(event.outcome, level)}</span>}
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
        {level !== 'simple' && <ReferenceList references={event.references} />}
      </div>
    </li>
  );
}
