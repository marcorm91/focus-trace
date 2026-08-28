import { useEffect, useState } from 'react';
import { browser } from '#imports';
import {
  defaultRuntimeBreakpointSettings,
  normalizeRuntimeBreakpointSettings,
  RUNTIME_BREAKPOINTS,
} from '../../../lib/runtime/breakpoints';
import { localizedBreakpoint, tr, type AppLanguage } from '../../../shared/i18n';
import { RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY } from '../../../shared/runtime-breakpoint-preferences';
import type {
  ExtensionMessage,
  RuntimeBreakpointId,
  RuntimeBreakpointSettings,
  SessionState,
} from '../../../shared/types';
import {
  adjacentUiScale,
  DEFAULT_UI_SCALE,
  normalizeUiScale,
  UI_SCALE_STORAGE_KEY,
  type UiScale,
} from '../../../shared/ui-scale';
import { FocusMemorySettings } from '../components/FocusMemorySettings';
import '../breakpoint-settings.css';
import { closeFocusedSettingsView } from '../settings-focus';

const CREATOR_LINKEDIN = 'https://es.linkedin.com/in/marcorm91';
const REPOSITORY_URL = 'https://github.com/marcorm91/focus-trace';

const BREAKPOINT_SUBTITLES: Record<RuntimeBreakpointId, { en: string; es: string }> = {
  'focused-node-removed': {
    en: 'Detects when the element that currently owns keyboard focus is removed from the DOM, which can leave keyboard users without a predictable place to continue.',
    es: 'Detecta cuando el elemento que tiene el foco de teclado se elimina del DOM, algo que puede dejar al usuario sin un punto predecible desde el que continuar.',
  },
  'focus-fell-back-to-body': {
    en: 'Detects when focus is lost after an interaction and falls back to the document body instead of moving to a meaningful control or destination.',
    es: 'Detecta cuando el foco se pierde tras una interacción y termina en el body del documento en lugar de moverse a un control o destino significativo.',
  },
  'dialog-opened-without-focus': {
    en: 'Detects dialogs that become visible while keyboard focus stays outside, so the new context may not be obvious or immediately operable.',
    es: 'Detecta diálogos que se muestran mientras el foco permanece fuera, por lo que el nuevo contexto puede no resultar evidente ni operable de inmediato.',
  },
  'modal-focus-escape': {
    en: 'Detects focus moving outside an open modal dialog, which can let keyboard interaction reach content that should remain unavailable behind the modal.',
    es: 'Detecta cuando el foco sale de un diálogo modal abierto y permite alcanzar con teclado contenido que debería permanecer inaccesible detrás del modal.',
  },
  'route-changed-without-focus-move': {
    en: 'Detects SPA navigation where the visible view changes but focus stays in the previous context, making the new page state harder to discover by keyboard.',
    es: 'Detecta navegación SPA en la que cambia la vista visible pero el foco permanece en el contexto anterior, dificultando descubrir el nuevo estado con teclado.',
  },
  'focused-element-became-hidden': {
    en: 'Detects when the focused control, or one of its ancestors, becomes hidden while it still owns focus, leaving focus on content the user can no longer see or operate.',
    es: 'Detecta cuando el control con foco, o uno de sus ancestros, pasa a estar oculto mientras conserva el foco, dejándolo sobre contenido que ya no se ve o no se puede operar.',
  },
};

function breakpointSubtitle(id: RuntimeBreakpointId, language: AppLanguage): string {
  const copy = BREAKPOINT_SUBTITLES[id];
  return language === 'es' ? copy.es : copy.en;
}

async function activeTabId(): Promise<number | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

export function SettingsView({
  language,
  onLanguageChange,
}: {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void | Promise<void>;
}) {
  const [uiScale, setUiScale] = useState<UiScale>(() =>
    normalizeUiScale(document.documentElement.dataset.ftUiScale ?? DEFAULT_UI_SCALE),
  );
  const [breakpointSettings, setBreakpointSettings] = useState<RuntimeBreakpointSettings>(
    defaultRuntimeBreakpointSettings,
  );
  const version = browser.runtime.getManifest().version;

  useEffect(() => {
    document.documentElement.dataset.ftSettingsOpen = 'true';
    return () => {
      delete document.documentElement.dataset.ftSettingsOpen;
    };
  }, []);

  useEffect(() => {
    void browser.storage.local.get(UI_SCALE_STORAGE_KEY).then((stored) => {
      const savedScale = normalizeUiScale(stored[UI_SCALE_STORAGE_KEY]);
      setUiScale(savedScale);
      document.documentElement.dataset.ftUiScale = String(savedScale);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await browser.storage.local.get(RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY);
      const saved = stored[RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY] as Partial<RuntimeBreakpointSettings> | undefined;
      if (saved) {
        if (!cancelled) setBreakpointSettings(normalizeRuntimeBreakpointSettings(saved));
        return;
      }

      const tabId = await activeTabId();
      if (tabId == null) return;
      const session = (await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_GET_SESSION',
        tabId,
      } satisfies ExtensionMessage)) as SessionState;
      const migrated = normalizeRuntimeBreakpointSettings(session.breakpoints);
      await browser.storage.local.set({ [RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY]: migrated });
      if (!cancelled) setBreakpointSettings(migrated);
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const updateUiScale = (direction: -1 | 1) => {
    const nextScale = adjacentUiScale(uiScale, direction);
    setUiScale(nextScale);
    document.documentElement.dataset.ftUiScale = String(nextScale);
    void browser.storage.local.set({ [UI_SCALE_STORAGE_KEY]: nextScale });
  };

  const updateBreakpoint = async (breakpointId: RuntimeBreakpointId, enabled: boolean) => {
    const nextSettings: RuntimeBreakpointSettings = {
      ...breakpointSettings,
      [breakpointId]: enabled,
    };
    setBreakpointSettings(nextSettings);
    await browser.storage.local.set({
      [RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY]: nextSettings,
    });

    const tabId = await activeTabId();
    if (tabId == null) return;

    await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_BREAKPOINTS',
      tabId,
      breakpoints: nextSettings,
    } satisfies ExtensionMessage);
    await browser.tabs.sendMessage(tabId, {
      type: 'FOCUSTRACE_CONFIGURE_BREAKPOINTS',
      breakpoints: nextSettings,
    } satisfies ExtensionMessage).catch(() => undefined);
  };

  return (
    <section className="panel settings-panel" aria-labelledby="settings-title">
      <button
        type="button"
        className="settings-back-trigger"
        onClick={closeFocusedSettingsView}
      >
        <span aria-hidden="true">←</span>
        {tr(language, 'Back', 'Volver')}
      </button>

      <div className="section-heading">
        <div>
          <h2 id="settings-title">{tr(language, 'Settings', 'Ajustes')}</h2>
          <p>{tr(language, 'Configure how FocusTrace presents its findings.', 'Configura cómo presenta FocusTrace sus resultados.')}</p>
        </div>
      </div>

      <fieldset className="settings-group">
        <legend>{tr(language, 'Language', 'Idioma')}</legend>
        <p className="settings-help">
          {tr(
            language,
            'The interface and human-readable accessibility explanations change immediately.',
            'La interfaz y las explicaciones de accesibilidad cambian de idioma inmediatamente.',
          )}
        </p>

        <label className="language-option">
          <input
            type="radio"
            name="language"
            value="en"
            checked={language === 'en'}
            onChange={() => void onLanguageChange('en')}
          />
          <span><strong>English</strong><small>English</small></span>
        </label>
        <label className="language-option">
          <input
            type="radio"
            name="language"
            value="es"
            checked={language === 'es'}
            onChange={() => void onLanguageChange('es')}
          />
          <span><strong>Español</strong><small>Spanish · Español</small></span>
        </label>
      </fieldset>

      <fieldset className="settings-group settings-scale-group">
        <legend>{tr(language, 'Text and interface size', 'Tamaño de texto e interfaz')}</legend>
        <p className="settings-help">
          {tr(
            language,
            'Increase FocusTrace for easier reading without changing the inspected page.',
            'Amplía FocusTrace para facilitar la lectura sin modificar la página inspeccionada.',
          )}
        </p>
        <div
          className="ui-scale-control"
          role="group"
          aria-label={tr(language, 'FocusTrace size', 'Tamaño de FocusTrace')}
        >
          <button
            type="button"
            className="ui-scale-step"
            disabled={uiScale === 100}
            aria-label={tr(language, 'Decrease text and interface size', 'Reducir tamaño de texto e interfaz')}
            title={tr(language, 'Decrease FocusTrace size', 'Reducir tamaño de FocusTrace')}
            onClick={() => updateUiScale(-1)}
          >
            A−
          </button>
          <output
            className="ui-scale-value"
            aria-live="polite"
            aria-label={tr(language, `Current size ${uiScale}%`, `Tamaño actual ${uiScale}%`)}
          >
            {uiScale}%
          </output>
          <button
            type="button"
            className="ui-scale-step"
            disabled={uiScale === 130}
            aria-label={tr(language, 'Increase text and interface size', 'Aumentar tamaño de texto e interfaz')}
            title={tr(language, 'Increase FocusTrace size', 'Aumentar tamaño de FocusTrace')}
            onClick={() => updateUiScale(1)}
          >
            A+
          </button>
        </div>
        <small className="ui-scale-note">
          {tr(
            language,
            'Available sizes: 100%, 110%, 120% and 130%. Your choice is kept for future sessions.',
            'Tamaños disponibles: 100%, 110%, 120% y 130%. La elección se conserva para futuras sesiones.',
          )}
        </small>
      </fieldset>

      <fieldset className="settings-group settings-trace-group">
        <legend>Trace</legend>
        <div className="settings-trace-heading">
          <strong>{tr(language, 'Accessibility breakpoints', 'Breakpoints de accesibilidad')}</strong>
          <span>
            {tr(
              language,
              `${RUNTIME_BREAKPOINTS.filter((breakpoint) => breakpointSettings[breakpoint.id]).length}/${RUNTIME_BREAKPOINTS.length} enabled`,
              `${RUNTIME_BREAKPOINTS.filter((breakpoint) => breakpointSettings[breakpoint.id]).length}/${RUNTIME_BREAKPOINTS.length} activados`,
            )}
          </span>
        </div>
        <p className="settings-help">
          {tr(
            language,
            'Choose which deterministic runtime conditions should pause FocusTrace after their evidence has been saved. These preferences are reused across tabs until Start over resets them.',
            'Elige qué condiciones runtime deterministas deben pausar FocusTrace después de guardar su evidencia. Estas preferencias se reutilizan entre pestañas hasta que Empezar de cero las restablece.',
          )}
        </p>

        <div className="settings-breakpoint-list">
          {RUNTIME_BREAKPOINTS.map((breakpoint) => {
            const copy = localizedBreakpoint(breakpoint.id, breakpoint, language);
            return (
              <label key={breakpoint.id} className="settings-breakpoint-option">
                <input
                  type="checkbox"
                  checked={breakpointSettings[breakpoint.id]}
                  onChange={(event) => void updateBreakpoint(breakpoint.id, event.currentTarget.checked)}
                />
                <span>
                  <strong>{copy.label}</strong>
                  <small>{breakpointSubtitle(breakpoint.id, language)}</small>
                </span>
              </label>
            );
          })}
        </div>

        <p className="settings-breakpoint-note">
          {tr(
            language,
            'A breakpoint pauses FocusTrace recording only after the triggering event is stored. It never pauses JavaScript or changes the inspected page.',
            'Un breakpoint solo pausa la grabación de FocusTrace después de guardar el evento que lo activa. Nunca pausa JavaScript ni modifica la página inspeccionada.',
          )}
        </p>
      </fieldset>

      <FocusMemorySettings language={language} />

      <section className="settings-group settings-contact" aria-labelledby="settings-contact-title">
        <h3 id="settings-contact-title">{tr(language, 'Contact', 'Contacto')}</h3>
        <p className="settings-help">
          {tr(
            language,
            'Questions, feedback or accessibility ideas for FocusTrace.',
            'Dudas, feedback o ideas de accesibilidad para FocusTrace.',
          )}
        </p>
        <a className="settings-contact-link" href={CREATOR_LINKEDIN} target="_blank" rel="noreferrer">
          {tr(language, 'Contact Marco on LinkedIn', 'Contactar con Marco en LinkedIn')} <span aria-hidden="true">↗</span>
        </a>
      </section>

      <div className="notice settings-note">
        <strong>{tr(language, 'Standards stay canonical', 'Los estándares mantienen su nomenclatura oficial')}</strong>
        <p>
          {tr(
            language,
            'Identifiers such as WCAG 1.1.1, ACT 23a2a8, rule IDs and CSS selectors are not translated. FocusTrace translates the explanation around that evidence.',
            'Identificadores como WCAG 1.1.1, ACT 23a2a8, los IDs de reglas y los selectores CSS no se traducen. FocusTrace traduce la explicación que acompaña a esa evidencia.',
          )}
        </p>
      </div>

      <footer
        className="settings-meta"
        aria-label={tr(language, 'FocusTrace version and source code', 'Versión y código fuente de FocusTrace')}
      >
        <span>FocusTrace v{version}</span>
        <span aria-hidden="true">·</span>
        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </section>
  );
}
