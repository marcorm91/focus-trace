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
  FOCUS_MEMORY_MAX_VISUAL_PREVIEWS,
} from '../../../shared/focus-memory';
import { tr, type AppLanguage } from '../../../shared/i18n';

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
      'Clear saved FocusTrace Memory history? This removes all remembered scan comparisons, auditor notes and local evidence previews from this browser profile.',
      '¿Borrar el historial guardado de FocusTrace Memory? Se eliminarán todas las comparaciones de análisis recordadas, las notas del auditor y las vistas previas de evidencia locales de este perfil del navegador.',
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
          'Remember bounded accessibility observations in this browser profile so future scans can identify fixes, persistent failures and regressions. Memory is enabled by default and you can turn it off at any time.',
          'Recuerda observaciones limitadas de accesibilidad en este perfil del navegador para que futuros análisis puedan identificar correcciones, fallos persistentes y regresiones. Memory está activado por defecto y puedes desactivarlo en cualquier momento.',
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
              'Enabled by default. Memory stores compact local history, auditor notes and may keep a small screenshot crop of a currently visible failing element. If no preview can be captured, it keeps a compact element locator such as an id or CSS selector instead. It does not store page HTML or a full DOM snapshot.',
              'Activado por defecto. Memory guarda un historial local compacto, las notas del auditor y puede conservar un pequeño recorte de captura de un elemento con fallo que esté visible. Si no puede obtener una vista previa, guarda en su lugar un localizador compacto del elemento, como un id o selector CSS. No almacena el HTML de la página ni un snapshot completo del DOM.',
            )}
          </small>
        </span>
      </label>

      <p className="settings-memory-note">
        {tr(
          language,
          `Memory has no time-based expiry. It keeps at most ${FOCUS_MEMORY_MAX_PER_SCOPE} observations per page/component, ${FOCUS_MEMORY_MAX_OBSERVATIONS} observations in total and ${FOCUS_MEMORY_MAX_VISUAL_PREVIEWS} visual previews across remembered findings; when a capacity limit is reached, the oldest retained evidence is replaced. Turning Memory off stops comparisons and new observations without deleting existing history.`,
          `Memory no caduca por antigüedad. Conserva como máximo ${FOCUS_MEMORY_MAX_PER_SCOPE} observaciones por página/componente, ${FOCUS_MEMORY_MAX_OBSERVATIONS} observaciones en total y ${FOCUS_MEMORY_MAX_VISUAL_PREVIEWS} vistas previas visuales entre los hallazgos recordados; al alcanzar un límite de capacidad se sustituye la evidencia conservada más antigua. Desactivar Memory detiene las comparaciones y las nuevas observaciones sin borrar el historial existente.`,
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
            ? tr(language, 'Saved history and evidence stay only in this browser profile.', 'El historial y la evidencia guardados permanecen solo en este perfil del navegador.')
            : tr(language, 'No saved Memory history.', 'No hay historial guardado en Memory.')}
        </small>
      </div>
    </fieldset>
  );
}
