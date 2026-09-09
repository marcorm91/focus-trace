import type { RuleDefinition } from './rule-catalog';

export const ACCESSIBLE_AUTHENTICATION_PASTE_RULE: RuleDefinition = {
  id: 'FT-REVIEW-024',
  title: 'Authentication input may block paste assistance',
  severity: 'serious',
  severityRationale: {
    en: 'Blocking paste on an authentication field can force users to remember or manually transcribe credentials or one-time codes, creating a substantial barrier for people with cognitive disabilities. FocusTrace keeps this as review because it observes only an explicit inline paste blocker and cannot prove whether an alternative authentication method or other assistance is available.',
    es: 'Bloquear el pegado en un campo de autenticación puede obligar a recordar o transcribir manualmente credenciales o códigos de un solo uso, creando una barrera importante para personas con discapacidades cognitivas. FocusTrace lo mantiene como revisión porque solo observa un bloqueo inline explícito del pegado y no puede demostrar si existe un método de autenticación alternativo u otra ayuda disponible.',
  },
  references: [
    {
      type: 'WCAG',
      id: '3.3.8',
      label: 'Accessible Authentication (Minimum)',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#accessible-authentication-minimum',
    },
  ],
};

export const AUTHENTICATION_RULES: RuleDefinition[] = [ACCESSIBLE_AUTHENTICATION_PASTE_RULE];
