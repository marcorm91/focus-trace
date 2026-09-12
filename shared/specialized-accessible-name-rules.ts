import type { RuleDefinition } from './rule-catalog';
import type { StandardReference } from './types';

const wcagNameRoleValue: StandardReference = {
  type: 'WCAG',
  id: '4.1.2',
  label: 'Name, Role, Value',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#name-role-value',
};

const wcagNonTextContent: StandardReference = {
  type: 'WCAG',
  id: '1.1.1',
  label: 'Non-text Content',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#non-text-content',
};

const ariaNaming: StandardReference = {
  type: 'WAI-ARIA',
  id: 'namecalculation',
  label: 'WAI-ARIA 1.3 Editor Draft · Accessible name requirements',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/#namecalculation',
};

const apgNames: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'names-and-descriptions',
  label: 'ARIA Authoring Practices Guide · Providing Accessible Names and Descriptions',
  status: 'informative',
  url: 'https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/',
};

export const SPECIALIZED_CONTROL_NAME_RULE: RuleDefinition = {
  id: 'FT-WCAG-014',
  title: 'Specialized interactive control has a non-empty accessible name',
  severity: 'serious',
  severityRationale: {
    en: 'An unnamed tab, tooltip or summary control can hide the purpose of navigation, contextual help or disclosure from assistive-technology users.',
    es: 'Una pestaña, tooltip o control summary sin nombre puede ocultar a usuarios de tecnologías de asistencia el propósito de la navegación, la ayuda contextual o el contenido desplegable.',
  },
  references: [wcagNameRoleValue, ariaNaming, apgNames],
};

export const RANGE_INDICATOR_NAME_RULE: RuleDefinition = {
  id: 'FT-WCAG-015',
  title: 'Meter or progress indicator has a non-empty accessible name',
  severity: 'serious',
  severityRationale: {
    en: 'An unnamed meter or progress indicator can expose a value without identifying what that value represents, removing essential non-text information for screen-reader users.',
    es: 'Un medidor o indicador de progreso sin nombre puede exponer un valor sin identificar qué representa, eliminando información no textual esencial para usuarios de lector de pantalla.',
  },
  references: [wcagNonTextContent, ariaNaming, apgNames],
};

export const SPECIALIZED_ARIA_NAME_WARNING_RULE: RuleDefinition = {
  id: 'FT-WARN-022',
  title: 'ARIA dialog or tree item has no usable accessible name',
  severity: 'serious',
  severityRationale: {
    en: 'Dialogs require an author-provided name and tree items need a usable name to be understandable in composite navigation. FocusTrace reports this as an ARIA authoring warning rather than automatically asserting a WCAG failure where the benchmark itself treats the condition as best practice.',
    es: 'Los diálogos requieren un nombre proporcionado por el autor y los elementos de árbol necesitan un nombre utilizable para comprenderse en la navegación compuesta. FocusTrace lo informa como advertencia de autoría ARIA en lugar de afirmar automáticamente un fallo WCAG cuando la propia referencia lo trata como buena práctica.',
  },
  references: [ariaNaming, apgNames],
};

export const SPECIALIZED_ACCESSIBLE_NAME_RULES = [
  SPECIALIZED_CONTROL_NAME_RULE,
  RANGE_INDICATOR_NAME_RULE,
  SPECIALIZED_ARIA_NAME_WARNING_RULE,
] as const;
