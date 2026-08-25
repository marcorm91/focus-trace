import { tr, type AppLanguage } from '../../../shared/i18n';

export function SettingsView({
  language,
  onLanguageChange,
}: {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void | Promise<void>;
}) {
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

      <div className="notice settings-note">
        <strong>{tr(language, 'Standards stay canonical', 'Los estándares mantienen su nomenclatura oficial')}</strong>
        <p>
          {tr(
            language,
            'Identifiers such as WCAG 1.1.1, ACT 23a2a8 and rule IDs keep their canonical names. FocusTrace translates the explanation around that evidence.',
            'Identificadores como WCAG 1.1.1, ACT 23a2a8 y los IDs de reglas mantienen su nomenclatura oficial. FocusTrace traduce la explicación que acompaña a esa evidencia.',
          )}
        </p>
      </div>
    </section>
  );
}
