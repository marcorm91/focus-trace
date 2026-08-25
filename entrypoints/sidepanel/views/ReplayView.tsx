import { useEffect, useMemo, useState } from 'react';
import type { FocusJourney } from '../../../lib/runtime/focus-journey';
import {
  focusTransitionSemanticCopy,
  focusTransitionSemanticIcon,
  type FocusTransitionSemantic,
} from '../../../lib/runtime/focus-transition-semantics';
import { buildRuntimeReplay, type RuntimeReplayPhase } from '../../../lib/runtime/replay';
import {
  explanationForCause,
  humanInteractionTitle,
  humanRuntimeEventTitle,
  type ExplanationLevel,
} from '../../../lib/runtime/explanations';
import { localeFor, tr, type AppLanguage } from '../../../shared/i18n';
import type { RuntimeEvent, RuntimeInteraction } from '../../../shared/types';
import { Empty, ReferenceList } from '../components/Common';
import './replay.css';

function phaseLabel(phase: RuntimeReplayPhase, language: AppLanguage): string {
  if (phase === 'trigger') return tr(language, 'Trigger', 'Acción');
  if (phase === 'focus') return tr(language, 'Focus', 'Foco');
  if (phase === 'change') return tr(language, 'UI change', 'Cambio UI');
  if (phase === 'signal') return tr(language, 'Explained signal', 'Señal explicada');
  return tr(language, 'Context', 'Contexto');
}

function phaseIcon(phase: RuntimeReplayPhase): string {
  if (phase === 'trigger') return '▶';
  if (phase === 'focus') return '◎';
  if (phase === 'change') return '◆';
  if (phase === 'signal') return '!';
  return '•';
}

function mutationLabel(event: RuntimeEvent, language: AppLanguage): string | undefined {
  const mutation = event.mutation;
  if (!mutation) return undefined;
  if (mutation.kind === 'node-added') return tr(language, 'Node added to the DOM', 'Nodo añadido al DOM');
  if (mutation.kind === 'node-removed') return tr(language, 'Node removed from the DOM', 'Nodo eliminado del DOM');
  return tr(language, 'Attribute changed', 'Atributo modificado');
}

export function ReplayView({
  events,
  interactions,
  journey,
  semantics,
  recording,
  level,
  language,
  onSelectFocusTarget,
  onClearFocusTarget,
}: {
  events: RuntimeEvent[];
  interactions: RuntimeInteraction[];
  journey: FocusJourney;
  semantics: FocusTransitionSemantic[];
  recording: boolean;
  level: ExplanationLevel;
  language: AppLanguage;
  onSelectFocusTarget: (selector: string) => void | Promise<void>;
  onClearFocusTarget: () => void | Promise<void>;
}) {
  const steps = useMemo(() => buildRuntimeReplay(events, interactions), [events, interactions]);
  const focusSelectors = useMemo(
    () => new Set(journey.steps.map((step) => step.element.selector)),
    [journey.steps],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, steps.length - 1)));
  }, [steps.length]);

  const current = steps[index];
  const currentInteraction = current?.event.interactionId
    ? interactions.find((interaction) => interaction.id === current.event.interactionId)
    : undefined;
  const linkedToFocusPath = Boolean(current?.target && focusSelectors.has(current.target.selector));
  const currentSemantics = current
    ? semantics.filter((semantic) => semantic.eventIds[0] === current.event.id)
    : [];

  useEffect(() => {
    if (recording || !current) return;
    if (current.target && focusSelectors.has(current.target.selector)) {
      void onSelectFocusTarget(current.target.selector);
      return;
    }
    void onClearFocusTarget();
  }, [current?.id, current?.target?.selector, focusSelectors, onClearFocusTarget, onSelectFocusTarget, recording]);

  useEffect(() => () => {
    void onClearFocusTarget();
  }, [onClearFocusTarget]);

  if (steps.length === 0) {
    return (
      <section className="replay-view panel" aria-labelledby="replay-title">
        <div className="section-heading">
          <div>
            <h2 id="replay-title">{tr(language, 'Evidence replay', 'Replay de evidencia')}</h2>
            <p>{tr(language, 'Step through a recorded trace without re-running the interaction.', 'Recorre una traza grabada sin volver a ejecutar la interacción.')}</p>
          </div>
        </div>
        <Empty
          title={tr(language, 'Nothing to replay yet', 'Todavía no hay nada que reproducir')}
          text={tr(language, 'Start a trace and interact with the page. The recorded evidence will appear here.', 'Inicia una traza e interactúa con la página. La evidencia grabada aparecerá aquí.')}
        />
      </section>
    );
  }

  if (!current) return null;

  const eventTitle = humanRuntimeEventTitle(current.event, language);
  const causeExplanation = current.cause ? explanationForCause(current.cause.type, language) : undefined;
  const mutationTitle = mutationLabel(current.event, language);
  const targetName = current.target?.name || current.target?.role || current.target?.tag;
  const formattedTime = new Intl.DateTimeFormat(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(current.event.timestamp);
  const currentPhaseLabel = phaseLabel(current.phase, language);

  return (
    <section className="replay-view panel" aria-labelledby="replay-title">
      <div className="replay-heading">
        <div>
          <p className="eyebrow">{tr(language, 'Recorded evidence', 'Evidencia grabada')}</p>
          <h2 id="replay-title">{tr(language, 'Evidence replay', 'Replay de evidencia')}</h2>
          <p>{tr(
            language,
            'Previous and Next inspect the recorded chain. FocusTrace never re-clicks controls or changes the application state.',
            'Anterior y Siguiente inspeccionan la cadena grabada. FocusTrace nunca vuelve a pulsar controles ni modifica el estado de la aplicación.',
          )}</p>
        </div>
        <span className={`replay-recording-state ${recording ? 'is-live' : ''}`}>
          {recording
            ? tr(language, 'Recording', 'Grabando')
            : tr(language, 'Read-only replay', 'Replay de solo lectura')}
        </span>
      </div>

      <div className="replay-controller" aria-label={tr(language, 'Replay controls', 'Controles de replay')}>
        <button
          type="button"
          title={tr(language, 'Previous recorded event', 'Evento grabado anterior')}
          disabled={recording || index === 0}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
        >
          <span aria-hidden="true">←</span> {tr(language, 'Previous', 'Anterior')}
        </button>
        <div className="replay-position" aria-live="polite">
          <strong>{current.order}</strong>
          <span>/ {current.total}</span>
        </div>
        <button
          type="button"
          title={tr(language, 'Next recorded event', 'Siguiente evento grabado')}
          disabled={recording || index === steps.length - 1}
          onClick={() => setIndex((value) => Math.min(steps.length - 1, value + 1))}
        >
          {tr(language, 'Next', 'Siguiente')} <span aria-hidden="true">→</span>
        </button>
      </div>

      <label className="replay-scrubber">
        <span>{tr(language, 'Recorded timeline', 'Línea temporal grabada')}</span>
        <input
          type="range"
          min="1"
          max={steps.length}
          value={current.order}
          disabled={recording}
          aria-valuetext={tr(language, `Step ${current.order} of ${current.total}`, `Paso ${current.order} de ${current.total}`)}
          onChange={(event) => setIndex(Number(event.currentTarget.value) - 1)}
        />
      </label>

      <article className={`replay-event phase-${current.phase}${current.cause ? ' has-cause' : ''}`}>
        <div className="replay-event-header">
          <span className="replay-phase-icon" aria-hidden="true" title={currentPhaseLabel}>{phaseIcon(current.phase)}</span>
          <div>
            <div className="replay-meta">
              <span>{currentPhaseLabel}</span>
              {current.interactionNumber && (
                <span>{tr(language, `Interaction #${current.interactionNumber}`, `Interacción #${current.interactionNumber}`)}</span>
              )}
              {level === 'developer' && <time dateTime={new Date(current.event.timestamp).toISOString()}>{formattedTime}</time>}
            </div>
            <h3>{eventTitle}</h3>
          </div>
        </div>

        {currentInteraction?.correlated && (
          <div className="replay-trigger-context">
            <strong>{tr(language, 'Interaction:', 'Interacción:')}</strong>{' '}
            {humanInteractionTitle(currentInteraction, language)}
          </div>
        )}

        {current.event.detail && <p className="replay-detail">{current.event.detail}</p>}

        {currentSemantics.length > 0 && (
          <section className="replay-transition-results" aria-label={tr(language, 'Transition result', 'Resultado de la transición')}>
            {currentSemantics.map((semantic) => {
              const copy = focusTransitionSemanticCopy(semantic, language);
              return (
                <div className={`replay-transition-result ${semantic.tone}`} key={semantic.id}>
                  <span className={`replay-semantic-label ${semantic.tone}`}>
                    <span aria-hidden="true" title={copy.label}>{focusTransitionSemanticIcon(semantic)}</span>
                    {copy.label}
                  </span>
                  <p>{copy.detail}</p>
                </div>
              );
            })}
          </section>
        )}

        {current.target && (
          <div className="replay-target">
            <div>
              <span>{tr(language, 'Target', 'Destino')}</span>
              <strong>{targetName}</strong>
              <small>{current.target.role ?? current.target.tag}</small>
            </div>
            <span className={linkedToFocusPath ? 'replay-page-sync available' : 'replay-page-sync'}>
              {linkedToFocusPath
                ? tr(language, 'Linked to recorded focus path', 'Vinculado al recorrido de foco')
                : tr(language, 'Recorded evidence only', 'Solo evidencia grabada')}
            </span>
            {level === 'developer' && <code>{current.target.selector}</code>}
          </div>
        )}

        {current.event.fromUrl && current.event.toUrl && (
          <div className="replay-change-block">
            <strong>{tr(language, 'Route change', 'Cambio de ruta')}</strong>
            <code>{current.event.fromUrl}</code>
            <span aria-hidden="true">→</span>
            <code>{current.event.toUrl}</code>
          </div>
        )}

        {mutationTitle && current.event.mutation && (
          <div className="replay-change-block">
            <strong>{mutationTitle}</strong>
            {current.event.mutation.attribute && <code>{current.event.mutation.attribute}</code>}
            {current.event.mutation.kind === 'attribute-changed' && (
              <span className="replay-value-change">
                {JSON.stringify(current.event.mutation.previousValue)} → {JSON.stringify(current.event.mutation.currentValue)}
              </span>
            )}
          </div>
        )}

        {causeExplanation && (
          <div className="replay-cause">
            <p className="eyebrow">{tr(language, 'Deterministic cause', 'Causa determinista')}</p>
            <h3>{causeExplanation.title}</h3>
            <p>{causeExplanation.summary}</p>
            <p><strong>{tr(language, 'Impact:', 'Impacto:')}</strong> {causeExplanation.impact}</p>
            <p><strong>{tr(language, 'Review:', 'Revisar:')}</strong> {causeExplanation.recommendation}</p>
            {level !== 'simple' && <p><strong>{tr(language, 'Accessibility:', 'Accesibilidad:')}</strong> {causeExplanation.accessibility}</p>}
            {level === 'developer' && <code>{current.cause?.type}</code>}
          </div>
        )}

        {current.event.references?.length ? (
          <ReferenceList references={current.event.references} language={language} />
        ) : null}
      </article>

      <div className="replay-chain" aria-label={tr(language, 'Nearby replay steps', 'Pasos cercanos del replay')}>
        {steps.slice(Math.max(0, index - 2), Math.min(steps.length, index + 3)).map((step) => (
          <button
            type="button"
            key={step.id}
            title={tr(language, `Open replay step ${step.order}`, `Abrir el paso ${step.order} del replay`)}
            className={step.id === current.id ? 'active' : ''}
            aria-current={step.id === current.id ? 'step' : undefined}
            disabled={recording}
            onClick={() => setIndex(step.order - 1)}
          >
            <span>{step.order}</span>
            <small>{phaseLabel(step.phase, language)}</small>
          </button>
        ))}
      </div>

      <div className="notice replay-scope-note">
        <strong>{tr(language, 'Historical evidence vs current page', 'Evidencia histórica frente a página actual')}</strong>
        <p>{tr(
          language,
          'Replay describes what FocusTrace recorded at that moment. A page highlight uses the current DOM, so it may be unavailable if the element was removed or the view has changed.',
          'Replay describe lo que FocusTrace registró en ese momento. El resaltado usa el DOM actual, por lo que puede no estar disponible si el elemento se eliminó o la vista ha cambiado.',
        )}</p>
      </div>
    </section>
  );
}
