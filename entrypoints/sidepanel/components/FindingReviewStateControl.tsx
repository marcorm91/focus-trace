import { useId } from 'react';
import { FINDING_REVIEW_STATES } from '../../../lib/audit/finding-review';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { FindingReviewState } from '../../../shared/types';
import './finding-review-state.css';

function stateLabel(state: FindingReviewState, language: AppLanguage): string {
  if (state === 'open') return tr(language, 'Open', 'Abierto');
  if (state === 'reviewed') return tr(language, 'Reviewed', 'Revisado');
  if (state === 'accepted') return tr(language, 'Accepted', 'Aceptado');
  if (state === 'false-positive') return tr(language, 'False positive', 'Falso positivo');
  if (state === 'resolved') return tr(language, 'Resolved', 'Resuelto');
  return tr(language, 'Regressed', 'Regresión');
}

export function FindingReviewStateControl({
  state = 'open',
  language,
  onChange,
  onReset,
}: {
  state?: FindingReviewState;
  language: AppLanguage;
  onChange: (state: FindingReviewState) => void | Promise<void>;
  onReset: () => void | Promise<void>;
}) {
  const titleId = useId();
  return (
    <section className="finding-review-state" aria-labelledby={titleId}>
      <div>
        <strong id={titleId}>
          {tr(language, 'Finding workflow', 'Estado de gestión')}
        </strong>
        <small>
          {tr(
            language,
            'Local auditor state. It does not change the detected accessibility outcome.',
            'Estado local del auditor. No cambia el resultado de accesibilidad detectado.',
          )}
        </small>
      </div>
      <div className="finding-review-state-controls">
        <label>
          <span>{tr(language, 'Status', 'Estado')}</span>
          <select
            value={state}
            aria-label={tr(language, 'Finding workflow status', 'Estado de gestión del hallazgo')}
            onChange={(event) => void onChange(event.currentTarget.value as FindingReviewState)}
          >
            {FINDING_REVIEW_STATES.map((candidate) => (
              <option key={candidate} value={candidate}>{stateLabel(candidate, language)}</option>
            ))}
          </select>
        </label>
        <button className="export-text-report" type="button" onClick={() => void onReset()}>
          {tr(language, 'Reset status', 'Restablecer estado')}
        </button>
      </div>
    </section>
  );
}
