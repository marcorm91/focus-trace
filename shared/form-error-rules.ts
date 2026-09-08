import type { RuleDefinition } from './rule-catalog';

export const ERROR_IDENTIFICATION_RULE: RuleDefinition = {
  id: 'FT-REVIEW-019',
  title: 'Observed invalid field may lack an associated text error description',
  severity: 'serious',
  severityRationale: {
    en: 'When an input error is detected, users need the field in error to be identified and the error described in text. FocusTrace keeps this as review because it can observe invalid-state and association signals but cannot prove every visual or application-level error message.',
    es: 'Cuando se detecta un error de entrada, las personas necesitan identificar el campo con error y recibir una descripción textual. FocusTrace lo mantiene como revisión porque puede observar señales de estado inválido y asociaciones, pero no demostrar todos los mensajes visuales o propios de la aplicación.',
  },
  references: [
    {
      type: 'WCAG',
      id: '3.3.1',
      label: 'Error Identification',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#error-identification',
    },
    {
      type: 'ACT',
      id: '36b590',
      label: 'Error message describes invalid form field value',
      status: 'proposed',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/36b590/proposed/',
    },
  ],
};

export const ERROR_SUGGESTION_RULE: RuleDefinition = {
  id: 'FT-REVIEW-020',
  title: 'Observed input error needs a correction-suggestion review',
  severity: 'moderate',
  severityRationale: {
    en: 'A known input error can block task completion when the user is told what is wrong but not how to correct it. FocusTrace keeps this as review because suggestion adequacy and the security/purpose exception require human context.',
    es: 'Un error de entrada conocido puede bloquear la finalización de una tarea cuando se explica qué está mal pero no cómo corregirlo. FocusTrace lo mantiene como revisión porque la suficiencia de la sugerencia y la excepción por seguridad o propósito requieren contexto humano.',
  },
  references: [
    {
      type: 'WCAG',
      id: '3.3.3',
      label: 'Error Suggestion',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#error-suggestion',
    },
  ],
};

export const FORM_ERROR_RULES: RuleDefinition[] = [
  ERROR_IDENTIFICATION_RULE,
  ERROR_SUGGESTION_RULE,
];
