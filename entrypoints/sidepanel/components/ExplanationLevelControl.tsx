import { explanationLevelDescription, type ExplanationLevel } from '../../../lib/runtime/explanations';

export function ExplanationLevelControl({
  value,
  onChange,
}: {
  value: ExplanationLevel;
  onChange: (value: ExplanationLevel) => void;
}) {
  return (
    <label className="explanation-level">
      <span>
        <strong>Explanation</strong>
        <small>{explanationLevelDescription(value)}</small>
      </span>
      <select value={value} onChange={(event: { currentTarget: HTMLSelectElement }) => onChange(event.currentTarget.value as ExplanationLevel)}>
        <option value="simple">Simple</option>
        <option value="accessibility">Accessibility</option>
        <option value="developer">Developer</option>
      </select>
    </label>
  );
}
