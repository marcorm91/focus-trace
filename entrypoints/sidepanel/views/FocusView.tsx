import { useState } from 'react';
import type { FocusJourney, FocusJourneyDirection } from '../../../lib/runtime/focus-journey';
import { tr, type AppLanguage } from '../../../shared/i18n';

function directionLabel(
  direction: FocusJourneyDirection,
  distance: number | undefined,
  language: AppLanguage,
): string {
  const amount = Math.abs(distance ?? 0);
  if (direction === 'backward') {
    return amount > 1
      ? tr(language, `Moves back ${amount} positions`, `Retrocede ${amount} posiciones`)
      : tr(language, 'Moves back', 'Retrocede');
  }
  if (direction === 'repeat') return tr(language, 'Repeats component', 'Repite componente');
  if (direction === 'wrap') return tr(language, 'Restarts at beginning', 'Reinicia desde el principio');
  if (direction === 'jump') {
    return amount > 1
      ? tr(language, `Jumps forward ${amount} positions`, `Salta ${amount} posiciones`)
      : tr(language, 'Jumps forward', 'Salta hacia delante');
  }
  if (direction === 'forward') return tr(language, 'Moves forward', 'Avanza');
  return tr(language, 'Journey starts', 'Inicio del recorrido');
}

function directionIcon(direction: FocusJourneyDirection): string {
  if (direction === 'backward') return '↖';
  if (direction === 'repeat') return '↺';
  if (direction === 'wrap') return '↻';
  if (direction === 'jump') return '⇣';
  if (direction === 'forward') return '↓';
  return '●';
}

export function FocusView({
  journey,
  pathSteps,
  pathVisible,
  recording,
  busy,
  selectedSelector,
  onTogglePath,
  onToggleRecording,
  onSelectStep,
  language,
}: {
  journey: FocusJourney;
  pathSteps: number;
  pathVisible: boolean;
  recording: boolean;
  busy: boolean;
  selectedSelector?: string | undefined;
  onTogglePath: () => void | Promise<void>;
  onToggleRecording: () => void | Promise<void>;
  onSelectStep: (selector: string) => void | Promise<void>;
  language: AppLanguage;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleSteps = expanded ? journey.steps : journey.steps.slice(0, 12);
  const hiddenSteps = journey.steps.length - visibleSteps.length;

  return (
    <section className="panel focus-journey-view" aria-labelledby="focus-title">
      <div className="section-heading">
        <div>
          <h2 id="focus-title">{tr(language, 'Focus journey', 'Recorrido de foco')}</h2>
          <p>
            {journey.steps.length
              ? tr(
                  language,
                  'Read the graph from top to bottom. Every connector explains how focus moved.',
                  'Lee el grafo de arriba abajo. Cada conexión explica cómo se ha movido el foco.',
                )
              : tr(
                  language,
                  'Record a real keyboard journey or use the automatic Tab walk.',
                  'Graba un recorrido real con teclado o utiliza el recorrido automático con Tab.',
                )}
          </p>
        </div>
      </div>

      <div className={`manual-focus-controls ${recording ? 'is-recording' : ''}`}>
        <div>
          <strong>
            {recording
              ? tr(language, 'Recording manual navigation', 'Grabando navegación manual')
              : tr(language, 'Manual keyboard journey', 'Recorrido manual con teclado')}
          </strong>
          <p>
            {recording
              ? tr(
                  language,
                  'Return to the page and navigate with Tab or Shift+Tab. Both directions will be recorded.',
                  'Vuelve a la página y navega con Tab o Shift+Tab. Se registrarán ambas direcciones.',
                )
              : tr(
                  language,
                  'Start recording, navigate naturally and stop when the journey is complete.',
                  'Inicia la grabación, navega con normalidad y detenla cuando termines.',
                )}
          </p>
        </div>
        <button
          className={recording ? 'stop' : 'primary'}
          type="button"
          disabled={busy}
          onClick={() => void onToggleRecording()}
        >
          <span className="record-icon" aria-hidden="true" />
          {recording
            ? tr(language, 'Stop and save journey', 'Detener y guardar recorrido')
            : tr(language, 'Start manual recording', 'Iniciar grabación manual')}
        </button>
      </div>

      {journey.steps.length > 0 ? (
        <>
          <div className="focus-journey-summary" aria-label={tr(language, 'Journey summary', 'Resumen del recorrido')}>
            <span><strong>{journey.steps.length}</strong>{tr(language, 'Steps', 'Pasos')}</span>
            <span><strong>{journey.forward + journey.wraps}</strong>{tr(language, 'Forward', 'Avances')}</span>
            <span className={journey.backward ? 'has-warning' : ''}><strong>{journey.backward}</strong>{tr(language, 'Backward', 'Retrocesos')}</span>
            <span className={journey.repeated ? 'has-warning' : ''}><strong>{journey.repeated}</strong>{tr(language, 'Repeated', 'Repetidos')}</span>
          </div>

          <div className="focus-page-controls">
            <button
              className="focus-path-toggle"
              type="button"
              aria-pressed={pathVisible}
              disabled={pathSteps === 0 || recording}
              onClick={() => void onTogglePath()}
            >
              <span className="focus-path-swatch" aria-hidden="true">1</span>
              {pathVisible
                ? tr(language, 'Hide route on page', 'Ocultar recorrido en la página')
                : tr(language, 'Show route on page', 'Mostrar recorrido en la página')}
            </button>
            <p>
              {tr(
                language,
                'Select any graph node to locate that step and its evidence on the inspected page.',
                'Selecciona cualquier nodo del grafo para localizar ese paso y su evidencia en la página.',
              )}
            </p>
          </div>

          <ol className="focus-journey-graph" aria-label={tr(language, 'Ordered focus graph', 'Grafo ordenado de foco')}>
            {visibleSteps.map((step) => {
              const selected = step.element.selector === selectedSelector;
              const name = step.element.name || tr(language, 'Unnamed component', 'Componente sin nombre');
              const role = step.element.role ?? step.element.tag;
              const position = step.element.tabOrderIndex != null && step.element.tabOrderSize != null
                ? tr(
                    language,
                    `Tab position ${step.element.tabOrderIndex} of ${step.element.tabOrderSize}`,
                    `Posición Tab ${step.element.tabOrderIndex} de ${step.element.tabOrderSize}`,
                  )
                : tr(language, 'Tab position unavailable', 'Posición Tab no disponible');

              return (
                <li className={`journey-step direction-${step.direction}`} key={step.id}>
                  {step.direction !== 'start' && (
                    <div className="journey-connector">
                      <span aria-hidden="true">{directionIcon(step.direction)}</span>
                      <strong>{directionLabel(step.direction, step.distance, language)}</strong>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-current={selected ? 'step' : undefined}
                    onClick={() => void onSelectStep(step.element.selector)}
                  >
                    <span className="journey-node" aria-hidden="true">{step.order}</span>
                    <span className="journey-node-copy">
                      <strong>{name}</strong>
                      <small>{role} · {position}</small>
                    </span>
                    {step.event.outcome && (
                      <span className={`journey-signal ${step.event.outcome}`}>
                        {tr(language, 'Review', 'Revisar')}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {hiddenSteps > 0 && (
            <button className="show-full-journey" type="button" onClick={() => setExpanded(true)}>
              {tr(
                language,
                `Show ${hiddenSteps} more steps`,
                `Mostrar ${hiddenSteps} pasos más`,
              )}
            </button>
          )}
          {expanded && journey.steps.length > 12 && (
            <button className="show-full-journey" type="button" onClick={() => setExpanded(false)}>
              {tr(language, 'Show first 12 steps', 'Mostrar los primeros 12 pasos')}
            </button>
          )}
        </>
      ) : (
        <div className="focus-empty-state">
          <strong>{tr(language, 'No focus journey yet', 'Todavía no hay recorrido de foco')}</strong>
          <p>
            {tr(
              language,
              'Use manual recording above or choose Walk with Tab for an automatic journey.',
              'Utiliza la grabación manual o pulsa Recorrer con Tab para generar un recorrido automático.',
            )}
          </p>
        </div>
      )}
    </section>
  );
}
