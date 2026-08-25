import {
  explanationForCause,
  humanRuntimeEventTitle,
  outcomeLabel,
  type ExplanationLevel,
} from '../../../lib/runtime/explanations';
import { localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import type { RuntimeEvent } from '../../../shared/types';
import { ReferenceList } from '../components/Common';

export function FocusView({
  latest,
  count,
  pathSteps,
  pathVisible,
  recording,
  busy,
  onTogglePath,
  onToggleRecording,
  level,
  language,
}: {
  latest?: RuntimeEvent | undefined;
  count: number;
  pathSteps: number;
  pathVisible: boolean;
  recording: boolean;
  busy: boolean;
  onTogglePath: () => void | Promise<void>;
  onToggleRecording: () => void | Promise<void>;
  level: ExplanationLevel;
  language: AppLanguage;
}) {
  const primaryCause = latest?.causes?.[0];
  const explanation = primaryCause ? explanationForCause(primaryCause.type, language) : undefined;

  return (
    <section className="panel" aria-labelledby="focus-title">
      <div className="section-heading">
        <div>
          <h2 id="focus-title">{tr(language, 'Focus journey', 'Recorrido de foco')}</h2>
          <p>
            {count > 0
              ? tr(
                  language,
                  `${count} focus-related events recorded`,
                  `${count} eventos relacionados con el foco registrados`,
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
                  'Return to the page and navigate with Tab. Recording continues while the panel is not focused.',
                  'Vuelve a la página y navega con Tab. La grabación continúa aunque el panel no tenga el foco.',
                )
              : tr(
                  language,
                  'Start recording, return to the page and use Tab naturally. Stop when the journey is complete.',
                  'Inicia la grabación, vuelve a la página y utiliza Tab con normalidad. Deténla al terminar.',
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

      {latest ? (
        <>
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
                ? tr(language, 'Hide path on page', 'Ocultar recorrido en la página')
                : tr(language, 'Show path on page', 'Mostrar recorrido en la página')}
            </button>
            <p>
              {recording
                ? tr(
                    language,
                    'Stop recording to project the observed path without changing the captured evidence.',
                    'Detén la grabación para proyectar el recorrido observado sin modificar la evidencia capturada.',
                  )
                : tr(
                    language,
                    `${pathSteps} observed focus step${pathSteps === 1 ? '' : 's'}, numbered in recorded order.`,
                    `${pathSteps} paso${pathSteps === 1 ? '' : 's'} de foco observado${pathSteps === 1 ? '' : 's'}, numerado${pathSteps === 1 ? '' : 's'} en el orden grabado.`,
                  )}
            </p>
          </div>

          <article className="focus-card">
            <div className="finding-meta">
              {latest.outcome && <span className={`outcome ${latest.outcome}`}>{outcomeLabel(latest.outcome, level, language)}</span>}
              {level !== 'simple' && <span className={`severity ${latest.severity}`}>{localizedSeverity(latest.severity, language)}</span>}
              {level !== 'simple' && latest.ruleId && <code>{latest.ruleId}</code>}
            </div>

            <h3>{explanation?.title ?? humanRuntimeEventTitle(latest, language)}</h3>
            {explanation ? (
              <div className="human-explanation">
                <p>{explanation.summary}</p>
                <p><strong>{tr(language, 'Impact:', 'Impacto:')}</strong> {explanation.impact}</p>
                <p><strong>{tr(language, 'What to review:', 'Qué revisar:')}</strong> {explanation.recommendation}</p>
                {level !== 'simple' && <p><strong>{tr(language, 'Accessibility:', 'Accesibilidad:')}</strong> {explanation.accessibility}</p>}
              </div>
            ) : latest.detail ? <p>{latest.detail}</p> : null}

            {latest.element && (
              <dl>
                <div><dt>{tr(language, 'Name', 'Nombre')}</dt><dd>{latest.element.name ?? '—'}</dd></div>
                <div><dt>{tr(language, 'Role', 'Rol')}</dt><dd>{latest.element.role ?? latest.element.tag}</dd></div>
              </dl>
            )}

            {level === 'developer' && latest.causes?.map((item) => (
              <p className="cause-line" key={item.type}><strong>{item.type}:</strong> {item.summary}</p>
            ))}
            {level !== 'simple' && <ReferenceList references={latest.references} language={language} />}
          </article>
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
