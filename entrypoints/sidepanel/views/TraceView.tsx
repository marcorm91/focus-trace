import { useEffect, useMemo, useRef, useState } from 'react';
import { browser } from '#imports';
import type { FocusJourney } from '../../../lib/runtime/focus-journey';
import type { FocusGraph } from '../../../lib/runtime/focus-graph';
import {
  buildFocusTransitionSemantics,
  focusTransitionSemanticCopy,
  focusTransitionSemanticIcon,
  focusTransitionSemanticsForEvent,
  primaryFocusTransitionSemantic,
} from '../../../lib/runtime/focus-transition-semantics';
import { explanationForCause, humanInteractionTitle, type ExplanationLevel } from '../../../lib/runtime/explanations';
import { focusDirectionLabel } from '../../../lib/runtime/runtime-presentation';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type {
  ExtensionMessage,
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
import './trace-reset.css';
import './trace-polish.css';
import './transition-semantics.css';

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
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string>();
  const previousRecording = useRef(recording);
  const resetDialogRef = useRef<HTMLDialogElement>(null);
  const cancelResetRef = useRef<HTMLButtonElement>(null);
  const correlatedInteractions = interactions.filter((interaction) => interaction.correlated);
  const recentInteractions = correlatedInteractions.slice(-6);
  const findings = events.filter((event) => event.outcome != null);
  const latestCause = [...correlatedInteractions].reverse().find((interaction) => interaction.causes.length > 0)?.causes[0];
  const latestExplanation = latestCause ? explanationForCause(latestCause.type, language) : undefined;
  const transitionSemantics = useMemo(
    () => buildFocusTransitionSemantics(events, interactions, journey),
    [events, interactions, journey],
  );
  const hasSessionEvidence = events.length > 0;

  useEffect(() => {
    if (previousRecording.current && !recording && events.length > 0) setMode('replay');
    previousRecording.current = recording;
  }, [events.length, recording]);

  useEffect(() => {
    const dialog = resetDialogRef.current;
    if (!dialog) return;

    if (resetDialogOpen && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => cancelResetRef.current?.focus());
      return;
    }

    if (!resetDialogOpen && dialog.open) dialog.close();
  }, [resetDialogOpen]);

  const resetSession = async () => {
    if (!hasSessionEvidence || recording || busy || resetting) return;
    setResetting(true);
    setResetError(undefined);

    try {
      try {
        if (pathVisible) await onTogglePath();
        else await onClearSelection();
      } catch {
        // The recorded page may already have navigated away. Session reset must still succeed.
      }

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id == null) throw new Error('No active tab is available.');

      await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_CLEAR_SESSION',
        tabId: tab.id,
      } satisfies ExtensionMessage);

      setMode('journey');
      setResetDialogOpen(false);
    } catch {
      setResetError(tr(
        language,
        'Could not reset this Trace session. Try again.',
        'No se pudo reiniciar esta sesión de Trace. Inténtalo de nuevo.',
      ));
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="trace-workspace" aria-labelledby="trace-title">
      <div className={`trace-hero ${recording ? 'is-recording' : ''}`}>
        <div className="trace-hero-copy">
          <h2 id="trace-title">{tr(language, 'Trace real interactions', 'Traza interacciones reales')}</h2>
          <p>
            {recording
              ? tr(
                  language,
                  'Recording. Return to the page and interact normally.',
                  'Grabando. Vuelve a la página e interactúa con normalidad.',
                )
              : tr(
                  language,
                  'Record the journey, then inspect focus, interactions and page changes.',
                  'Graba el recorrido y después revisa foco, interacciones y cambios de página.',
                )}
          </p>
        </div>
        <div className="trace-hero-actions">
          <button
            className={recording ? 'trace-record stop' : 'trace-record start'}
            type="button"
            title={recording
              ? tr(language, 'Stop the current Trace recording', 'Detener la grabación actual de Trace')
              : tr(language, 'Start recording a new Trace session', 'Iniciar la grabación de una nueva sesión de Trace')}
            disabled={busy}
            onClick={() => void onToggleRecording()}
          >
            <span className="trace-button-icon" aria-hidden="true">{recording ? '■' : '▶'}</span>
            {recording
              ? tr(language, 'Stop trace', 'Detener traza')
              : tr(language, 'Start trace', 'Iniciar traza')}
          </button>
          <button
            className="trace-reset"
            type="button"
            title={tr(language, 'Clear the current runtime session', 'Borrar la sesión runtime actual')}
            disabled={!hasSessionEvidence || recording || busy || resetting}
            onClick={() => {
              setResetError(undefined);
              setResetDialogOpen(true);
            }}
          >
            <span className="trace-button-icon" aria-hidden="true">↻</span>
            {tr(language, 'Reset session', 'Reiniciar sesión')}
          </button>
        </div>
      </div>

      {resetError && <div className="trace-reset-error" role="alert">{resetError}</div>}

      <dialog
        ref={resetDialogRef}
        className="trace-reset-dialog"
        aria-labelledby="trace-reset-title"
        aria-describedby="trace-reset-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!resetting) setResetDialogOpen(false);
        }}
        onClose={() => setResetDialogOpen(false)}
      >
        <div className="trace-reset-dialog-copy">
          <p className="eyebrow">{tr(language, 'Current Trace', 'Trace actual')}</p>
          <h3 id="trace-reset-title">{tr(language, 'Reset current session?', '¿Reiniciar la sesión actual?')}</h3>
          <p id="trace-reset-description">
            {tr(
              language,
              'This clears recorded interactions, the focus journey and Replay evidence. The latest page analysis and breakpoint settings are kept.',
              'Esto borra las interacciones grabadas, el recorrido de foco y la evidencia de Replay. Se conservan el último análisis de página y los breakpoints.',
            )}
          </p>
        </div>
        <div className="trace-reset-dialog-actions">
          <button
            ref={cancelResetRef}
            type="button"
            disabled={resetting}
            onClick={() => setResetDialogOpen(false)}
          >
            {tr(language, 'Cancel', 'Cancelar')}
          </button>
          <button
            className="trace-reset-confirm"
            type="button"
            disabled={resetting}
            onClick={() => void resetSession()}
          >
            {resetting
              ? tr(language, 'Resetting…', 'Reiniciando…')
              : tr(language, 'Reset session', 'Reiniciar sesión')}
          </button>
        </div>
      </dialog>

      <div className="trace-metrics" aria-label={tr(language, 'Trace summary', 'Resumen de la traza')}>
        <span><strong>{journey.steps.length}</strong>{tr(language, 'Focus steps', 'Pasos de foco')}</span>
        <span><strong>{correlatedInteractions.length}</strong>{tr(language, 'Interactions', 'Interacciones')}</span>
        <span className={findings.length ? 'has-signal' : ''}><strong>{findings.length}</strong>{tr(language, 'Signals', 'Señales')}</span>
        <span><strong>{transitionSemantics.length}</strong>{tr(language, 'Interpreted transitions', 'Transiciones interpretadas')}</span>
      </div>

      {journey.steps.length > 0 && (
        <details className="trace-accordion trace-journey-accordion" open>
          <summary title={tr(language, 'Expand or collapse the current focus journey', 'Expandir o contraer el recorrido de foco actual')}>
            <span className="trace-accordion-icon" aria-hidden="true">⇥</span>
            <span className="trace-accordion-copy">
              <small>{tr(language, 'Current journey', 'Recorrido actual')}</small>
              <strong>{tr(language, 'Observed focus flow', 'Flujo de foco observado')}</strong>
            </span>
            <span className="trace-accordion-count">{journey.steps.length}</span>
          </summary>
          <div className="trace-accordion-body">
            <div className="trace-journey-toolbar">
              <p>{tr(
                language,
                'Select a step to locate the recorded focus target on the current page.',
                'Selecciona un paso para localizar el destino de foco grabado en la página actual.',
              )}</p>
              <button
                type="button"
                disabled={recording || pathSteps === 0}
                aria-pressed={pathVisible}
                title={pathVisible
                  ? tr(language, 'Hide the recorded focus path on the page', 'Ocultar el recorrido de foco grabado en la página')
                  : tr(language, 'Show the recorded focus path on the page', 'Mostrar el recorrido de foco grabado en la página')}
                onClick={() => void onTogglePath()}
              >
                <span aria-hidden="true">{pathVisible ? '◉' : '◎'}</span>
                {pathVisible
                  ? tr(language, 'Hide on page', 'Ocultar en página')
                  : tr(language, 'Show on page', 'Mostrar en página')}
              </button>
            </div>
            <ol className="trace-flow-list" aria-label={tr(language, 'Recorded focus steps', 'Pasos de foco grabados')}>
              {journey.steps.map((step) => {
                const selected = step.element.selector === selectedSelector;
                const name = step.element.name || step.element.role || step.element.tag;
                const stepSemantics = focusTransitionSemanticsForEvent(transitionSemantics, step.id);
                const primarySemantic = primaryFocusTransitionSemantic(stepSemantics);
                const primaryCopy = primarySemantic
                  ? focusTransitionSemanticCopy(primarySemantic, language)
                  : undefined;
                const directionLabel = focusDirectionLabel(step.direction, language);
                const locateTitle = tr(
                  language,
                  `Locate focus step ${step.order} on the page`,
                  `Localizar el paso de foco ${step.order} en la página`,
                );
                return (
                  <li
                    key={step.id}
                    className={`${step.event.outcome ? 'has-signal ' : ''}${primarySemantic ? `semantic-${primarySemantic.tone}` : ''}`.trim()}
                  >
                    <span
                      className={`trace-direction direction-${step.direction}`}
                      aria-label={directionLabel}
                      title={directionLabel}
                    >
                      {primarySemantic ? focusTransitionSemanticIcon(primarySemantic) : directionSymbol(step.direction)}
                    </span>
                    <button
                      className="trace-step-button"
                      type="button"
                      aria-current={selected ? 'step' : undefined}
                      onClick={() => void onSelectStep(step.element.selector)}
                      title={primaryCopy ? `${locateTitle} · ${primaryCopy.detail}` : locateTitle}
                    >
                      <strong className="trace-step-number">{step.order}</strong>
                      <span className="trace-step-copy">
                        <span>{name}</span>
                        <small>
                          {step.element.role ?? step.element.tag}
                          {primaryCopy ? ` · ${primaryCopy.label}` : ''}
                        </small>
                      </span>
                      {primarySemantic && (
                        <span className={`trace-step-semantic ${primarySemantic.tone}`} aria-label={primaryCopy?.label}>
                          {focusTransitionSemanticIcon(primarySemantic)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </details>
      )}

      {correlatedInteractions.length > 0 && (
        <details className="trace-accordion trace-interactions-accordion">
          <summary title={tr(language, 'Expand or collapse interaction history', 'Expandir o contraer el historial de interacciones')}>
            <span className="trace-accordion-icon" aria-hidden="true">⚡</span>
            <span className="trace-accordion-copy">
              <small>{tr(language, 'Interaction history', 'Historial de interacciones')}</small>
              <strong>{tr(language, 'Actions that produced this journey', 'Acciones que produjeron este recorrido')}</strong>
            </span>
            <span className="trace-accordion-count">{correlatedInteractions.length}</span>
          </summary>
          <div className="trace-accordion-body trace-interaction-strip">
            <ol>
              {recentInteractions.map((interaction, index) => (
                <li key={interaction.id} className={interaction.causes.length ? 'has-signal' : ''}>
                  <span>{correlatedInteractions.length - recentInteractions.length + index + 1}</span>
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
            {correlatedInteractions.length > recentInteractions.length && (
              <p className="trace-accordion-note">
                {tr(
                  language,
                  `Showing the latest ${recentInteractions.length} interactions. Open Interactions below for the complete history.`,
                  `Se muestran las últimas ${recentInteractions.length} interacciones. Abre Interacciones abajo para consultar el historial completo.`,
                )}
              </p>
            )}
          </div>
        </details>
      )}

      {latestExplanation && (
        <details className="trace-accordion trace-signal-accordion">
          <summary title={tr(language, 'Expand or collapse the latest explained signal', 'Expandir o contraer la última señal explicada')}>
            <span className="trace-accordion-icon signal" aria-hidden="true">!</span>
            <span className="trace-accordion-copy">
              <small>{tr(language, 'Latest explained signal', 'Última señal explicada')}</small>
              <strong>{latestExplanation.title}</strong>
            </span>
            <span className="trace-accordion-count signal">1</span>
          </summary>
          <div className="trace-accordion-body trace-cause-body">
            <p>{latestExplanation.summary}</p>
            <p><strong>{tr(language, 'Why it matters:', 'Por qué importa:')}</strong> {latestExplanation.impact}</p>
          </div>
        </details>
      )}

      <div className="trace-mode-switcher" role="tablist" aria-label={tr(language, 'Trace inspector', 'Inspector de traza')}>
        <button
          type="button"
          role="tab"
          title={tr(language, 'Inspect the recorded evidence step by step', 'Inspeccionar la evidencia grabada paso a paso')}
          aria-selected={mode === 'replay'}
          className={mode === 'replay' ? 'active' : ''}
          onClick={() => setMode('replay')}
        >
          <span className="trace-tab-icon" aria-hidden="true">↶</span>
          <span className="trace-tab-label">{tr(language, 'Replay', 'Replay')}</span>
          {events.length > 0 && <span className="trace-tab-count">{events.length}</span>}
        </button>
        <button
          type="button"
          role="tab"
          title={tr(language, 'Inspect the focus journey', 'Inspeccionar el recorrido de foco')}
          aria-selected={mode === 'journey'}
          className={mode === 'journey' ? 'active' : ''}
          onClick={() => setMode('journey')}
        >
          <span className="trace-tab-icon" aria-hidden="true">⇥</span>
          <span className="trace-tab-label">{tr(language, 'Journey', 'Recorrido')}</span>
        </button>
        <button
          type="button"
          role="tab"
          title={tr(language, 'Inspect correlated runtime interactions', 'Inspeccionar las interacciones runtime correlacionadas')}
          aria-selected={mode === 'interactions'}
          className={mode === 'interactions' ? 'active' : ''}
          onClick={() => setMode('interactions')}
        >
          <span className="trace-tab-icon" aria-hidden="true">⚡</span>
          <span className="trace-tab-label">{tr(language, 'Interactions', 'Interacciones')}</span>
          {findings.length > 0 && <span className="trace-tab-count">{findings.length}</span>}
        </button>
        <button
          type="button"
          role="tab"
          title={tr(language, 'Inspect the focus graph', 'Inspeccionar el grafo de foco')}
          aria-selected={mode === 'graph'}
          className={mode === 'graph' ? 'active' : ''}
          onClick={() => setMode('graph')}
        >
          <span className="trace-tab-icon" aria-hidden="true">⠿</span>
          <span className="trace-tab-label">{tr(language, 'Graph', 'Grafo')}</span>
        </button>
      </div>

      <div className="trace-inspector" role="tabpanel">
        {mode === 'replay' && (
          <ReplayView
            events={events}
            interactions={interactions}
            journey={journey}
            semantics={transitionSemantics}
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
            semantics={transitionSemantics}
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
