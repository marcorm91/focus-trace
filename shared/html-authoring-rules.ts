import type { RuleDefinition } from './rule-catalog';
import type { StandardReference } from './types';

const htmlIdReference: StandardReference = {
  type: 'HTML',
  id: 'id',
  label: 'HTML Living Standard · The id attribute',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute',
};

export const DUPLICATE_ID_RULE: RuleDefinition = {
  id: 'FT-WARN-004',
  title: 'Duplicate HTML id is used',
  severity: 'moderate',
  severityRationale: {
    en: 'Duplicate IDs are an HTML authoring error and can make labels, ARIA ID references, fragment links or scripted lookups resolve unpredictably, but the duplicate alone does not prove a WCAG failure.',
    es: 'Los IDs duplicados son un error de autoría HTML y pueden hacer que etiquetas, referencias ARIA por ID, enlaces de fragmento o búsquedas mediante scripts se resuelvan de forma impredecible, pero el duplicado por sí solo no demuestra un incumplimiento WCAG.',
  },
  references: [htmlIdReference],
};
