import { useEffect, useState } from 'react';
import { browser } from '#imports';
import { tr, type AppLanguage } from '../../../shared/i18n';
import {
  adjacentUiScale,
  DEFAULT_UI_SCALE,
  normalizeUiScale,
  UI_SCALE_STORAGE_KEY,
  type UiScale,
} from '../../../shared/ui-scale';

const CREATOR_LINKEDIN = 'https://es.linkedin.com/in/marcorm91';
const REPOSITORY_URL = 'https://github.com/marcorm91/focus-trace';

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
  const version = browser.runtime.getManifest().version;

  useEffect(() => {
    void browser.storage.local.get(UI_SCALE_STORAGE_KEY).then((stored) => {
      const savedScale = normalizeUiScale(stored[UI_SCALE_STORAGE_KEY]);
      setUiScale(savedScale);
      document.documentElement.dataset.ftUiScale = String(savedScale);
    });
  }, []);

  const updateUiScale = (direction: -1 | 1) => {
    const nextScale = adjacentUiScale(uiScale, direction);
    setUiScale(nextScale);
    document.documentElement.dataset.ftUiScale = String(nextScale);
    void browser.storage.local.set({ [UI_SCALE_STORAGE_KEY]: nextScale });
  };

  return (
    <section className="panel settings-panel" aria-labelledby="settings-title">
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
