import type { RuleDefinition } from './rule-catalog';

export const FOCUS_VISIBLE_RULE: RuleDefinition = {
  id: 'FT-RUNTIME-010',
  title: 'Keyboard focus may have no visible indicator',
  severity: 'serious',
  severityRationale: {
    en: 'When keyboard focus is not visibly indicated, sighted keyboard users can lose their position and may be unable to tell which control will receive the next action.',
    es: 'Cuando el foco de teclado no se indica visualmente, las personas usuarias de teclado con visión pueden perder su posición y no saber qué control recibirá la siguiente acción.',
  },
  references: [
    {
      type: 'WCAG',
      id: '2.4.7',
      label: 'Focus Visible',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#focus-visible',
    },
    {
      type: 'ACT',
      id: 'oj04fd',
      label: 'Element in sequential focus order has visible focus',
      status: 'informative',
      url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/oj04fd/',
    },
  ],
};
