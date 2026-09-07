import type { RuleDefinition } from './rule-catalog';

export const LANGUAGE_PARTS_RULE: RuleDefinition = {
  id: 'FT-WCAG-009',
  title: 'Declared content language has a known primary language tag',
  severity: 'serious',
  severityRationale: {
    en: 'An invalid declared language for a passage can cause assistive technologies to apply the wrong pronunciation rules to that content.',
    es: 'Un idioma declarado no válido para un fragmento puede hacer que las tecnologías de asistencia apliquen reglas de pronunciación incorrectas a ese contenido.',
  },
  references: [
    {
      type: 'WCAG',
      id: '3.1.2',
      label: 'Language of Parts',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#language-of-parts',
    },
    {
      type: 'ACT',
      id: 'de46e4',
      label: 'Element with lang attribute has valid language tag',
      status: 'proposed',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/de46e4/proposed/',
    },
  ],
};
