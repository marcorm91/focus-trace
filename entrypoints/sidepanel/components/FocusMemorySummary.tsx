import {
  FOCUS_MEMORY_MAX_OBSERVATIONS,
  FOCUS_MEMORY_MAX_PER_SCOPE,
  FOCUS_MEMORY_RETENTION_DAYS,
  type FocusMemoryComparison,
  type FocusMemoryFindingHistory,
  type FocusMemoryFindingState,
  type FocusMemoryFindingTimelinePoint,
  type FocusMemoryStatus,
} from '../../../shared/focus-memory';
import { localeFor, localizedRuleTitle, tr, type AppLanguage } from '../../../shared/i18n';
import { ruleDefinitionForId } from '../../../shared/rule-catalog';
import type { ScanResult } from '../../../shared/types';
import { useFocusTraceMemory } from '../hooks/useFocusTraceMemory';
import './focus-memory.css';

function statusLabel(status: FocusMemoryStatus, language: AppLanguage): string {
  if (status === 'new') return tr(language, 'Baseline created', 'Línea base creada');
  if (status === 'open') return tr(language, 'Still reproducible', 'Sigue reproduciéndose');
  if (status === 'fixed') return tr(language, 'No longer reproduced', 'Ya no se reproduce');
  if (status === 'regressed') return tr(language, 'Regression detected', 'Regresión detectada');
  if (status === 'changed') return tr(language, 'Result changed', 'El resultado ha cambiado');
  return tr(language, 'No deterministic change', 'Sin cambios deterministas');
}

function scopeLabel(comparison: FocusMemoryComparison, language: AppLanguage): string {
  return comparison.scopeType === 'component'
    ? tr(language, 'this component', 'este componente')
    : tr(language, 'this page pattern', 'este patrón de página');
}

function comparisonDescription(comparison: FocusMemoryComparison, language: AppLanguage): string {
  const scope = scopeLabel(comparison, language);

  if (comparison.status === 'new') {
    return tr(
      language,
      `This is the first remembered observation for ${scope}. Future scans can be compared with this local baseline.`,
      `Esta es la primera observación recordada para ${scope}. Los próximos análisis podrán compararse con esta línea base local.`,
    );
  }

  if (!comparison.compatibleCoverage) {
    return tr(
      language,
      'The rule coverage changed since the previous observation, so FocusTrace will not claim a fix or regression from this comparison.',
      'La cobertura de reglas ha cambiado desde la observación anterior, así que FocusTrace no afirmará que existe una corrección o regresión a partir de esta comparación.',
    );
  }

  if (comparison.partial) {
    return tr(
      language,
      'This scan contains more deterministic failures than the compact memory snapshot keeps, so the historical comparison is intentionally conservative.',
      'Este análisis contiene más fallos deterministas de los que conserva el snapshot compacto de memoria, por lo que la comparación histórica es intencionadamente conservadora.',
    );
  }

  if (comparison.status === 'fixed') {
    return tr(
      language,
      `The deterministic failures recorded previously for ${scope} were not reproduced in the current scan. This is a positive historical change, but it does not by itself prove complete WCAG conformance.`,
      `Los fallos deterministas registrados anteriormente para ${scope} no se han reproducido en el análisis actual. Es un cambio histórico positivo, pero no demuestra por sí solo un cumplimiento completo de WCAG.`,
    );
  }

  if (comparison.status === 'regressed') {
    return tr(
      language,
      `${comparison.regressedFailures} previously observed deterministic failure${comparison.regressedFailures === 1 ? '' : 's'} returned after being absent from the previous observation.`,
      `${comparison.regressedFailures} ${comparison.regressedFailures === 1 ? 'fallo determinista observado anteriormente ha vuelto' : 'fallos deterministas observados anteriormente han vuelto'} después de no aparecer en la observación anterior.`,
    );
  }

  if (comparison.status === 'open') {
    return tr(
      language,
      `${comparison.persistentFailures} deterministic failure${comparison.persistentFailures === 1 ? '' : 's'} from the previous observation are still reproducible.`,
      `${comparison.persistentFailures} ${comparison.persistentFailures === 1 ? 'fallo determinista de la observación anterior sigue reproduciéndose' : 'fallos deterministas de la observación anterior siguen reproduciéndose'}.`,
    );
  }

  if (comparison.status === 'changed') {
    return tr(
      language,
      'The current scan differs from the previous observation, but the evidence is not a simple known fix or regression.',
      'El análisis actual difiere de la observación anterior, pero la evidencia no corresponde a una simple corrección o regresión conocida.',
    );
  }

  return tr(
    language,
    'The deterministic failures and review counts match the previous remembered observation.',
    'Los fallos deterministas y los recuentos de revisión coinciden con la observación anterior recordada.',
  );
}

function formatObservedAt(timestamp: number, language: AppLanguage): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatHistoryDate(timestamp: number, language: AppLanguage): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function findingStateLabel(state: FocusMemoryFindingState, language: AppLanguage): string {
  if (state === 'new') return tr(language, 'New', 'Nuevo');
  if (state === 'present') return tr(language, 'Still present', 'Sigue presente');
  if (state === 'resolved') return tr(language, 'Not reproduced', 'Ya no se reproduce');
  if (state === 'regressed') return tr(language, 'Returned', 'Ha vuelto');
  return tr(language, 'Coverage changed', 'Cobertura distinta');
}

function findingTitle(item: FocusMemoryFindingHistory, language: AppLanguage): string {
  if (!item.ruleId) return tr(language, 'Historical finding', 'Hallazgo histórico');
  const fallback = ruleDefinitionForId(item.ruleId)?.title ?? item.ruleId;
  return localizedRuleTitle(item.ruleId, fallback, language);
}

function timelinePointLabel(
  point: FocusMemoryFindingTimelinePoint,
  index: number,
  language: AppLanguage,
): string {
  if (point.present) return tr(language, 'Present', 'Presente');
  if (index > 0 && !point.comparableToPrevious) {
    return tr(language, 'Not comparable', 'No comparable');
  }
  return tr(language, 'Not observed', 'No detectado');
}

function FindingHistory({
  history,
  comparison,
  language,
  onResolve,
}: {
  history: FocusMemoryFindingHistory[];
  comparison: FocusMemoryComparison;
  language: AppLanguage;
  onResolve: (item: FocusMemoryFindingHistory) => Promise<boolean>;
}) {
  if (!history.length) return null;
  const changedCount = comparison.previousObservedAt == null
    ? 0
    : history.filter((item) => item.changedNow).length;

  return (
    <details className="focus-memory-history">
      <summary>
        <strong>{tr(language, 'Finding history', 'Historial por fallo')}</strong>
        <span>
          {changedCount > 0
            ? tr(
                language,
                `${changedCount} changed in this scan`,
                `${changedCount} ${changedCount === 1 ? 'ha cambiado' : 'han cambiado'} en este análisis`,
              )
            : tr(language, 'No finding changes in this scan', 'Sin cambios de fallo en este análisis')}
        </span>
      </summary>

      <div className="focus-memory-history-list">
        {history.map((item) => {
          const resolveHintId = `focus-memory-resolve-${item.fingerprint}`;
          const title = findingTitle(item, language);
          return (
            <article
              className={`focus-memory-finding state-${item.state}${item.changedNow ? ' changed-now' : ''}`}
              key={item.fingerprint}
            >
              <div className="focus-memory-finding-head">
                <div>
                  {item.ruleId && <code>{item.ruleId}</code>}
                  <strong>{title}</strong>
                </div>
                <span>{findingStateLabel(item.state, language)}</span>
              </div>

              <div className="focus-memory-evidence-table-wrap">
                <table
                  className="focus-memory-evidence-table"
                  aria-label={`${tr(language, 'Remembered observations for', 'Observaciones recordadas para')} ${title}`}
                >
                  <thead>
                    <tr>
                      <th scope="col">{tr(language, 'Observation', 'Observación')}</th>
                      <th scope="col">{tr(language, 'Result', 'Estado')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.timeline.map((point, index) => (
                      <tr
                        className={point.present ? 'is-present' : point.comparableToPrevious ? 'is-absent' : 'is-uncertain'}
                        key={`${item.fingerprint}-${point.observedAt}`}
                      >
                        <td>
                          <time dateTime={new Date(point.observedAt).toISOString()}>{formatHistoryDate(point.observedAt, language)}</time>
                        </td>
                        <td>{timelinePointLabel(point, index, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {item.state === 'resolved' && (
                <div className="focus-memory-resolve">
                  <label>
                    <input
                      type="checkbox"
                      aria-describedby={resolveHintId}
                      onChange={(event) => {
                        const checkbox = event.currentTarget;
                        if (!checkbox.checked) return;
                        void onResolve(item).then((resolved) => {
                          if (!resolved && checkbox.isConnected) checkbox.checked = false;
                        });
                      }}
                    />
                    <span>{tr(language, 'Mark as resolved', 'Marcar como solucionado')}</span>
                  </label>
                  <small id={resolveHintId}>
                    {tr(
                      language,
                      'Removes the detailed local history for this fixed finding. FocusTrace keeps only a minimal fingerprint so it can identify a future regression.',
                      'Elimina el historial local detallado de este fallo corregido. FocusTrace conserva solo una huella mínima para identificar una futura regresión.',
                    )}
                  </small>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </details>
  );
}

export function FocusMemorySummary({ scan, language }: { scan: ScanResult; language: AppLanguage }) {
  const memory = useFocusTraceMemory(scan);

  const clearMemory = async () => {
    const confirmed = window.confirm(tr(
      language,
      'Clear FocusTrace Memory? This removes all remembered scan comparisons from this browser profile. The current analysis stays open.',
      '¿Borrar FocusTrace Memory? Se eliminarán todas las comparaciones de análisis recordadas en este perfil del navegador. El análisis actual seguirá abierto.',
    ));
    if (confirmed) await memory.clear();
  };

  if (memory.loading || !memory.enabled) return null;

  if (memory.suppressed || !memory.comparison) {
    return (
      <section className="focus-memory is-cleared" aria-live="polite">
        <div className="focus-memory-heading">
          <div>
            <small>FocusTrace Memory</small>
            <strong>{tr(language, 'Ready for the next scan', 'Preparado para el próximo análisis')}</strong>
          </div>
        </div>
        <p>{tr(
          language,
          'Memory is enabled. Run another analysis to create a new local baseline; the analysis that was already open before opt-in will not be added retroactively.',
          'Memory está activado. Ejecuta otro análisis para crear una nueva línea base local; el análisis que ya estaba abierto antes de activarlo no se añadirá de forma retroactiva.',
        )}</p>
      </section>
    );
  }

  const comparison = memory.comparison;

  return (
    <section className={`focus-memory status-${comparison.status}`} aria-labelledby="focus-memory-title" aria-live="polite">
      <div className="focus-memory-heading">
        <div>
          <small>FocusTrace Memory</small>
          <strong id="focus-memory-title">{statusLabel(comparison.status, language)}</strong>
        </div>
      </div>

      <p>{comparisonDescription(comparison, language)}</p>

      <div className="focus-memory-summary-row" aria-label={tr(language, 'Memory summary', 'Resumen de Memory')}>
        <span>
          <strong>{comparison.observedCount}</strong>{' '}
          {tr(language, 'observations', 'observaciones')}
        </span>
        {comparison.previousObservedAt != null && (
          <span>
            {tr(language, 'Previous', 'Anterior')}: <strong>{formatObservedAt(comparison.previousObservedAt, language)}</strong>
          </span>
        )}
        {comparison.persistentFailures > 0 && (
          <span>● <strong>{comparison.persistentFailures}</strong> {tr(language, 'still present', 'siguen presentes')}</span>
        )}
        {comparison.fixedFailures > 0 && (
          <span className="is-fixed">✓ <strong>{comparison.fixedFailures}</strong> {tr(language, 'no longer reproduced', 'ya no se reproducen')}</span>
        )}
        {comparison.regressedFailures > 0 && (
          <span className="is-regressed">↺ <strong>{comparison.regressedFailures}</strong> {tr(language, 'returned', 'han vuelto')}</span>
        )}
        {comparison.newFailures > 0 && (
          <span>+ <strong>{comparison.newFailures}</strong> {tr(language, 'new failures', 'fallos nuevos')}</span>
        )}
        {comparison.reviewDelta !== 0 && (
          <span>{comparison.reviewDelta > 0 ? '+' : ''}<strong>{comparison.reviewDelta}</strong> {tr(language, 'reviews', 'revisiones')}</span>
        )}
        {comparison.warningDelta !== 0 && (
          <span>{comparison.warningDelta > 0 ? '+' : ''}<strong>{comparison.warningDelta}</strong> {tr(language, 'warnings', 'avisos')}</span>
        )}
      </div>

      <FindingHistory
        history={memory.history ?? []}
        comparison={comparison}
        language={language}
        onResolve={(item) => memory.resolveFinding(item.fingerprint, item.ruleId)}
      />

      <div className="focus-memory-controls">
        <small>
          {tr(
            language,
            `Max ${FOCUS_MEMORY_MAX_PER_SCOPE} per scope · ${FOCUS_MEMORY_MAX_OBSERVATIONS} total · ${FOCUS_MEMORY_RETENTION_DAYS} days`,
            `Máx. ${FOCUS_MEMORY_MAX_PER_SCOPE} por ámbito · ${FOCUS_MEMORY_MAX_OBSERVATIONS} en total · ${FOCUS_MEMORY_RETENTION_DAYS} días`,
          )}
        </small>
        <div>
          <button type="button" onClick={() => void clearMemory()}>
            {tr(language, 'Clear memory', 'Borrar memoria')}
          </button>
        </div>
      </div>
    </section>
  );
}
