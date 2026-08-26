import { guidanceForIssue } from '../../../lib/report/finding-guidance';
import { tr, type AppLanguage } from '../../../shared/i18n';
import type { ScanIssue } from '../../../shared/types';
import './finding-guidance.css';

export function FindingGuidance({ issue, language }: { issue: ScanIssue; language: AppLanguage }) {
  const guidance = guidanceForIssue(issue, language);
  return (
    <div className="finding-guidance">
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
