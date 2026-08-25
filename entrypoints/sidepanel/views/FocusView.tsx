import {
  explanationForCause,
  humanRuntimeEventTitle,
  outcomeLabel,
  type ExplanationLevel,
} from '../../../lib/runtime/explanations';
import { localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import type { RuntimeEvent } from '../../../shared/types';
import { Empty, ReferenceList } from '../components/Common';

export function FocusView({
  latest,
  count,
  pathSteps,
  pathVisible,
  recording,
  onTogglePath,
  level,
  language,
}: {
  latest?: RuntimeEvent | undefined;
  count: number;
  pathSteps: number;
  pathVisible: boolean;
  recording: boolean;
  onTogglePath: () => void | Promise<void>;
  level: ExplanationLevel;
  language: AppLanguage;
}) {
  if (!latest) {
    return (
      <Empty
        title={tr(language, 'No focus events', 'No hay eventos de foco')}
        text={tr(
          language,
          'Start recording and navigate with Tab, or use Simulate focus to generate an automatic keyboard walk.',
          'Inicia una grabación y navega con Tab, o usa Simular foco para generar un recorrido automático de teclado.',
        )}
      />
    );
  }

  const primaryCause = latest.causes?.[0];
  const explanation = primaryCause ? explanationForCause(primaryCause.type, language) : undefined;

  return (
    <section className="panel" aria-labelledby="focus-title">
      <div className="section-heading">
        <div>
          <h2 id="focus-title">{tr(language, 'Focus inspector', 'Inspector de foco')}</h2>
          <p>
            {tr(
              language,
              `${count} focus-related events recorded`,
              `${count} eventos relacionados con el foco registrados`,
            )}
          </p>
        </div>
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
            {level === 'developer' && <div><dt>Selector</dt><dd><code>{latest.element.selector}</code></dd></div>}
          </dl>
        )}

        {level === 'developer' && latest.causes?.map((item) => (
          <p className="cause-line" key={item.type}><strong>{item.type}:</strong> {item.summary}</p>
        ))}
        {level !== 'simple' && <ReferenceList references={latest.references} language={language} />}
      </article>
    </section>
  );
}