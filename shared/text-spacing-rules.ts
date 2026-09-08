import type { RuleDefinition } from './rule-catalog';

export const TEXT_SPACING_RULE: RuleDefinition = {
  id: 'FT-REVIEW-016',
  title: 'Inline important text spacing may block user adjustments',
  severity: 'moderate',
  severityRationale: {
    en: 'Inline !important text spacing can prevent user or extension styles from reaching WCAG text-spacing values, but page-provided spacing controls and language/script applicability still require context.',
    es: 'El espaciado de texto inline con !important puede impedir que estilos del usuario o extensiones alcancen los valores WCAG, pero los controles propios de la página y la aplicabilidad por idioma/escritura siguen requiriendo contexto.',
  },
  references: [
    {
      type: 'WCAG',
      id: '1.4.12',
      label: 'Text Spacing',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#text-spacing',
    },
    {
      type: 'ACT',
      id: '24afc2',
      label: 'Important letter spacing in style attributes is wide enough',
      status: 'informative',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/24afc2/',
    },
    {
      type: 'ACT',
      id: '78fd32',
      label: 'Important line height in style attributes is wide enough',
      status: 'informative',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/78fd32/',
    },
    {
      type: 'ACT',
      id: '9e45ec',
      label: 'Important word spacing in style attributes is wide enough',
      status: 'informative',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/9e45ec/',
    },
  ],
};

export const TEXT_SPACING_ACT_ID_BY_PROPERTY = {
  'letter-spacing': '24afc2',
  'line-height': '78fd32',
  'word-spacing': '9e45ec',
} as const;
