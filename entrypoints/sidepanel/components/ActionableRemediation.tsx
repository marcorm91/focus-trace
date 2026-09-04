import { actionableRemediationForRule } from '../../../lib/report/actionable-remediation';
import { tr, type AppLanguage } from '../../../shared/i18n';
import './actionable-remediation.css';

export function ActionableRemediation({
  ruleId,
  language,
}: {
  ruleId?: string | undefined;
  language: AppLanguage;
}) {
  const guidance = actionableRemediationForRule(ruleId, language);
  if (!guidance) return null;

  return (
    <section className="actionable-remediation" aria-label={tr(language, 'How to fix', 'Cómo corregirlo')}>
      <strong>{tr(language, 'How to fix', 'Cómo corregirlo')}</strong>
      <ul>
        {guidance.options.map((option) => <li key={option}>{option}</li>)}
      </ul>
      <p>
        <strong>{tr(language, 'Verify:', 'Verifica:')}</strong>{' '}
        {guidance.validation}
      </p>
    </section>
  );
}
