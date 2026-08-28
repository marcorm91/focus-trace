import { useEffect, useState } from 'react';
import {
  type FocusMemoryComparison,
  type FocusMemoryFindingHistory,
  type FocusMemoryFindingState,
  type FocusMemoryFindingTimelinePoint,
} from '../../../shared/focus-memory';
import { localeFor, localizedRuleTitle, tr, type AppLanguage } from '../../../shared/i18n';
import { ruleDefinitionForId } from '../../../shared/rule-catalog';

type FindingHistoryMode = 'list' | 'step';

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
  if (index > 0 && !point.comparableToPrevious) return tr(language, 'Not comparable', 'No comparable');
  return tr(language, 'Not observed', 'No detectado');
}

function FindingHistoryItem({
  item,
  language,
  selector,
  onLocate,
  onResolve,
}: {
  item: FocusMemoryFindingHistory;
  language: AppLanguage;
  selector?: string;
  onLocate: (item: FocusMemoryFindingHistory, selector: string) => void | Promise<void>;
  onResolve: (item: FocusMemoryFindingHistory) => Promise<boolean>;
}) {
  const resolveHintId = `focus-memory-resolve-${item.fingerprint}`;
  const title = findingTitle(item, language);

  return (
    <article className={`focus-memory-finding state-${item.state}${item.changedNow ? ' changed-now' : ''}`}>
      <div className="focus-memory-finding-head">
        <div>
          {item.ruleId && <code>{item.ruleId}</code>}
          {selector ? (
            <button
              className="focus-memory-finding-link"
              type="button"
              title={tr(language, 'Locate this finding on the page', 'Localizar este fallo en la página')}
              onClick={() => void onLocate(item, selector)}
            >
              {title}
            </button>
          ) : (
            <strong>{title}</strong>
          )}
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
}

export function FocusMemoryHistory({
  history,
  comparison,
  language,
  selectors,
  onLocate,
  onResolve,
}: {
  history: FocusMemoryFindingHistory[];
  comparison: FocusMemoryComparison;
  language: AppLanguage;
  selectors: Map<string, string>;
  onLocate: (item: FocusMemoryFindingHistory, selector: string) => void | Promise<void>;
  onResolve: (item: FocusMemoryFindingHistory) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<FindingHistoryMode>('list');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, history.length - 1)));
  }, [history.length]);

  if (!history.length) return null;
  const changedCount = comparison.previousObservedAt == null
    ? 0
    : history.filter((item) => item.changedNow).length;
  const currentItem = history[activeIndex] ?? history[0];
  const visibleHistory = mode === 'step' && currentItem ? [currentItem] : history;

  const locateItem = (item: FocusMemoryFindingHistory | undefined) => {
    if (!item) return;
    const selector = selectors.get(item.fingerprint);
    if (selector) void onLocate(item, selector);
  };

  const selectWalkthroughItem = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), history.length - 1);
    setActiveIndex(nextIndex);
    locateItem(history[nextIndex]);
  };

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

      <div className="focus-memory-history-toolbar">
        <div
          className="focus-memory-history-mode"
          role="group"
          aria-label={tr(language, 'Finding history display', 'Visualización del historial de fallos')}
        >
          <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>
            {tr(language, 'List', 'Lista')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'step'}
            onClick={() => {
              setMode('step');
              locateItem(currentItem);
            }}
          >
            {tr(language, 'Walkthrough', 'Recorrido')}
          </button>
        </div>

        {mode === 'step' && (
          <div className="focus-memory-history-pager" aria-label={tr(language, 'Finding navigation', 'Navegación por fallos')}>
            <button
              type="button"
              disabled={activeIndex === 0}
              aria-label={tr(language, 'Previous finding', 'Fallo anterior')}
              onClick={() => selectWalkthroughItem(activeIndex - 1)}
            >
              ‹
            </button>
            <strong aria-live="polite">
              {tr(language, `${activeIndex + 1} of ${history.length}`, `${activeIndex + 1} de ${history.length}`)}
            </strong>
            <button
              type="button"
              disabled={activeIndex >= history.length - 1}
              aria-label={tr(language, 'Next finding', 'Fallo siguiente')}
              onClick={() => selectWalkthroughItem(activeIndex + 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div className={`focus-memory-history-list${mode === 'step' ? ' is-step' : ''}`}>
        {visibleHistory.map((item) => (
          <FindingHistoryItem
            item={item}
            language={language}
            selector={selectors.get(item.fingerprint)}
            onLocate={onLocate}
            onResolve={onResolve}
            key={item.fingerprint}
          />
        ))}
      </div>
    </details>
  );
}
