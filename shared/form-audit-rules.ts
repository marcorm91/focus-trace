import type { RuleDefinition } from './rule-catalog';

export const FORM_LABELING_AND_INSTRUCTIONS_RULE: RuleDefinition = {
  id: 'FT-REVIEW-040',
  title: 'Form labeling, grouping and instructions need review',
  severity: 'serious',
  severityRationale: {
    en: 'Ambiguous or weakly exposed form labels, group names, instructions and required-state cues can make data-entry tasks difficult to understand or complete. FocusTrace keeps this family as REVIEW because multiple labels, title-only naming and missing instruction relationships still require page-context judgement.',
    es: 'Las etiquetas, nombres de grupo, instrucciones y señales de obligatoriedad ambiguas o mal expuestas pueden dificultar la comprensión o finalización de formularios. FocusTrace mantiene esta familia como REVIEW porque las etiquetas múltiples, el nombre solo mediante title y la ausencia de relaciones de instrucciones aún requieren contexto de página.',
  },
  references: [
    {
      type: 'WCAG',
      id: '3.3.2',
      label: 'Labels or Instructions',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#labels-or-instructions',
    },
    {
      type: 'WCAG',
      id: '1.3.1',
      label: 'Info and Relationships',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#info-and-relationships',
    },
    {
      type: 'HTML',
      id: 'forms',
      label: 'HTML form control labeling and fieldset/legend semantics',
      status: 'normative',
      url: 'https://html.spec.whatwg.org/multipage/forms.html',
    },
  ],
};

export const FORM_AUDIT_RULES: RuleDefinition[] = [FORM_LABELING_AND_INSTRUCTIONS_RULE];
