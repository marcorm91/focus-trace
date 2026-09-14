import type { ProfiledScanResult } from '../../../lib/audit/audit-profiles';
import type { FindingLifecycleState, LifecycleScanResult } from '../../../lib/audit/finding-lifecycle';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { ScanResult } from '../../../shared/types';
import './finding-lifecycle-summary.css';

const STATES: FindingLifecycleState[] = ['new', 'persistent', 'changed', 'resolved'];

function stateLabel(state: FindingLifecycleState, language: AppLanguage): string {
  if (state === 'new') return tr(language, 'New', 'Nuevos');
  if (state === 'persistent') return tr(language, 'Persistent', 'Persistentes');
  if (state === 'changed') return tr(language, 'Changed', 'Cambiados');
  return tr(language, 'Resolved', 'Resueltos');
}

export function FindingLifecycleSummary({ scan, language }: { scan: ScanResult; language: AppLanguage }) {
  const extended = scan as ProfiledScanResult & LifecycleScanResult;
  const lifecycle = extended.findingLifecycle;
  const profile = extended.auditProfile;
  if (!lifecycle && !profile) return null;

  return (
    <section className="finding-lifecycle-summary" aria-labelledby="finding-lifecycle-title">
      <div className="finding-lifecycle-heading">
        <div>
          <strong id="finding-lifecycle-title">{tr(language, 'Finding lifecycle', 'Ciclo de vida de hallazgos')}</strong>
          <small>{tr(
            language,
            'Compared with the previous compatible scan. Resolved findings remain history evidence and are not reinserted into the current result.',
            'Comparado con el análisis compatible anterior. Los hallazgos resueltos permanecen como evidencia histórica y no se reinsertan en el resultado actual.',
          )}</small>
        </div>
        {profile && <span title={tr(language, 'Applied audit profile', 'Perfil de auditoría aplicado')}>{profile.name}</span>}
      </div>

      {lifecycle && (
        <dl className="finding-lifecycle-counts">
          {STATES.map((state) => (
            <div key={state} className={`lifecycle-${state}`}>
              <dt>{stateLabel(state, language)}</dt>
              <dd>{lifecycle.counts[state]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
