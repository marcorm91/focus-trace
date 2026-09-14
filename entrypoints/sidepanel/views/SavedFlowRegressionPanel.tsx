import { useEffect, useMemo, useState } from 'react';
import { browser } from '#imports';
import { resolveFindingTargetInPage } from '../../../lib/runtime/finding-recheck-page';
import {
  buildSavedUserFlow,
  compareSavedFlowFindings,
  savedFlowBrokenFlow,
  savedFlowCurrentFindings,
  savedFlowMissingElement,
  type SavedFlowRegressionResult,
  type SavedFlowStep,
  type SavedFlowTargetSignature,
  type SavedUserFlow,
} from '../../../lib/runtime/saved-flow';
import {
  executeSavedFlowActionInPage,
  inspectSavedFlowTargetInPage,
} from '../../../lib/runtime/saved-flow-page';
import {
  clearSavedUserFlows,
  deleteSavedUserFlow,
  listSavedUserFlows,
  saveUserFlow,
} from '../../../lib/runtime/saved-flow-storage';
import { sanitizeRuntimeUrl } from '../../../lib/runtime/url-privacy';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type {
  ExtensionMessage,
  RuntimeBreakpointSettings,
  RuntimeEvent,
  RuntimeInteraction,
  SessionState,
} from '../../../shared/types';
import './saved-flow-regression.css';

type RunState = 'idle' | 'running' | 'manual-stop' | 'complete' | 'failed';

function targetLabel(target: SavedFlowTargetSignature | undefined, language: AppLanguage): string {
  if (!target) return tr(language, 'page context', 'contexto de página');
  return target.id ? `#${target.id}` : target.role ?? target.tag ?? tr(language, 'saved target', 'destino guardado');
}

function resultLabel(state: SavedFlowRegressionResult['state'], language: AppLanguage): string {
  if (state === 'new') return tr(language, 'New', 'Nuevo');
  if (state === 'resolved') return tr(language, 'Resolved', 'Resuelto');
  if (state === 'persistent') return tr(language, 'Persistent', 'Persistente');
  if (state === 'changed') return tr(language, 'Changed', 'Cambiado');
  if (state === 'missing-element') return tr(language, 'Missing element', 'Elemento ausente');
  return tr(language, 'Broken flow', 'Flujo roto');
}

function manualInstruction(step: SavedFlowStep, language: AppLanguage): string {
  if (step.type !== 'action') return '';
  const target = targetLabel(step.target, language);
  if (step.sourceEventKind === 'click') {
    return tr(language, `Perform the saved click manually on ${target}.`, `Realiza manualmente el clic guardado sobre ${target}.`);
  }
  if (step.sourceEventKind === 'input-change') {
    return tr(
      language,
      `Repeat the input change manually on ${target}. FocusTrace never stored the field value.`,
      `Repite manualmente el cambio de campo sobre ${target}. FocusTrace nunca guardó el valor del campo.`,
    );
  }
  return tr(
    language,
    `Press ${step.key || 'the saved key'} manually on ${target}.`,
    `Pulsa manualmente ${step.key || 'la tecla guardada'} sobre ${target}.`,
  );
}

async function activeTabId(): Promise<number> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) throw new Error('No active tab is available.');
  return tab.id;
}

async function resolveTarget(tabId: number, target: SavedFlowTargetSignature) {
  const [result] = await browser.scripting.executeScript({
    target: { tabId },
    func: resolveFindingTargetInPage,
    args: [{
      locator: target.locator,
      ...(target.tag ? { tag: target.tag } : {}),
      ...(target.id ? { id: target.id } : {}),
      ...(target.role ? { role: target.role } : {}),
    }],
  });
  return result?.result;
}

async function startRegressionRecording(tabId: number, breakpoints: RuntimeBreakpointSettings): Promise<number> {
  await browser.runtime.sendMessage({ type: 'FOCUSTRACE_ENSURE_INJECTED', tabId, mode: 'trace' } satisfies ExtensionMessage);
  await browser.runtime.sendMessage({ type: 'FOCUSTRACE_CLEAR_SESSION', tabId } satisfies ExtensionMessage);
  const startedAt = Date.now();
  await browser.runtime.sendMessage({
    type: 'FOCUSTRACE_SET_RECORDING_STATE',
    tabId,
    enabled: true,
    startedAt,
  } satisfies ExtensionMessage);
  try {
    await browser.tabs.sendMessage(tabId, {
      type: 'FOCUSTRACE_SET_RECORDING',
      enabled: true,
      breakpoints,
    } satisfies ExtensionMessage);
  } catch (reason) {
    await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_SET_RECORDING_STATE',
      tabId,
      enabled: false,
    } satisfies ExtensionMessage).catch(() => undefined);
    throw reason;
  }
  return startedAt;
}

async function stopRegressionRecording(tabId: number, breakpoints: RuntimeBreakpointSettings): Promise<SessionState> {
  await browser.runtime.sendMessage({ type: 'FOCUSTRACE_FLUSH_SESSION', tabId } satisfies ExtensionMessage).catch(() => undefined);
  await browser.tabs.sendMessage(tabId, {
    type: 'FOCUSTRACE_SET_RECORDING',
    enabled: false,
    breakpoints,
  } satisfies ExtensionMessage).catch(() => undefined);
  await browser.runtime.sendMessage({
    type: 'FOCUSTRACE_SET_RECORDING_STATE',
    tabId,
    enabled: false,
  } satisfies ExtensionMessage);
  await browser.runtime.sendMessage({ type: 'FOCUSTRACE_FLUSH_SESSION', tabId } satisfies ExtensionMessage).catch(() => undefined);
  return (await browser.runtime.sendMessage({
    type: 'FOCUSTRACE_GET_SESSION',
    tabId,
  } satisfies ExtensionMessage)) as SessionState;
}

export function SavedFlowRegressionPanel({
  events,
  interactions,
  recording,
  breakpoints,
  language,
}: {
  events: RuntimeEvent[];
  interactions: RuntimeInteraction[];
  recording: boolean;
  breakpoints: RuntimeBreakpointSettings;
  language: AppLanguage;
}) {
  const [flows, setFlows] = useState<SavedUserFlow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [runState, setRunState] = useState<RunState>('idle');
  const [runIndex, setRunIndex] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState<number>();
  const [manualStep, setManualStep] = useState<SavedFlowStep>();
  const [results, setResults] = useState<SavedFlowRegressionResult[]>([]);
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => flows.find((flow) => flow.id === selectedId), [flows, selectedId]);
  const canSave = events.length > 0 && !recording && !busy;

  useEffect(() => {
    void listSavedUserFlows().then((stored) => {
      setFlows(stored);
      if (stored.length) setSelectedId((current) => current || stored[0]!.id);
    }).catch(() => setMessage(tr(
      language,
      'Saved flows could not be read from local storage.',
      'No se pudieron leer los flujos guardados del almacenamiento local.',
    )));
  }, [language]);

  const saveCurrent = async () => {
    if (!canSave) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const tabId = await activeTabId();
      const tab = await browser.tabs.get(tabId);
      const id = `flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const flow = buildSavedUserFlow({
        id,
        name: name.trim() || tr(language, 'Saved accessibility flow', 'Flujo de accesibilidad guardado'),
        events,
        interactions,
        ...(tab.url ? { sourceUrl: tab.url } : {}),
      });
      const next = await saveUserFlow(flow);
      setFlows(next);
      setSelectedId(flow.id);
      setName('');
      setMessage(tr(
        language,
        'Flow saved locally. Field values and sensitive page text were not stored.',
        'Flujo guardado en local. No se han almacenado valores de campos ni texto sensible de la página.',
      ));
    } catch {
      setMessage(tr(language, 'Could not save this flow.', 'No se pudo guardar este flujo.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected || busy || runState === 'running' || runState === 'manual-stop') return;
    setBusy(true);
    try {
      const next = await deleteSavedUserFlow(selected.id);
      setFlows(next);
      setSelectedId(next[0]?.id ?? '');
      setResults([]);
      setRunState('idle');
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!flows.length || busy || runState === 'running' || runState === 'manual-stop') return;
    setBusy(true);
    try {
      await clearSavedUserFlows();
      setFlows([]);
      setSelectedId('');
      setResults([]);
      setRunState('idle');
    } finally {
      setBusy(false);
    }
  };

  const finish = async (
    tabId: number,
    flow: SavedUserFlow,
    startedAt: number,
    failure?: SavedFlowRegressionResult,
  ) => {
    const session = await stopRegressionRecording(tabId, breakpoints);
    const current = savedFlowCurrentFindings(session.events.filter((event) => event.timestamp >= startedAt));
    const comparison = compareSavedFlowFindings(flow.baselineFindings, current);
    setResults(failure ? [failure, ...comparison] : comparison);
    setRunState(failure ? 'failed' : 'complete');
    setManualStep(undefined);
    setMessage(failure
      ? tr(language, 'Replay stopped safely. No later steps were assumed.', 'El replay se detuvo de forma segura. No se asumieron pasos posteriores.')
      : tr(language, 'Regression replay completed.', 'Replay de regresión completado.'));
  };

  const runFrom = async (flow: SavedUserFlow, startIndex: number, startedAt: number, tabId: number) => {
    setRunState('running');
    for (let index = startIndex; index < flow.steps.length; index += 1) {
      setRunIndex(index);
      const step = flow.steps[index]!;

      if (step.type === 'action') {
        if (step.policy === 'manual-stop') {
          setManualStep(step);
          setRunState('manual-stop');
          setMessage(manualInstruction(step, language));
          return;
        }
        if (!step.target) {
          await finish(tabId, flow, startedAt, savedFlowBrokenFlow(step.id, 'The saved automatic action has no stable target.'));
          return;
        }
        const resolution = await resolveTarget(tabId, step.target);
        if (!resolution || resolution.status === 'missing') {
          await finish(tabId, flow, startedAt, savedFlowMissingElement(step.id, 'The saved action target is no longer present.'));
          return;
        }
        if (resolution.status === 'ambiguous' || resolution.status === 'changed' || !resolution.locator) {
          await finish(tabId, flow, startedAt, savedFlowBrokenFlow(step.id, 'The saved action target is ambiguous or changed, so FocusTrace refused to choose a replacement.'));
          return;
        }
        const [actionResult] = await browser.scripting.executeScript({
          target: { tabId },
          func: executeSavedFlowActionInPage,
          args: [{ ...step, target: { ...step.target, locator: resolution.locator } }],
        });
        if (!actionResult?.result || actionResult.result.status !== 'performed') {
          const status = actionResult?.result?.status;
          const failure = status === 'missing'
            ? savedFlowMissingElement(step.id, actionResult?.result?.reason ?? 'The action target is missing.')
            : savedFlowBrokenFlow(step.id, actionResult?.result?.reason ?? 'The safe action could not be replayed.');
          await finish(tabId, flow, startedAt, failure);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
        continue;
      }

      if (step.checkpoint === 'route') {
        const tab = await browser.tabs.get(tabId);
        const currentRoute = tab.url ? sanitizeRuntimeUrl(tab.url) : '[redacted-url]';
        if (step.toRoute && currentRoute !== step.toRoute) {
          await finish(tabId, flow, startedAt, savedFlowBrokenFlow(step.id, 'The current route does not match the saved route checkpoint.'));
          return;
        }
        continue;
      }

      if (!step.target) continue;
      const resolution = await resolveTarget(tabId, step.target);
      if (step.checkpoint === 'dialog-close' && resolution?.status === 'missing') continue;
      if (!resolution || resolution.status === 'missing') {
        await finish(tabId, flow, startedAt, savedFlowMissingElement(step.id, 'A saved checkpoint target is no longer present.'));
        return;
      }
      if (resolution.status === 'ambiguous' || resolution.status === 'changed' || !resolution.locator) {
        await finish(tabId, flow, startedAt, savedFlowBrokenFlow(step.id, 'A saved checkpoint target is ambiguous or changed.'));
        return;
      }
      const [observation] = await browser.scripting.executeScript({
        target: { tabId },
        func: inspectSavedFlowTargetInPage,
        args: [{ ...step.target, locator: resolution.locator }],
      });
      const current = observation?.result;
      if (!current || current.status !== 'matched') {
        await finish(tabId, flow, startedAt, savedFlowMissingElement(step.id, 'The checkpoint target could not be observed.'));
        return;
      }
      if (step.checkpoint === 'focus' && !current.focused) {
        await finish(tabId, flow, startedAt, savedFlowBrokenFlow(step.id, 'Focus did not reach the saved target checkpoint.'));
        return;
      }
      if (step.checkpoint === 'dialog-open' && !current.dialogOpen) {
        await finish(tabId, flow, startedAt, savedFlowBrokenFlow(step.id, 'The saved dialog-open checkpoint was not observed.'));
        return;
      }
      if (step.checkpoint === 'dialog-close' && current.dialogOpen) {
        await finish(tabId, flow, startedAt, savedFlowBrokenFlow(step.id, 'The saved dialog is still open at the close checkpoint.'));
        return;
      }
    }

    await finish(tabId, flow, startedAt);
  };

  const startRun = async () => {
    if (!selected || recording || busy || !selected.steps.length) return;
    setBusy(true);
    setResults([]);
    setMessage(undefined);
    try {
      const tabId = await activeTabId();
      const startedAt = await startRegressionRecording(tabId, breakpoints);
      setRunStartedAt(startedAt);
      setRunIndex(0);
      await runFrom(selected, 0, startedAt, tabId);
    } catch {
      setRunState('failed');
      setMessage(tr(
        language,
        'Could not start the saved regression. The page may need access or the runtime may have changed.',
        'No se pudo iniciar la regresión guardada. Puede que la página necesite acceso o que el runtime haya cambiado.',
      ));
    } finally {
      setBusy(false);
    }
  };

  const continueManual = async () => {
    if (!selected || runStartedAt == null || runState !== 'manual-stop' || busy) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const tabId = await activeTabId();
      setManualStep(undefined);
      await runFrom(selected, runIndex + 1, runStartedAt, tabId);
    } catch {
      await finish(await activeTabId(), selected, runStartedAt, savedFlowBrokenFlow(manualStep?.id ?? 'manual-step', 'The manual replay continuation failed.')).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="saved-flow-panel" aria-labelledby="saved-flow-title">
      <div className="saved-flow-heading">
        <div>
          <p className="eyebrow">{tr(language, 'Local regression', 'Regresión local')}</p>
          <h3 id="saved-flow-title">{tr(language, 'Saved user flows', 'Flujos de usuario guardados')}</h3>
          <p>{tr(
            language,
            'Turn this Trace into a reusable local scenario. Unsafe or ambiguous actions stop for explicit review.',
            'Convierte esta traza en un escenario local reutilizable. Las acciones inseguras o ambiguas se detienen para revisión explícita.',
          )}</p>
        </div>
      </div>

      <div className="saved-flow-save">
        <label>
          <span>{tr(language, 'Flow name', 'Nombre del flujo')}</span>
          <input
            type="text"
            maxLength={80}
            value={name}
            disabled={!canSave}
            placeholder={tr(language, 'Checkout keyboard flow', 'Flujo de teclado del checkout')}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <button type="button" disabled={!canSave} onClick={() => void saveCurrent()}>
          {tr(language, 'Save current Trace', 'Guardar Trace actual')}
        </button>
      </div>

      {flows.length > 0 ? (
        <div className="saved-flow-library">
          <label>
            <span>{tr(language, 'Saved scenario', 'Escenario guardado')}</span>
            <select
              value={selectedId}
              disabled={busy || runState === 'running' || runState === 'manual-stop'}
              onChange={(event) => {
                setSelectedId(event.currentTarget.value);
                setResults([]);
                setRunState('idle');
              }}
            >
              {flows.map((flow) => <option key={flow.id} value={flow.id}>{flow.name}</option>)}
            </select>
          </label>
          {selected && (
            <p className="saved-flow-meta">
              {tr(
                language,
                `${selected.steps.length} steps · ${selected.baselineFindings.length} baseline findings`,
                `${selected.steps.length} pasos · ${selected.baselineFindings.length} hallazgos de referencia`,
              )}
            </p>
          )}
          <div className="saved-flow-actions">
            <button
              type="button"
              disabled={!selected || recording || busy || runState === 'running' || runState === 'manual-stop' || !selected.steps.length}
              onClick={() => void startRun()}
            >
              {tr(language, 'Run saved regression', 'Ejecutar regresión guardada')}
            </button>
            <button type="button" disabled={!selected || busy || runState === 'running' || runState === 'manual-stop'} onClick={() => void deleteSelected()}>
              {tr(language, 'Delete flow', 'Eliminar flujo')}
            </button>
            <button type="button" disabled={!flows.length || busy || runState === 'running' || runState === 'manual-stop'} onClick={() => void clearAll()}>
              {tr(language, 'Delete all', 'Eliminar todos')}
            </button>
          </div>
        </div>
      ) : (
        <p className="saved-flow-empty">{tr(language, 'No saved flows yet.', 'Todavía no hay flujos guardados.')}</p>
      )}

      {runState === 'manual-stop' && manualStep && (
        <div className="saved-flow-stop" role="status" aria-live="polite">
          <strong>{tr(language, 'Manual stop required', 'Se requiere parada manual')}</strong>
          <p>{manualInstruction(manualStep, language)}</p>
          <button type="button" disabled={busy} onClick={() => void continueManual()}>
            {tr(language, 'I performed this step — continue', 'He realizado este paso — continuar')}
          </button>
        </div>
      )}

      {message && <p className="saved-flow-status" role="status" aria-live="polite">{message}</p>}

      {results.length > 0 && (
        <div className="saved-flow-results">
          <h4>{tr(language, 'Regression result', 'Resultado de la regresión')}</h4>
          <ul>
            {results.map((result, index) => (
              <li key={`${result.state}-${result.ruleId ?? result.stepId ?? index}`} className={`state-${result.state}`}>
                <strong>{resultLabel(result.state, language)}</strong>
                <span>{result.ruleId ?? result.stepId ?? tr(language, 'Flow checkpoint', 'Checkpoint del flujo')}</span>
                <small>{result.reason}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="saved-flow-privacy-note">
        {tr(
          language,
          'Saved flows stay in extension-local storage. Passwords, field values, auditor notes and page text are not stored. Routes keep only path plus redaction markers for query/fragment data.',
          'Los flujos guardados permanecen en el almacenamiento local de la extensión. No se guardan contraseñas, valores de campos, notas del auditor ni texto de la página. Las rutas conservan solo la ruta y marcadores de redacción para query/fragmento.',
        )}
      </p>
    </section>
  );
}
