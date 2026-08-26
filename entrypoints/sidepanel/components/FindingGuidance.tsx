import { guidanceForIssue } from '../../../lib/report/finding-guidance';
import { localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import { localizedRuleSeverityRationale, ruleDefinitionForId } from '../../../shared/rule-catalog';
import type { ScanIssue } from '../../../shared/types';
import './finding-guidance.css';

export function FindingGuidance({ issue, language }: { issue: ScanIssue; language: AppLanguage }) {
  const guidance = guidanceForIssue(issue, language);
  const rule = ruleDefinitionForId(issue.ruleId);
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
          {rule?.impactReferences.length ? (
            <div className="finding-guidance-impact-references">
              <small>{tr(language, 'Comparable impact reference', 'Referencia de impacto comparable')}</small>
              {rule.impactReferences.map((reference) => (
                <a href={reference.url} target="_blank" rel="noreferrer" key={`${reference.source}-${reference.ruleId}`}>
                  {reference.source} · {reference.ruleId} · {localizedSeverity(reference.impact, language)}
                  {reference.relation === 'partial'
                    ? ` · ${tr(language, 'partial scope', 'alcance parcial')}`
                    : ''}
                </a>
              ))}
            </div>
          ) : (
            <small>{tr(
              language,
              'FocusTrace-assessed impact; no direct external rule is used for this signal.',
              'Impacto evaluado por FocusTrace; no se utiliza una regla externa directamente equivalente para esta señal.',
            )}</small>
          )}
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
