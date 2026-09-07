import type { RuleDefinition } from './rule-catalog';

export const INPUT_PURPOSE_AUTOCOMPLETE_RULE: RuleDefinition = {
  id: 'FT-REVIEW-014',
  title: 'Standard autocomplete purpose tokens may be malformed',
  severity: 'serious',
  severityRationale: {
    en: 'A malformed standard autocomplete purpose can prevent user-data fields from exposing a machine-readable purpose for personalization and input assistance. The result remains review because WCAG 1.3.5 applicability depends on whether the field collects information about the user.',
    es: 'Un propósito autocomplete estándar mal formado puede impedir que los campos de datos del usuario expongan un propósito interpretable para personalización y ayuda de entrada. El resultado se mantiene como revisión porque la aplicabilidad de WCAG 1.3.5 depende de si el campo recopila información sobre el usuario.',
  },
  references: [
    {
      type: 'WCAG',
      id: '1.3.5',
      label: 'Identify Input Purpose',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#identify-input-purpose',
    },
    {
      type: 'ACT',
      id: '73f2c2',
      label: 'Autocomplete attribute has valid value',
      status: 'proposed',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/73f2c2/proposed/',
    },
  ],
};

export const FORM_PURPOSE_RULES: RuleDefinition[] = [INPUT_PURPOSE_AUTOCOMPLETE_RULE];
