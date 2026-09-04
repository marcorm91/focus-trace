import { useEffect, useMemo, useState } from 'react';
import { browser } from '#imports';
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
import { humanRuntimeEventDetail } from '../../../lib/runtime/runtime-presentation';
import {
  clearScanTargetHighlightInPage,
  locateScanTargetInPage,
  type ScanTargetHighlightTone,
} from '../../../lib/runtime/scan-target-overlay';
import { localeFor, tr, type AppLanguage } from '../../../shared/i18n';
import type { RuntimeEvent, RuntimeInteraction } from '../../../shared/types';
import { ActionableRemediation } from '../components/ActionableRemediation';
import { Empty, ReferenceList } from '../components/Common';

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

interface ReplayHighlightPresentation {
  tone: ScanTargetHighlightTone;
  label: string;
  detail: string;
}

function replayHighlightPresentation(
  event: RuntimeEvent,
  semantics: FocusTransitionSemantic[],
  hasCause: boolean,
  language: AppLanguage,
): ReplayHighlightPresentation {
  if (event.outcome === 'fail') {
    return {
      tone: 'fail',
      label: tr(language, `Failure${event.ruleId ? ` · ${event.ruleId}` : ''}`, `Fallo${event.ruleId ? ` · ${event.ruleId}` : ''}`),
      detail: tr(language, 'A deterministic failure is linked to this recorded step.', 'Este paso grabado tiene asociado un fallo determinista.'),
    };
  }

  if (event.outcome === 'review' || event.outcome === 'warning' || hasCause || semantics.some((semantic) => semantic.tone === 'review')) {
    return {
      tone: 'review',
      label: tr(language, `Review${event.ruleId ? ` · ${event.ruleId}` : ''}`, `Revisar${event.ruleId ? ` · ${event.ruleId}` : ''}`),
      detail: tr(language, 'This step contains evidence that needs review.', 'Este paso contiene evidencia que necesita revisión.'),
    };
  }

  if (semantics.some((semantic) => semantic.tone === 'positive')) {
    return {
      tone: 'ok',
      label: tr(language, 'Handled transition', 'Transición gestionada'),
      detail: tr(language, 'The recorded focus transition was handled as expected.', 'La transición de foco grabada se gestionó como se esperaba.'),
    };
  }

  return {
    tone: 'ok',
    label: tr(language, 'No signal on this step', 'Sin señal en este paso'),
    detail: tr(
      language,
      'FocusTrace did not record a failure or review signal for this step. This is not a complete WCAG pass.',
      'FocusTrace no registró un fallo ni una señal de revisión en este paso. Esto no equivale a superar WCAG por completo.',
    ),
  };
}

export function ReplayView({
  events,
  interactions,
  journey,
  semantics,
  recording,
  level,
  language,
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
  const [pageTargetFound, setPageTargetFound] = useState<boolean>();

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
  const highlight = current
    ? replayHighlightPresentation(current.event, currentSemantics, Boolean(current.cause), language)
    : undefined;

  useEffect(() => {
    let cancelled = false;

    const clearHighlight = async () => {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id == null) return;
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: clearScanTargetHighlightInPage,
      }).catch(() => undefined);
    };

    if (recording || !current?.target || !highlight) {
      setPageTargetFound(undefined);
      void clearHighlight();
      return () => {
        cancelled = true;
      };
    }

    setPageTargetFound(undefined);
    void (async () => {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id == null || cancelled) return;
      const results = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: locateScanTargetInPage,
        args: [current.target!.selector, {
          tone: highlight.tone,
          label: highlight.label,
          focusTarget: false,
          durationMs: 0,
        }],
      });
      if (!cancelled) setPageTargetFound(Boolean(results[0]?.result?.found));
    })().catch(() => {
      if (!cancelled) setPageTargetFound(false);
    });

    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.target?.selector, highlight?.label, highlight?.tone, recording]);

  useEffect(() => () => {
    void browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id == null) return;
      return browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: clearScanTargetHighlightInPage,
      });
    }).catch(() => undefined);
  }, []);

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

  if (!current || !highlight) return null;

  const eventTitle = humanRuntimeEventTitle(current.event, language);
  const eventDetail = humanRuntimeEventDetail(current.event, language);
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
            'Previous, Next and the timeline inspect the recorded chain and highlight the current target without moving focus.',
            'Anterior, Siguiente y la línea temporal inspeccionan la cadena grabada y resaltan el destino actual sin mover el foco.',
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

        {eventDetail && <p className="replay-detail">{eventDetail}</p>}
        {current.event.outcome && (
          <ActionableRemediation ruleId={current.event.ruleId} language={language} />
        )}

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
            <span
              className={`replay-target-state tone-${highlight.tone}`}
              title={highlight.detail}
            >
              {highlight.label}
            </span>
            <span className={pageTargetFound ? 'replay-page-sync available' : 'replay-page-sync'}>
              {pageTargetFound
                ? tr(language, 'Highlighted on the current page', 'Resaltado en la página actual')
                : pageTargetFound === false
                  ? tr(language, 'Historical evidence only', 'Solo evidencia histórica')
                  : linkedToFocusPath
                    ? tr(language, 'Locating recorded target…', 'Localizando destino grabado…')
                    : tr(language, 'Checking the current page…', 'Comprobando la página actual…')}
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
    </section>
  );
}
