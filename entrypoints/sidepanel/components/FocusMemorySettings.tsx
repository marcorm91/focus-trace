import { useEffect, useState } from 'react';
import {
  clearFocusMemoryHistory,
  focusMemorySettingsState,
  setFocusMemoryEnabled,
} from '../../../lib/focus-memory/storage';
import {
  DEFAULT_FOCUS_MEMORY_SETTINGS,
  FOCUS_MEMORY_MAX_OBSERVATIONS,
  FOCUS_MEMORY_MAX_PER_SCOPE,
  FOCUS_MEMORY_RETENTION_DAYS,
} from '../../../shared/focus-memory';
import { tr, type AppLanguage } from '../../../shared/i18n';
import './focus-memory-settings.css';

export function FocusMemorySettings({ language }: { language: AppLanguage }) {
  const [enabled, setEnabled] = useState(DEFAULT_FOCUS_MEMORY_SETTINGS.enabled);
  const [hasHistory, setHasHistory] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void focusMemorySettingsState()
      .then(({ settings, hasHistory: storedHistory }) => {
        if (cancelled) return;
        setEnabled(settings.enabled);
        setHasHistory(storedHistory);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateEnabled = async (nextEnabled: boolean) => {
    const settings = await setFocusMemoryEnabled(nextEnabled);
    setEnabled(settings.enabled);
  };

  const clearHistory = async () => {
    const confirmed = window.confirm(tr(
      language,
      'Clear saved FocusTrace Memory history? This removes all remembered scan comparisons from this browser profile.',
      '¿Borrar el historial guardado de FocusTrace Memory? Se eliminarán todas las comparaciones de análisis recordadas en este perfil del navegador.',
    ));
    if (!confirmed) return;
    await clearFocusMemoryHistory();
    setHasHistory(false);
  };

  return (
    <fieldset className="settings-group settings-memory-group">
      <legend>FocusTrace Memory</legend>
      <p className="settings-help">
        {tr(
          language,
          'Optionally remember compact accessibility observations in this browser profile so future scans can identify fixes, persistent failures and regressions.',
          'Opcionalmente, recuerda observaciones compactas de accesibilidad en este perfil del navegador para que futuros análisis puedan identificar correcciones, fallos persistentes y regresiones.',
        )}
      </p>

      <label className="settings-memory-option">
        <input
          type="checkbox"
          checked={enabled}
          disabled={!ready}
          onChange={(event) => void updateEnabled(event.currentTarget.checked)}
        />
        <span>
          <strong>{tr(language, 'Remember accessibility history', 'Recordar historial de accesibilidad')}</strong>
          <small>
            {tr(
              language,
              'Disabled by default. When enabled, FocusTrace stores only compact local fingerprints, counts and timestamps; it does not store page HTML, DOM snapshots or screenshots in Memory.',
              'Deshabilitado por defecto. Al activarlo, FocusTrace guarda únicamente fingerprints compactos, recuentos y fechas de forma local; Memory no guarda el HTML de la página, snapshots del DOM ni capturas de pantalla.',
            )}
          </small>
        </span>
      </label>

      <p className="settings-memory-note">
        {tr(
          language,
          `Memory keeps at most ${FOCUS_MEMORY_MAX_PER_SCOPE} observations per page/component and ${FOCUS_MEMORY_MAX_OBSERVATIONS} in total. Observations older than ${FOCUS_MEMORY_RETENTION_DAYS} days are pruned the next time FocusTrace reads Memory storage. Turning Memory off stops comparisons and new observations without requiring you to delete existing history.`,
          `Memory conserva como máximo ${FOCUS_MEMORY_MAX_PER_SCOPE} observaciones por página/componente y ${FOCUS_MEMORY_MAX_OBSERVATIONS} en total. Las observaciones de más de ${FOCUS_MEMORY_RETENTION_DAYS} días se eliminan la próxima vez que FocusTrace lee el almacenamiento de Memory. Desactivar Memory detiene las comparaciones y las nuevas observaciones sin obligarte a borrar el historial existente.`,
        )}
      </p>

      <div className="settings-memory-actions">
        <button
          type="button"
          disabled={!ready || !hasHistory}
          onClick={() => void clearHistory()}
        >
          {tr(language, 'Clear saved history', 'Borrar historial guardado')}
        </button>
        <small aria-live="polite">
          {hasHistory
            ? tr(language, 'Saved history is stored only in this browser profile.', 'El historial guardado solo se almacena en este perfil del navegador.')
            : tr(language, 'No saved Memory history.', 'No hay historial guardado en Memory.')}
        </small>
      </div>
    </fieldset>
  );
}
