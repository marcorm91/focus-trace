import { explanationLevelDescription, type ExplanationLevel } from '../../../lib/runtime/explanations';
import { tr, type AppLanguage } from '../../../shared/i18n';

export function ExplanationLevelControl({
  value,
  onChange,
  language,
}: {
  value: ExplanationLevel;
  onChange: (value: ExplanationLevel) => void;
  language: AppLanguage;
}) {
  return (
    <label className="explanation-level">
      <span>
        <strong>{tr(language, 'Explanation', 'Explicación')}</strong>
        <small>{explanationLevelDescription(value, language)}</small>
      </span>
      <select
        value={value}
        aria-label={tr(language, 'Explanation level', 'Nivel de explicación')}
        onChange={(event: { currentTarget: HTMLSelectElement }) => onChange(event.currentTarget.value as ExplanationLevel)}
      >
        <option value="simple">{tr(language, 'Simple', 'Simple')}</option>
        <option value="accessibility">{tr(language, 'Accessibility', 'Accesibilidad')}</option>
        <option value="developer">{tr(language, 'Developer', 'Desarrollador')}</option>
      </select>
    </label>
  );
}
