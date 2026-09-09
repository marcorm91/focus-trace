import type { RuleDefinition } from './rule-catalog';

export const INTERACTIVE_TEXT_CONTRAST_RULE: RuleDefinition = {
  id: 'FT-RUNTIME-014',
  title: 'Interactive state may have insufficient text contrast',
  severity: 'serious',
  severityRationale: {
    en: 'Text that becomes low-contrast only while a control is hovered, pressed, focused or otherwise active can still become difficult or impossible to read during the interaction.',
    es: 'El texto que pierde contraste solo mientras un control está en hover, pulsado, enfocado o en otro estado activo puede seguir siendo difícil o imposible de leer durante la interacción.',
  },
  references: [
    {
      type: 'WCAG',
      id: '1.4.3',
      label: 'Contrast (Minimum)',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#contrast-minimum',
    },
  ],
};
