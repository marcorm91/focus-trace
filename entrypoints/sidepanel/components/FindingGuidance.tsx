import { guidanceForIssue, type FindingGuidance as FindingGuidanceModel } from '../../../lib/report/finding-guidance';
import { DUPLICATE_ID_RULE } from '../../../shared/html-authoring-rules';
import { localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import { localizedRuleSeverityRationale } from '../../../shared/rule-catalog';
import type { ScanIssue } from '../../../shared/types';
import './finding-guidance.css';

function duplicateIdGuidance(language: AppLanguage): FindingGuidanceModel {
  return {
    impact: tr(
      language,
      'Duplicate IDs can make labels, ARIA ID references, fragment links and scripted lookups resolve to the wrong element or behave inconsistently.',
      'Los IDs duplicados pueden hacer que etiquetas, referencias ARIA por ID, enlaces de fragmento y búsquedas mediante scripts se resuelvan hacia el elemento equivocado o se comporten de forma inconsistente.',
    ),
    remediation: tr(
      language,
      'Give every element a unique non-empty id and update every for, aria-labelledby, aria-describedby, aria-controls, aria-owns, aria-activedescendant, headers or href reference that points to the renamed identifier.',
      'Asigna a cada elemento un id no vacío y único, y actualiza todas las referencias for, aria-labelledby, aria-describedby, aria-controls, aria-owns, aria-activedescendant, headers o href que apunten al identificador renombrado.',
    ),
    validation: tr(
      language,
      'Run the scan again and confirm the duplicate-ID warning is gone, then verify that every ID-based relationship still resolves to its intended target.',
      'Vuelve a ejecutar el análisis y confirma que desaparece el aviso de ID duplicado; después verifica que cada relación basada en ID sigue resolviendo hacia su destino previsto.',
    ),
  };
}

export function FindingGuidance({ issue, language }: { issue: ScanIssue; language: AppLanguage }) {
  const guidance = issue.ruleId === DUPLICATE_ID_RULE.id
    ? duplicateIdGuidance(language)
    : guidanceForIssue(issue, language);
  const severityRationale = issue.ruleId === DUPLICATE_ID_RULE.id
    ? DUPLICATE_ID_RULE.severityRationale[language]
    : localizedRuleSeverityRationale(issue.ruleId, language);

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
            'FocusTrace assigns this base impact independently. Standards references describe authoring/accessibility requirements, not severity scores.',
            'FocusTrace asigna este impacto base de forma independiente. Las referencias normativas describen requisitos de autoría/accesibilidad, no niveles de severidad.',
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
