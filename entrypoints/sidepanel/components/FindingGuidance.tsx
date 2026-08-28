import { useEffect, useState } from 'react';
import { browser } from '#imports';
import { guidanceForIssue, type FindingGuidance as FindingGuidanceModel } from '../../../lib/report/finding-guidance';
import { DUPLICATE_ID_RULE } from '../../../shared/html-authoring-rules';
import { localizedSeverity, tr, type AppLanguage } from '../../../shared/i18n';
import { localizedRuleSeverityRationale } from '../../../shared/rule-catalog';
import type { ScanIssue } from '../../../shared/types';
import './finding-guidance.css';

const HEADING_JUMP_RULE_ID = 'FT-REVIEW-002';

type HeadingReviewSnapshot = {
  level: string;
  text: string;
};

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

function HeadingReviewContext({ issue, language }: { issue: ScanIssue; language: AppLanguage }) {
  const target = issue.targets[0];
  const [heading, setHeading] = useState<HeadingReviewSnapshot>();

  useEffect(() => {
    let cancelled = false;
    setHeading(undefined);

    if (issue.ruleId !== HEADING_JUMP_RULE_ID || !target) return () => { cancelled = true; };

    void (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id == null) return;
        const results = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: (selector: string) => {
            const element = document.querySelector(selector);
            if (!element || !/^H[1-6]$/.test(element.tagName)) return undefined;
            return {
              level: element.tagName,
              text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
            };
          },
          args: [target],
        });
        const result = results[0]?.result as HeadingReviewSnapshot | undefined;
        if (!cancelled && result) setHeading(result);
      } catch {
        // The scan can outlive the inspected DOM. Keep the finding usable even
        // when the original heading can no longer be resolved on the page.
      }
    })();

    return () => { cancelled = true; };
  }, [issue.ruleId, target]);

  if (issue.ruleId !== HEADING_JUMP_RULE_ID || !heading) return null;

  return (
    <section className="finding-heading-context" aria-label={tr(language, 'Affected heading', 'Encabezado afectado')}>
      <small>{tr(language, 'Affected heading', 'Encabezado afectado')}</small>
      <div>
        <span aria-hidden="true">{heading.level}</span>
        <strong>{heading.text || tr(language, 'Empty heading', 'Encabezado vacío')}</strong>
      </div>
    </section>
  );
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
      <HeadingReviewContext issue={issue} language={language} />

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
