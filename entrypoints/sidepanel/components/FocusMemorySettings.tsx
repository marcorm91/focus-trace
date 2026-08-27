import { useEffect, useState } from 'react';
import { browser } from '#imports';
import {
  DEFAULT_FOCUS_MEMORY_SETTINGS,
  FOCUS_MEMORY_MAX_OBSERVATIONS,
  FOCUS_MEMORY_MAX_PER_SCOPE,
  FOCUS_MEMORY_RETENTION_DAYS,
  FOCUS_MEMORY_SETTINGS_STORAGE_KEY,
  normalizeFocusMemorySettings,
  type FocusMemorySettings,
} from '../../../shared/focus-memory';
import { tr, type AppLanguage } from '../../../shared/i18n';
import './focus-memory-settings.css';

export function FocusMemorySettings({ language }: { language: AppLanguage }) {
  const [enabled, setEnabled] = useState(DEFAULT_FOCUS_MEMORY_SETTINGS.enabled);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void browser.storage.local.get(FOCUS_MEMORY_SETTINGS_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        const settings = normalizeFocusMemorySettings(stored[FOCUS_MEMORY_SETTINGS_STORAGE_KEY]);
        setEnabled(settings.enabled);
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
    const stored = await browser.storage.local.get(FOCUS_MEMORY_SETTINGS_STORAGE_KEY);
    const current = normalizeFocusMemorySettings(stored[FOCUS_MEMORY_SETTINGS_STORAGE_KEY]);
    const next: FocusMemorySettings = {
      ...current,
      enabled: nextEnabled,
      ...(nextEnabled ? { ignoreScansAtOrBefore: Date.now() } : {}),
    };
    setEnabled(nextEnabled);
    await browser.storage.local.set({
      [FOCUS_MEMORY_SETTINGS_STORAGE_KEY]: next,
    });
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
          `Retention is automatically limited to ${FOCUS_MEMORY_MAX_PER_SCOPE} observations per page/component, ${FOCUS_MEMORY_MAX_OBSERVATIONS} observations total and ${FOCUS_MEMORY_RETENTION_DAYS} days. Turning Memory off pauses comparisons and new storage but keeps existing local history until you clear it.`,
          `La retención se limita automáticamente a ${FOCUS_MEMORY_MAX_PER_SCOPE} observaciones por página/componente, ${FOCUS_MEMORY_MAX_OBSERVATIONS} observaciones en total y ${FOCUS_MEMORY_RETENTION_DAYS} días. Al desactivar Memory se pausan las comparaciones y el guardado de nuevas observaciones, pero el historial local existente se conserva hasta que lo borres.`,
        )}
      </p>
    </fieldset>
  );
}
