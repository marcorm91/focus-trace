import { guidanceForIssue } from '../../../lib/report/finding-guidance';
import { localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import { localizedRuleSeverityRationale } from '../../../shared/rule-catalog';
import type { ScanIssue } from '../../../shared/types';
import './finding-guidance.css';

export function FindingGuidance({ issue, language }: { issue: ScanIssue; language: AppLanguage }) {
  const guidance = guidanceForIssue(issue, language);
  const severityRationale = localizedRuleSeverityRationale(issue.ruleId, language);

  return (
    <div className="finding-guidance">
      {severityRationale && (
        <details className={`finding-guidance-severity severity-${issue.severity}`}>
          <summary>
            <span>{tr(language, 'Why this impact?', '¿Por qué este impacto?')}</span>
            <strong>{localizedSeverity(issue.severity, language)}</strong>
          </summary>
          <p>{severityRationale}</p>
          <small>{tr(
            language,
            'FocusTrace assigns this base impact independently. WCAG and ACT references describe accessibility requirements, not severity scores.',
            'FocusTrace asigna este impacto base de forma independiente. Las referencias WCAG y ACT describen requisitos de accesibilidad, no niveles de severidad.',
          )}</small>
        </details>
      )}

      <section>
        <small>{tr(language, 'User impact', 'Impacto')}</small>
        <p>{guidance.impact}</p>
      </section>
      <section className="finding-guidance-fix">
        <small>{tr(language, 'Suggested fix', 'Propuesta de solución')}</small>
        <p>{guidance.remediation}</p>
      </section>
      <section>
        <small>{tr(language, 'How to verify', 'Cómo validarlo')}</small>
        <p>{guidance.validation}</p>
      </section>
    </div>
  );
}
