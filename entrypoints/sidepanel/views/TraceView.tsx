import { useEffect, useMemo, useRef, useState } from 'react';
import type { FocusJourney } from '../../../lib/runtime/focus-journey';
import type { FocusGraph } from '../../../lib/runtime/focus-graph';
import { explanationForCause, humanInteractionTitle, type ExplanationLevel } from '../../../lib/runtime/explanations';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type {
  RuntimeBreakpointHit,
  RuntimeBreakpointId,
  RuntimeBreakpointSettings,
  RuntimeEvent,
  RuntimeInteraction,
} from '../../../shared/types';
import { FocusGraphView } from './FocusGraphView';
import { FocusView } from './FocusView';
import { ReplayView } from './ReplayView';
import { RuntimeView } from './RuntimeView';
import './trace.css';

type TraceMode = 'replay' | 'journey' | 'interactions' | 'graph';

function directionSymbol(direction: FocusJourney['steps'][number]['direction']): string {
  if (direction === 'backward') return '↩';
  if (direction === 'repeat') return '↺';
  if (direction === 'wrap') return '↻';
  if (direction === 'jump') return '⇢';
  if (direction === 'forward') return '→';
  return '●';
}

export function TraceView({
  journey,
  graph,
  events,
  interactions,
  pathSteps,
  pathVisible,
  recording,
  busy,
  selectedSelector,
  breakpointSettings,
  pausedByBreakpoint,
  level,
  language,
  page,
  onTogglePath,
  onToggleRecording,
  onSelectStep,
  onClearSelection,
  onBreakpointChange,
}: {
  journey: FocusJourney;
  graph: FocusGraph;
  events: RuntimeEvent[];
  interactions: RuntimeInteraction[];
  pathSteps: number;
  pathVisible: boolean;
  recording: boolean;
  busy: boolean;
  selectedSelector?: string | undefined;
  breakpointSettings: RuntimeBreakpointSettings;
  pausedByBreakpoint?: RuntimeBreakpointHit | undefined;
  level: ExplanationLevel;
  language: AppLanguage;
  page?: { url?: string; title?: string } | undefined;
  onTogglePath: () => void | Promise<void>;
  onToggleRecording: () => void | Promise<void>;
  onSelectStep: (selector: string) => void | Promise<void>;
  onClearSelection: () => void | Promise<void>;
  onBreakpointChange: (breakpointId: RuntimeBreakpointId, enabled: boolean) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<TraceMode>('journey');
  const previousRecording = useRef(recording);
  const correlatedInteractions = interactions.filter((interaction) => interaction.correlated);
  const findings = events.filter((event) => event.outcome != null);
  const causalInteractions = correlatedInteractions.filter((interaction) => interaction.causes.length > 0);
  const latestCause = [...correlatedInteractions].reverse().find((interaction) => interaction.causes.length > 0)?.causes[0];
  const latestExplanation = latestCause ? explanationForCause(latestCause.type, language) : undefined;

  const previewSteps = useMemo(() => journey.steps.slice(-10), [journey.steps]);

  useEffect(() => {
    if (previousRecording.current && !recording && events.length > 0) setMode('replay');
    previousRecording.current = recording;
  }, [events.length, recording]);

  return (
    <section className="trace-workspace" aria-labelledby="trace-title">
      <div className={`trace-hero ${recording ? 'is-recording' : ''}`}>
        <div className="trace-hero-copy">
          <p className="eyebrow">{tr(language, 'Runtime accessibility debugger', 'Depurador de accesibilidad runtime')}</p>
          <h2 id="trace-title">{tr(language, 'Trace what happened, not only what failed', 'Traza qué ocurrió, no solo qué falló')}</h2>
          <p>
            {recording
              ? tr(
                  language,
                  'Recording is active. Return to the page and use it normally; FocusTrace will correlate actions, focus, DOM changes and navigation.',
                  'La grabación está activa. Vuelve a la página y úsala con normalidad; FocusTrace correlacionará acciones, foco, cambios DOM y navegación.',
                )
              : tr(
                  language,
                  'Record a real journey to connect user actions with focus movement, dynamic DOM changes and SPA navigation.',
                  'Graba un recorrido real para conectar las acciones del usuario con el movimiento del foco, cambios dinámicos del DOM y navegación SPA.',
                )}
          </p>
        </div>
        <button
          className={recording ? 'trace-record stop' : 'trace-record primary'}
          type="button"
          disabled={busy}
          onClick={() => void onToggleRecording()}
        >
          <span className="record-icon" aria-hidden="true" />
          {recording
            ? tr(language, 'Stop trace', 'Detener traza')
            : tr(language, 'Start trace', 'Iniciar traza')}
        </button>
      </div>

      <div className="trace-metrics" aria-label={tr(language, 'Trace summary', 'Resumen de la traza')}>
        <span><strong>{journey.steps.length}</strong>{tr(language, 'Focus steps', 'Pasos de foco')}</span>
        <span><strong>{correlatedInteractions.length}</strong>{tr(language, 'Interactions', 'Interacciones')}</span>
        <span className={findings.length ? 'has-signal' : ''}><strong>{findings.length}</strong>{tr(language, 'Signals', 'Señales')}</span>
        <span><strong>{causalInteractions.length}</strong>{tr(language, 'Explained causes', 'Causas explicadas')}</span>
      </div>

      {previewSteps.length > 0 && (
        <section className="trace-preview" aria-labelledby="trace-preview-title">
          <div className="trace-preview-heading">
            <div>
              <p className="eyebrow">{tr(language, 'Current journey', 'Recorrido actual')}</p>
              <h3 id="trace-preview-title">{tr(language, 'Observed focus flow', 'Flujo de foco observado')}</h3>
            </div>
            <button type="button" disabled={recording || pathSteps === 0} aria-pressed={pathVisible} onClick={() => void onTogglePath()}>
              {pathVisible
                ? tr(language, 'Hide on page', 'Ocultar en página')
                : tr(language, 'Show on page', 'Mostrar en página')}
            </button>
          </div>
          <ol className="trace-flow" aria-label={tr(language, 'Latest focus steps', 'Últimos pasos de foco')}>
            {previewSteps.map((step) => {
              const selected = step.element.selector === selectedSelector;
              const name = step.element.name || step.element.role || step.element.tag;
              return (
                <li key={step.id} className={step.event.outcome ? 'has-signal' : ''}>
                  <span className={`trace-direction direction-${step.direction}`} aria-label={step.direction}>{directionSymbol(step.direction)}</span>
                  <button
                    type="button"
                    aria-current={selected ? 'step' : undefined}
                    onClick={() => void onSelectStep(step.element.selector)}
                  >
                    <strong>{step.order}</strong>
                    <span>{name}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {latestExplanation && (
        <section className="trace-cause" aria-labelledby="trace-cause-title">
          <div className="trace-cause-marker" aria-hidden="true">!</div>
          <div>
            <p className="eyebrow">{tr(language, 'Latest explained signal', 'Última señal explicada')}</p>
            <h3 id="trace-cause-title">{latestExplanation.title}</h3>
            <p>{latestExplanation.summary}</p>
            <p><strong>{tr(language, 'Why it matters:', 'Por qué importa:')}</strong> {latestExplanation.impact}</p>
          </div>
        </section>
      )}

      {correlatedInteractions.length > 0 && (
        <section className="trace-interaction-strip" aria-labelledby="trace-interactions-title">
          <div className="trace-preview-heading">
            <div>
              <p className="eyebrow">{tr(language, 'Interaction history', 'Historial de interacciones')}</p>
              <h3 id="trace-interactions-title">{tr(language, 'Actions that produced this journey', 'Acciones que produjeron este recorrido')}</h3>
            </div>
          </div>
          <ol>
            {correlatedInteractions.slice(-4).map((interaction, index) => (
              <li key={interaction.id} className={interaction.causes.length ? 'has-signal' : ''}>
                <span>{correlatedInteractions.length - Math.min(4, correlatedInteractions.length) + index + 1}</span>
                <div>
                  <strong>{humanInteractionTitle(interaction, language)}</strong>
                  <small>
                    {interaction.causes[0]
                      ? explanationForCause(interaction.causes[0].type, language).title
                      : tr(language, `${interaction.events.length} correlated events`, `${interaction.events.length} eventos correlacionados`)}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="trace-mode-switcher" role="tablist" aria-label={tr(language, 'Trace inspector', 'Inspector de traza')}>
        <button type="button" role="tab" aria-selected={mode === 'replay'} className={mode === 'replay' ? 'active' : ''} onClick={() => setMode('replay')}>
          {tr(language, 'Replay', 'Replay')}
          {events.length > 0 && <span>{events.length}</span>}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'journey'} className={mode === 'journey' ? 'active' : ''} onClick={() => setMode('journey')}>
          {tr(language, 'Journey', 'Recorrido')}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'interactions'} className={mode === 'interactions' ? 'active' : ''} onClick={() => setMode('interactions')}>
          {tr(language, 'Interactions', 'Interacciones')}
          {findings.length > 0 && <span>{findings.length}</span>}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'graph'} className={mode === 'graph' ? 'active' : ''} onClick={() => setMode('graph')}>
          {tr(language, 'Graph', 'Grafo')}
        </button>
      </div>

      <div className="trace-inspector" role="tabpanel">
        {mode === 'replay' && (
          <ReplayView
            events={events}
            interactions={interactions}
            journey={journey}
            recording={recording}
            level={level}
            language={language}
            onSelectFocusTarget={onSelectStep}
            onClearFocusTarget={onClearSelection}
          />
        )}
        {mode === 'journey' && (
          <FocusView
            journey={journey}
            pathSteps={pathSteps}
            pathVisible={pathVisible}
            recording={recording}
            busy={busy}
            selectedSelector={selectedSelector}
            onTogglePath={onTogglePath}
            onToggleRecording={onToggleRecording}
            onSelectStep={onSelectStep}
            language={language}
          />
        )}
        {mode === 'interactions' && (
          <RuntimeView
            events={events}
            interactions={interactions}
            recording={recording}
            breakpointSettings={breakpointSettings}
            pausedByBreakpoint={pausedByBreakpoint}
            onBreakpointChange={onBreakpointChange}
            level={level}
            language={language}
          />
        )}
        {mode === 'graph' && (
          <FocusGraphView
            graph={graph}
            interactions={interactions}
            level={level}
            language={language}
            page={page}
            pathVisible={pathVisible}
            recording={recording}
            selectedPageNodeId={selectedSelector}
            onTogglePath={onTogglePath}
            onSelectPageNode={onSelectStep}
            onClearPageNode={onClearSelection}
          />
        )}
      </div>
    </section>
  );
}
