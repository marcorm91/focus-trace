import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FOCUS_MEMORY_MAX_OBSERVATIONS,
  FOCUS_MEMORY_MAX_FAILURE_FINGERPRINTS,
  FOCUS_MEMORY_MAX_PER_SCOPE,
  FOCUS_MEMORY_RETENTION_DAYS,
  focusMemoryScopeKey,
  recordFocusMemoryObservation,
  type FocusMemoryComparison,
  type FocusMemoryFindingHistory,
  type FocusMemoryStatus,
} from '../../../shared/focus-memory';
import { localeFor, tr, type AppLanguage } from '../../../shared/i18n';
import type { ScanResult } from '../../../shared/types';
import { useFocusTraceMemory } from '../hooks/useFocusTraceMemory';
import { currentFindingSelectors, locateMemoryFindingInPage } from './focus-memory-page';
import { FocusMemoryHistory } from './FocusMemoryHistory';
import { downloadFocusMemorySnapshot, parseFocusMemorySnapshot } from './focus-memory-snapshot';

interface ImportedBaselineComparison {
  exportedAt: number;
  observedAt: number;
  comparison: FocusMemoryComparison;
}

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

export function FocusMemorySummary({ scan, language }: { scan: ScanResult; language: AppLanguage }) {
  const memory = useFocusTraceMemory(scan);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importedBaseline, setImportedBaseline] = useState<ImportedBaselineComparison>();
  const [importError, setImportError] = useState<string>();
  const [locateError, setLocateError] = useState<string>();
  const selectors = useMemo(() => currentFindingSelectors(scan), [scan]);

  useEffect(() => {
    setImportedBaseline(undefined);
    setImportError(undefined);
    setLocateError(undefined);
    if (importInputRef.current) importInputRef.current.value = '';
  }, [scan.scannedAt]);

  const clearMemory = async () => {
    const confirmed = window.confirm(tr(
      language,
      'Clear FocusTrace Memory? This removes all remembered scan comparisons from this browser profile. The current analysis stays open.',
      '¿Borrar FocusTrace Memory? Se eliminarán todas las comparaciones de análisis recordadas en este perfil del navegador. El análisis actual seguirá abierto.',
    ));
    if (confirmed) await memory.clear();
  };

  const locateFinding = async (item: FocusMemoryFindingHistory, selector: string) => {
    setLocateError(undefined);
    try {
      const label = item.ruleId ? `FocusTrace · ${item.ruleId}` : 'FocusTrace Memory';
      const found = await locateMemoryFindingInPage(selector, label);
      if (!found) {
        setLocateError(tr(
          language,
          'FocusTrace could not highlight the current element. Check page access or run the analysis again if the page changed.',
          'FocusTrace no ha podido resaltar el elemento actual. Comprueba el acceso a la página o vuelve a ejecutar el análisis si la página ha cambiado.',
        ));
      }
    } catch {
      setLocateError(tr(
        language,
        'FocusTrace could not highlight the current element. Check page access and try again.',
        'FocusTrace no ha podido resaltar el elemento actual. Comprueba el acceso a la página y vuelve a intentarlo.',
      ));
    }
  };

  const compareImportedSnapshot = async (file: File) => {
    setImportError(undefined);
    setImportedBaseline(undefined);

    try {
      const parsed = parseFocusMemorySnapshot(JSON.parse(await file.text()));
      if (parsed.observation.scopeKey !== focusMemoryScopeKey(scan)) {
        throw new Error('scope-mismatch');
      }
      if (parsed.observation.observedAt >= scan.scannedAt) {
        throw new Error('not-older');
      }

      const result = recordFocusMemoryObservation(
        { version: 1, observations: [parsed.observation] },
        scan,
      );
      setImportedBaseline({
        exportedAt: Date.parse(parsed.exportedAt),
        observedAt: parsed.observation.observedAt,
        comparison: result.comparison,
      });
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : '';
      if (code === 'scope-mismatch') {
        setImportError(tr(
          language,
          'This JSON belongs to a different page pattern or component. Export and compare snapshots from the same scope.',
          'Este JSON pertenece a otro patrón de página o componente. Exporta y compara snapshots del mismo ámbito.',
        ));
      } else if (code === 'not-older') {
        setImportError(tr(
          language,
          'The imported JSON must contain an analysis older than the current scan.',
          'El JSON importado debe contener un análisis anterior al análisis actual.',
        ));
      } else {
        setImportError(tr(
          language,
          'FocusTrace could not read this baseline JSON. Use a JSON file exported from FocusTrace Memory.',
          'FocusTrace no ha podido leer este JSON de línea base. Usa un JSON exportado desde FocusTrace Memory.',
        ));
      }
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
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
        <button className="focus-memory-clear" type="button" onClick={() => void clearMemory()}>
          {tr(language, 'Clear memory', 'Borrar memoria')}
        </button>
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

      {importedBaseline && (
        <div className="focus-memory-imported-comparison" role="status">
          <div>
            <strong>{tr(language, 'Imported JSON comparison', 'Comparación con JSON importado')}</strong>
            <time dateTime={new Date(importedBaseline.observedAt).toISOString()}>
              {tr(language, 'Baseline', 'Línea base')}: {formatObservedAt(importedBaseline.observedAt, language)}
            </time>
          </div>
          <p><strong>{statusLabel(importedBaseline.comparison.status, language)}.</strong> {comparisonDescription(importedBaseline.comparison, language)}</p>
          <div className="focus-memory-imported-counts" aria-label={tr(language, 'Imported comparison summary', 'Resumen de la comparación importada')}>
            <span><strong>{importedBaseline.comparison.persistentFailures}</strong> {tr(language, 'still present', 'siguen presentes')}</span>
            <span><strong>{importedBaseline.comparison.fixedFailures}</strong> {tr(language, 'not reproduced', 'no reproducidos')}</span>
            <span><strong>{importedBaseline.comparison.newFailures}</strong> {tr(language, 'new', 'nuevos')}</span>
          </div>
          <small>
            {tr(
              language,
              `Snapshot exported ${formatObservedAt(importedBaseline.exportedAt, language)}. This comparison is temporary and is not added to local Memory.`,
              `Snapshot exportado el ${formatObservedAt(importedBaseline.exportedAt, language)}. Esta comparación es temporal y no se añade a Memory local.`,
            )}
          </small>
        </div>
      )}

      {importError && <p className="focus-memory-import-error" role="alert">{importError}</p>}
      {locateError && <p className="focus-memory-locate-error" role="status">{locateError}</p>}

      <FocusMemoryHistory
        history={memory.history ?? []}
        comparison={comparison}
        language={language}
        selectors={selectors}
        onLocate={locateFinding}
        onResolve={(item) => memory.resolveFinding(item.fingerprint, item.ruleId)}
      />

      <div className="focus-memory-controls">
        <small>
          {tr(
            language,
            `Max ${FOCUS_MEMORY_MAX_PER_SCOPE} per scope · ${FOCUS_MEMORY_MAX_OBSERVATIONS} total · ${FOCUS_MEMORY_MAX_FAILURE_FINGERPRINTS} failure details per scan · ${FOCUS_MEMORY_RETENTION_DAYS} days`,
            `Máx. ${FOCUS_MEMORY_MAX_PER_SCOPE} por ámbito · ${FOCUS_MEMORY_MAX_OBSERVATIONS} en total · ${FOCUS_MEMORY_MAX_FAILURE_FINGERPRINTS} detalles de fallo por análisis · ${FOCUS_MEMORY_RETENTION_DAYS} días`,
          )}
        </small>
        <div>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void compareImportedSnapshot(file);
            }}
          />
          <button type="button" onClick={() => downloadFocusMemorySnapshot(scan)}>
            {tr(language, 'Export JSON', 'Exportar JSON')}
          </button>
          <button type="button" onClick={() => importInputRef.current?.click()}>
            {tr(language, 'Compare JSON', 'Comparar JSON')}
          </button>
        </div>
      </div>
    </section>
  );
}
