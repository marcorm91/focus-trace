import type { RuleDefinition } from './rule-catalog';

export const HOVER_FOCUS_CONTENT_RULE: RuleDefinition = {
  id: 'FT-RUNTIME-015',
  title: 'Additional content triggered by hover or focus may not remain operable',
  severity: 'serious',
  severityRationale: {
    en: 'Additional content that disappears unexpectedly, cannot be reached with the pointer, or cannot be dismissed while it obscures other content can make information or controls unusable for people with low vision, keyboard users and users who need stable pointer interaction.',
    es: 'El contenido adicional que desaparece de forma inesperada, no puede alcanzarse con el puntero o no puede descartarse mientras tapa otro contenido puede hacer que la información o los controles sean inutilizables para personas con baja visión, usuarios de teclado y personas que necesitan una interacción estable con el puntero.',
  },
  references: [
    {
      type: 'WCAG',
      id: '1.4.13',
      label: 'Content on Hover or Focus',
      level: 'AA',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#content-on-hover-or-focus',
    },
  ],
};
