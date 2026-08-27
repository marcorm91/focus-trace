import {
  FOCUS_MEMORY_MAX_OBSERVATIONS,
  FOCUS_MEMORY_MAX_PER_SCOPE,
  FOCUS_MEMORY_RETENTION_DAYS,
  type FocusMemoryComparison,
  type FocusMemoryStatus,
} from '../../../shared/focus-memory';
import { localeFor, tr, type AppLanguage } from '../../../shared/i18n';
import type { ScanResult } from '../../../shared/types';
import { useFocusTraceMemory } from '../hooks/useFocusTraceMemory';
import './focus-memory.css';

function statusLabel(status: FocusMemoryStatus, language: AppLanguage): string {
  if (status === 'new') return tr(language, 'Baseline created', 'Línea base creada');
  if (status === 'open') return tr(language, 'Still reproducible', 'Sigue reproduciéndose');
  if (status === 'fixed') return tr(language, 'Fixed since last observation', 'Corregido desde la última observación');
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
      `The deterministic failures recorded previously for ${scope} were not reproduced in the current scan. This does not by itself prove complete WCAG conformance.`,
      `Los fallos deterministas registrados anteriormente para ${scope} no se han reproducido en el análisis actual. Esto no demuestra por sí solo un cumplimiento completo de WCAG.`,
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

  if (memory.loading) {
    return (
      <section className="focus-memory is-loading" aria-live="polite">
        <strong>FocusTrace Memory</strong>
        <p>{tr(language, 'Checking local Memory settings…', 'Comprobando los ajustes locales de Memory…')}</p>
      </section>
    );
  }

  if (!memory.enabled) {
    return (
      <section className="focus-memory is-paused" aria-live="polite">
        <div className="focus-memory-heading">
          <div>
            <small>FocusTrace Memory</small>
            <strong>{tr(language, 'Memory is off', 'Memory está desactivado')}</strong>
          </div>
        </div>
        <p>{tr(
          language,
          'Accessibility history is disabled by default. Enable “Remember accessibility history” in Settings if you want future scans to be compared locally.',
          'El historial de accesibilidad está deshabilitado por defecto. Activa “Recordar historial de accesibilidad” en Ajustes si quieres comparar localmente los próximos análisis.',
        )}</p>
      </section>
    );
  }

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
        <span className="focus-memory-status">{comparison.status.toUpperCase()}</span>
      </div>

      <p>{comparisonDescription(comparison, language)}</p>

      <div className="focus-memory-meta">
        <span>
          <strong>{comparison.observedCount}</strong>{' '}
          {tr(language, 'observations', 'observaciones')}
        </span>
        {comparison.previousObservedAt != null && (
          <span>
            {tr(language, 'Previous', 'Anterior')}: <strong>{formatObservedAt(comparison.previousObservedAt, language)}</strong>
          </span>
        )}
      </div>

      {comparison.previousObservedAt != null && (
        <div className="focus-memory-deltas" aria-label={tr(language, 'Changes since previous observation', 'Cambios desde la observación anterior')}>
          {comparison.fixedFailures > 0 && <span className="is-fixed">✓ {comparison.fixedFailures} {tr(language, 'no longer reproduced', 'ya no se reproducen')}</span>}
          {comparison.persistentFailures > 0 && <span>● {comparison.persistentFailures} {tr(language, 'still present', 'siguen presentes')}</span>}
          {comparison.regressedFailures > 0 && <span className="is-regressed">↺ {comparison.regressedFailures} {tr(language, 'returned', 'han vuelto')}</span>}
          {comparison.newFailures > 0 && <span>+ {comparison.newFailures} {tr(language, 'new failures', 'fallos nuevos')}</span>}
          {comparison.reviewDelta !== 0 && <span>{comparison.reviewDelta > 0 ? '+' : ''}{comparison.reviewDelta} {tr(language, 'reviews', 'revisiones')}</span>}
          {comparison.warningDelta !== 0 && <span>{comparison.warningDelta > 0 ? '+' : ''}{comparison.warningDelta} {tr(language, 'warnings', 'avisos')}</span>}
        </div>
      )}

      <div className="focus-memory-controls">
        <small>
          {tr(
            language,
            `Local only · max ${FOCUS_MEMORY_MAX_PER_SCOPE} per scope · ${FOCUS_MEMORY_MAX_OBSERVATIONS} total · ${FOCUS_MEMORY_RETENTION_DAYS} days`,
            `Solo local · máx. ${FOCUS_MEMORY_MAX_PER_SCOPE} por ámbito · ${FOCUS_MEMORY_MAX_OBSERVATIONS} en total · ${FOCUS_MEMORY_RETENTION_DAYS} días`,
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
