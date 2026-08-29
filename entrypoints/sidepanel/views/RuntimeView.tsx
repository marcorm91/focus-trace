import { useEffect, useMemo, useRef, useState } from 'react';
import { RUNTIME_BREAKPOINTS } from '../../../lib/runtime/breakpoints';
import {
  explanationForCause,
  humanInteractionTitle,
  humanRuntimeEventTitle,
  outcomeLabel,
  type ExplanationLevel,
} from '../../../lib/runtime/explanations';
import { humanRuntimeEventDetail, runtimeEventKindLabel } from '../../../lib/runtime/runtime-presentation';
import { deletableManualInteractionIds } from '../../../lib/runtime/trace-evidence-editing';
import { localizedBreakpoint, tr, type AppLanguage } from '../../../shared/i18n';
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
  onDeleteInteraction,
  level,
  language,
}: {
  events: RuntimeEvent[];
  interactions: RuntimeInteraction[];
  recording: boolean;
  breakpointSettings: RuntimeBreakpointSettings;
  pausedByBreakpoint?: RuntimeBreakpointHit | undefined;
  onBreakpointChange: (breakpointId: RuntimeBreakpointId, enabled: boolean) => void | Promise<void>;
  onDeleteInteraction: (interactionId: string) => void | Promise<void>;
  level: ExplanationLevel;
  language: AppLanguage;
}) {
  const enabledCount = RUNTIME_BREAKPOINTS.filter((breakpoint) => breakpointSettings[breakpoint.id]).length;
  const pauseExplanation = pausedByBreakpoint ? explanationForCause(pausedByBreakpoint.causeType, language) : undefined;
  const deletableIds = useMemo(
    () => deletableManualInteractionIds(interactions, events),
    [events, interactions],
  );
  const [pendingDelete, setPendingDelete] = useState<RuntimeInteraction>();
  const [deleting, setDeleting] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (pendingDelete && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => cancelDeleteRef.current?.focus());
      return;
    }
    if (!pendingDelete && dialog.open) dialog.close();
  }, [pendingDelete]);

  const confirmDelete = async () => {
    if (!pendingDelete || recording || deleting || !deletableIds.has(pendingDelete.id)) return;
    setDeleting(true);
    try {
      await onDeleteInteraction(pendingDelete.id);
      setPendingDelete(undefined);
    } finally {
      setDeleting(false);
    }
  };

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

      {!recording && deletableIds.size > 0 && (
        <p className="trace-edit-note">
          {tr(
            language,
            'Made a mistake during manual Trace? Open an interaction and remove that action. FocusTrace also removes every focus change, mutation and finding correlated with it, then recalculates Replay, Journey, Graph and Report.',
            '¿Te has equivocado durante el Trace manual? Abre una interacción y elimina esa acción. FocusTrace también elimina todos los cambios de foco, mutaciones y hallazgos correlacionados con ella, y recalcula Replay, Recorrido, Grafo e Informe.',
          )}
        </p>
      )}

      <dialog
        ref={deleteDialogRef}
        className="trace-reset-dialog"
        aria-labelledby="trace-delete-interaction-title"
        aria-describedby="trace-delete-interaction-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!deleting) setPendingDelete(undefined);
        }}
        onClose={() => {
          if (!deleting) setPendingDelete(undefined);
        }}
      >
        <div className="trace-reset-dialog-copy">
          <p className="eyebrow">{tr(language, 'Manual Trace evidence', 'Evidencia de Trace manual')}</p>
          <h3 id="trace-delete-interaction-title">{tr(language, 'Remove this action from Trace?', '¿Eliminar esta acción del Trace?')}</h3>
          <p id="trace-delete-interaction-description">
            {tr(
              language,
              'The selected user action and every event or finding correlated with it will be removed from this session. Replay, Journey, Graph and Report are recalculated from the remaining evidence. The static page analysis is not changed.',
              'La acción seleccionada y todos los eventos o hallazgos correlacionados con ella se eliminarán de esta sesión. Replay, Recorrido, Grafo e Informe se recalculan con la evidencia restante. El análisis estático de la página no cambia.',
            )}
          </p>
          {pendingDelete && <strong className="trace-delete-interaction-name">{humanInteractionTitle(pendingDelete, language)}</strong>}
        </div>
        <div className="trace-reset-dialog-actions">
          <button
            ref={cancelDeleteRef}
            type="button"
            disabled={deleting}
            onClick={() => setPendingDelete(undefined)}
          >
            {tr(language, 'Cancel', 'Cancelar')}
          </button>
          <button
            className="trace-reset-confirm"
            type="button"
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            {deleting
              ? tr(language, 'Removing…', 'Eliminando…')
              : tr(language, 'Remove action', 'Eliminar acción')}
          </button>
        </div>
      </dialog>

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
        <RuntimeInteractionList
          interactions={interactions}
          deletableIds={deletableIds}
          recording={recording}
          onRequestDelete={setPendingDelete}
          level={level}
          language={language}
        />
      )}
    </section>
  );
}

function RuntimeInteractionList({
  interactions,
  deletableIds,
  recording,
  onRequestDelete,
  level,
  language,
}: {
  interactions: RuntimeInteraction[];
  deletableIds: Set<string>;
  recording: boolean;
  onRequestDelete: (interaction: RuntimeInteraction) => void;
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
        const canDelete = !recording && deletableIds.has(interaction.id);

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
                  <small>{humanInteractionTitle(interaction, language)}</small>
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

              {canDelete && (
                <div className="interaction-edit-actions">
                  <button
                    type="button"
                    className="interaction-delete-action"
                    onClick={() => onRequestDelete(interaction)}
                  >
                    <span aria-hidden="true">×</span>
                    {tr(language, 'Remove this action from Trace', 'Eliminar esta acción del Trace')}
                  </button>
                  <small>{tr(
                    language,
                    'Deletes the action and all evidence correlated with it from this session.',
                    'Elimina de esta sesión la acción y toda la evidencia correlacionada con ella.',
                  )}</small>
                </div>
              )}

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
                    <p key={`${item.type}-${item.summary}`}>
                      <code>{item.type}</code> {explanationForCause(item.type, language).summary}
                    </p>
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
  const title = humanRuntimeEventTitle(event, language);
  const detail = humanRuntimeEventDetail(event, language);
  return (
    <li className={`${event.outcome ? 'runtime-finding ' : ''}${level === 'simple' ? 'simple-event' : ''}`.trim()}>
      {level === 'developer' && (
        <time dateTime={new Date(event.timestamp).toISOString()}>{timeLabel(event.timestamp, language)}</time>
      )}
      <div>
        <div className="finding-meta">
          {event.breakpointHits?.length ? <span className="breakpoint-badge">{tr(language, 'breakpoint', 'breakpoint')}</span> : null}
          {event.outcome && <span className={`outcome ${event.outcome}`}>{outcomeLabel(event.outcome, level, language)}</span>}
          {level !== 'simple' && <span className={`severity ${event.severity}`}>{runtimeEventKindLabel(event.kind, language)}</span>}
          {level !== 'simple' && event.ruleId && <code>{event.ruleId}</code>}
        </div>
        <strong>{title}</strong>
        {level !== 'simple' && detail && <p>{detail}</p>}
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
