import { useEffect, useMemo, useState } from 'react';
import { GUIDED_TESTS } from '../../../lib/guided-tests/catalog';
import {
  answerGuidedStep,
  cancelGuidedTest,
  pauseGuidedTest,
  restartGuidedTest,
  resumeGuidedTest,
  startGuidedTest,
  type GuidedEvidence,
  type GuidedManualAnswer,
  type GuidedTestSession,
} from '../../../lib/guided-tests/framework';
import { guidedRuntimeEvidence } from '../../../lib/guided-tests/runtime-evidence';
import { loadGuidedSession, saveGuidedSession } from '../../../lib/guided-tests/storage';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { RuntimeEvent, ScanResult } from '../../../shared/types';
import './guided-test-panel.css';

function localText(text: { en: string; es: string }, language: AppLanguage): string {
  return language === 'es' ? text.es : text.en;
}

function answerLabel(answer: GuidedManualAnswer, language: AppLanguage): string {
  const labels: Record<GuidedManualAnswer, [string, string]> = {
    acknowledged: ['Reviewed — continue', 'Revisado — continuar'],
    pass: ['No issue found', 'No he encontrado problema'],
    issue: ['Issue found', 'He encontrado un problema'],
    'not-applicable': ['Not applicable', 'No aplica'],
    uncertain: ['Needs further review', 'Necesita más revisión'],
  };
  return language === 'es' ? labels[answer][1] : labels[answer][0];
}

function outcomeLabel(session: GuidedTestSession, language: AppLanguage): string {
  switch (session.outcome) {
    case 'guided-pass':
      return tr(language, 'Manual review: no issue found', 'Revisión manual: no se encontró problema');
    case 'guided-issue':
      return tr(language, 'Manual review: issue found', 'Revisión manual: se encontró un problema');
    case 'guided-review':
      return tr(language, 'Manual review: further judgement required', 'Revisión manual: requiere más criterio');
    case 'not-applicable':
      return tr(language, 'Manual review: not applicable', 'Revisión manual: no aplica');
    default:
      return tr(language, 'Manual review incomplete', 'Revisión manual incompleta');
  }
}

function referenceBadge(references: { type: string; id: string; level?: string }[]): string {
  return references
    .slice(0, 3)
    .map((reference) => `${reference.type === 'WCAG' ? 'WCAG ' : ''}${reference.id}${reference.level ? ` · ${reference.level}` : ''}`)
    .join(' · ');
}

function RuntimeEvidenceList({ evidence, language }: { evidence: GuidedEvidence[]; language: AppLanguage }) {
  if (!evidence.length) return null;
  return (
    <div className="guided-runtime-evidence" role="note">
      <strong>{tr(language, 'Observed runtime evidence', 'Evidencia runtime observada')}</strong>
      <p>{tr(
        language,
        'Captured from the existing Trace/runtime event stream. Your answer remains a separate manual judgement.',
        'Capturada desde el flujo existente de eventos de Trace/runtime. Tu respuesta sigue siendo un criterio manual separado.',
      )}</p>
      <ul>
        {evidence.map((item, index) => (
          <li key={`${item.sourceEventId ?? item.capturedAt}-${index}`}>
            <strong>{item.label}</strong>
            <span>{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GuidedTestPanel({
  scan,
  events,
  language,
}: {
  scan?: ScanResult;
  events: RuntimeEvent[];
  language: AppLanguage;
}) {
  const defaultTestId = GUIDED_TESTS.find((test) => test.id === 'FT-GUIDED-002')?.id ?? GUIDED_TESTS[0]?.id ?? '';
  const [selectedTestId, setSelectedTestId] = useState(defaultTestId);
  const definition = useMemo(
    () => GUIDED_TESTS.find((test) => test.id === selectedTestId) ?? GUIDED_TESTS[0]!,
    [selectedTestId],
  );
  const [session, setSession] = useState<GuidedTestSession>();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<GuidedManualAnswer>();
  const [statusMessage, setStatusMessage] = useState('');

  const pageUrl = scan?.url;
  const pageTitle = scan?.title;

  useEffect(() => {
    let active = true;
    setSession(undefined);
    setNote('');
    setSelectedAnswer(undefined);
    setStatusMessage('');
    if (!pageUrl) return () => { active = false; };
    setLoading(true);
    void loadGuidedSession(pageUrl, definition.id)
      .then((stored) => {
        if (active) setSession(stored);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [definition.id, pageUrl]);

  const step = useMemo(() => {
    if (!session) return undefined;
    return definition.steps[session.currentStepIndex];
  }, [definition.steps, session]);

  const observedEvidence = useMemo(() => {
    if (!session || session.status !== 'active' || !step) return [];
    return guidedRuntimeEvidence(definition.id, step.id, events, session.startedAt);
  }, [definition.id, events, session, step]);

  const persist = async (next: GuidedTestSession, message: string) => {
    setSession(next);
    setNote('');
    setSelectedAnswer(undefined);
    setStatusMessage(message);
    await saveGuidedSession(next);
  };

  const start = async () => {
    if (!pageUrl) return;
    const next = startGuidedTest(definition, { url: pageUrl, title: pageTitle });
    await persist(next, tr(language, 'Guided test started.', 'Prueba guiada iniciada.'));
  };

  const submit = async () => {
    if (!session || !selectedAnswer || !step) return;
    const next = answerGuidedStep(
      session,
      definition,
      selectedAnswer,
      note,
      Date.now(),
      observedEvidence,
    );
    const message = next.status === 'completed'
      ? tr(language, 'Guided test completed. Result added to this report.', 'Prueba guiada completada. Resultado añadido a este informe.')
      : tr(language, 'Step saved. Continue with the next step.', 'Paso guardado. Continúa con el siguiente paso.');
    await persist(next, message);
  };

  const pause = async () => {
    if (!session) return;
    await persist(
      pauseGuidedTest(session),
      tr(language, 'Guided test paused. You can resume it later.', 'Prueba guiada en pausa. Puedes reanudarla más tarde.'),
    );
  };

  const resume = async () => {
    if (!session) return;
    await persist(
      resumeGuidedTest(session),
      tr(language, 'Guided test resumed.', 'Prueba guiada reanudada.'),
    );
  };

  const cancel = async () => {
    if (!session) return;
    await persist(
      cancelGuidedTest(session),
      tr(language, 'Guided test cancelled. The previous manual evidence is retained locally.', 'Prueba guiada cancelada. La evidencia manual anterior se conserva localmente.'),
    );
  };

  const restart = async () => {
    if (!session) {
      await start();
      return;
    }
    await persist(
      restartGuidedTest(definition, session),
      tr(language, 'Guided test restarted.', 'Prueba guiada reiniciada.'),
    );
  };

  return (
    <section className="panel guided-test-panel" aria-labelledby="guided-test-title">
      <div className="guided-test-heading">
        <div>
          <span className="report-kicker">{tr(language, 'Guided tests · manual + runtime evidence', 'Pruebas guiadas · evidencia manual + runtime')}</span>
          <h2 id="guided-test-title">{localText(definition.title, language)}</h2>
        </div>
        <span className="guided-coverage-badge">{referenceBadge(definition.references)}</span>
      </div>

      <label className="guided-test-selector">
        <span>{tr(language, 'Guided workflow', 'Flujo guiado')}</span>
        <select value={definition.id} onChange={(event) => setSelectedTestId(event.currentTarget.value)}>
          {GUIDED_TESTS.map((test) => (
            <option key={test.id} value={test.id}>{localText(test.title, language)}</option>
          ))}
        </select>
      </label>

      <p>{localText(definition.description, language)}</p>
      <p className="guided-test-boundary" role="note">
        <strong>{tr(language, 'Not an automated conformance result.', 'No es un resultado automático de conformidad.')}</strong>{' '}
        {tr(
          language,
          'FocusTrace keeps observed runtime events and your manual answer distinguishable. Neither guided evidence stream changes automated PASS/FAIL totals.',
          'FocusTrace mantiene diferenciados los eventos runtime observados y tu respuesta manual. Ninguno de los dos flujos guiados modifica los totales automáticos PASS/FAIL.',
        )}
      </p>

      {!scan && (
        <p className="guided-test-empty">
          {tr(language, 'Analyze the current page first to start this guided test.', 'Analiza primero la página actual para iniciar esta prueba guiada.')}
        </p>
      )}

      {scan && loading && <p role="status">{tr(language, 'Loading guided session…', 'Cargando sesión guiada…')}</p>}

      {scan && !loading && !session && (
        <button className="primary" type="button" onClick={() => void start()}>
          {tr(language, 'Start guided test', 'Iniciar prueba guiada')}
        </button>
      )}

      {session?.status === 'paused' && (
        <div className="guided-test-state">
          <strong>{tr(language, 'Paused', 'En pausa')}</strong>
          <p>{tr(language, 'Your progress is stored locally for this page.', 'Tu progreso está guardado localmente para esta página.')}</p>
          <div className="guided-test-actions">
            <button className="primary" type="button" onClick={() => void resume()}>{tr(language, 'Resume', 'Reanudar')}</button>
            <button type="button" onClick={() => void restart()}>{tr(language, 'Restart', 'Reiniciar')}</button>
            <button type="button" onClick={() => void cancel()}>{tr(language, 'Cancel', 'Cancelar')}</button>
          </div>
        </div>
      )}

      {session?.status === 'cancelled' && (
        <div className="guided-test-state">
          <strong>{tr(language, 'Cancelled', 'Cancelada')}</strong>
          <p>{tr(language, 'This manual run is not counted as a completed result.', 'Esta ejecución manual no cuenta como resultado completado.')}</p>
          <button className="primary" type="button" onClick={() => void restart()}>{tr(language, 'Restart guided test', 'Reiniciar prueba guiada')}</button>
        </div>
      )}

      {session?.status === 'completed' && (
        <div className="guided-test-result" aria-label={tr(language, 'Guided result', 'Resultado guiado')}>
          <strong>{outcomeLabel(session, language)}</strong>
          <p>{tr(
            language,
            'This remains a guided result. Manual answers and observed runtime evidence are shown separately below.',
            'Este sigue siendo un resultado guiado. Las respuestas manuales y la evidencia runtime observada se muestran por separado a continuación.',
          )}</p>
          <ol>
            {session.steps.map((item, index) => {
              const definitionStep = definition.steps[index];
              if (!definitionStep) return null;
              const runtimeEvidence = item.evidence.filter((entry) => entry.kind === 'runtime-observation');
              return (
                <li key={item.stepId}>
                  <strong>{localText(definitionStep.title, language)}</strong>
                  <span>{tr(language, 'Manual answer', 'Respuesta manual')}: {item.answer ? answerLabel(item.answer, language) : tr(language, 'No answer', 'Sin respuesta')}</span>
                  {runtimeEvidence.length > 0 && (
                    <span>{tr(language, 'Observed events', 'Eventos observados')}: {runtimeEvidence.map((entry) => entry.label).join(' · ')}</span>
                  )}
                </li>
              );
            })}
          </ol>
          <button type="button" onClick={() => void restart()}>{tr(language, 'Run again', 'Ejecutar de nuevo')}</button>
        </div>
      )}

      {session?.status === 'active' && step && (
        <div className="guided-test-step">
          <div className="guided-test-progress" aria-label={tr(language, 'Guided test progress', 'Progreso de la prueba guiada')}>
            {tr(
              language,
              `Step ${session.currentStepIndex + 1} of ${definition.steps.length}`,
              `Paso ${session.currentStepIndex + 1} de ${definition.steps.length}`,
            )}
          </div>
          <h3>{localText(step.title, language)}</h3>
          <p>{localText(step.prompt, language)}</p>

          <RuntimeEvidenceList evidence={observedEvidence} language={language} />

          <fieldset>
            <legend>{tr(language, 'Record your manual answer', 'Registra tu respuesta manual')}</legend>
            {step.answers.map((answer) => (
              <label className="guided-answer" key={answer}>
                <input
                  type="radio"
                  name={`guided-answer-${session.id}-${step.id}`}
                  value={answer}
                  checked={selectedAnswer === answer}
                  onChange={() => setSelectedAnswer(answer)}
                />
                <span>{answerLabel(answer, language)}</span>
              </label>
            ))}
          </fieldset>

          <label className="guided-note">
            <span>{tr(language, 'Optional auditor note', 'Nota opcional del auditor')}</span>
            <textarea
              value={note}
              maxLength={240}
              rows={3}
              onChange={(event) => setNote(event.currentTarget.value)}
              placeholder={tr(language, 'Do not enter passwords, tokens or form values.', 'No introduzcas contraseñas, tokens ni valores de formularios.')}
            />
          </label>

          <div className="guided-test-actions">
            <button className="primary" type="button" disabled={!selectedAnswer} onClick={() => void submit()}>
              {session.currentStepIndex === definition.steps.length - 1
                ? tr(language, 'Save result', 'Guardar resultado')
                : tr(language, 'Save and continue', 'Guardar y continuar')}
            </button>
            <button type="button" onClick={() => void pause()}>{tr(language, 'Pause', 'Pausar')}</button>
            <button type="button" onClick={() => void cancel()}>{tr(language, 'Cancel', 'Cancelar')}</button>
            <button type="button" onClick={() => void restart()}>{tr(language, 'Restart', 'Reiniciar')}</button>
          </div>
        </div>
      )}

      <p className="guided-test-status" role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
    </section>
  );
}
