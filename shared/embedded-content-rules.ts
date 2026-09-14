import type { RuleDefinition } from './rule-catalog';
import type { StandardReference } from './types';

const wcagNonTextContent: StandardReference = {
  type: 'WCAG',
  id: '1.1.1',
  label: 'Non-text Content',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#non-text-content',
};

const wcagKeyboard: StandardReference = {
  type: 'WCAG',
  id: '2.1.1',
  label: 'Keyboard',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#keyboard',
};

const wcagNameRoleValue: StandardReference = {
  type: 'WCAG',
  id: '4.1.2',
  label: 'Name, Role, Value',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#name-role-value',
};

const actObjectAlternative: StandardReference = {
  type: 'ACT',
  id: '8fc3b6',
  label: 'Object element rendering non-text content has non-empty accessible name',
  status: 'proposed',
  url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/8fc3b6/proposed/',
};

const actFrameName: StandardReference = {
  type: 'ACT',
  id: 'cae760',
  label: 'Iframe element has accessible name',
  status: 'proposed',
  url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/cae760/proposed/',
};

const actFrameFocusableContent: StandardReference = {
  type: 'ACT',
  id: 'akn7bn',
  label: 'Iframe with negative tabindex has no focusable content',
  status: 'proposed',
  url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/akn7bn/proposed/',
};

const actFrameUniqueName: StandardReference = {
  type: 'ACT',
  id: '4b1c6c',
  label: 'Iframe elements with identical accessible names have equivalent purpose',
  status: 'proposed',
  url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/4b1c6c/proposed/',
};

const htmlIframe: StandardReference = {
  type: 'HTML',
  id: 'the-iframe-element',
  label: 'HTML Living Standard · The iframe element',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element',
};

const htmlObject: StandardReference = {
  type: 'HTML',
  id: 'the-object-element',
  label: 'HTML Living Standard · The object element',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-object-element',
};

export const OBJECT_ALTERNATIVE_RULE: RuleDefinition = {
  id: 'FT-WCAG-018',
  title: 'Embedded object has a non-empty accessible alternative',
  severity: 'serious',
  severityRationale: {
    en: 'An object that renders meaningful non-text content without an accessible alternative can remove the embedded information completely for screen-reader users.',
    es: 'Un object que renderiza contenido no textual significativo sin una alternativa accesible puede eliminar por completo esa información para usuarios de lector de pantalla.',
  },
  references: [wcagNonTextContent, actObjectAlternative, htmlObject],
};

export const FRAME_ACCESSIBLE_NAME_RULE: RuleDefinition = {
  id: 'FT-WCAG-019',
  title: 'Embedded frame has a non-empty accessible name',
  severity: 'serious',
  severityRationale: {
    en: 'An unnamed embedded browsing context can make its purpose impossible to identify when assistive-technology users navigate between frames.',
    es: 'Un contexto de navegación incrustado sin nombre puede hacer imposible identificar su propósito cuando los usuarios de tecnologías de asistencia navegan entre frames.',
  },
  references: [wcagNameRoleValue, actFrameName, htmlIframe],
};

export const FRAME_FOCUSABLE_CONTENT_RULE: RuleDefinition = {
  id: 'FT-WCAG-020',
  title: 'Frame with focusable content remains reachable from sequential keyboard navigation',
  severity: 'serious',
  severityRationale: {
    en: 'Removing a frame from sequential focus while its embedded document still contains keyboard-focusable controls can make those controls unreachable without a pointing device.',
    es: 'Excluir un frame del foco secuencial mientras su documento incrustado contiene controles enfocables puede hacer que esos controles resulten inaccesibles sin un dispositivo apuntador.',
  },
  references: [wcagKeyboard, actFrameFocusableContent, htmlIframe],
};

export const FRAME_NAME_UNIQUENESS_REVIEW_RULE: RuleDefinition = {
  id: 'FT-REVIEW-038',
  title: 'Frames with the same name need equivalent-purpose review',
  severity: 'serious',
  severityRationale: {
    en: 'Repeated frame names can make different embedded contexts indistinguishable, but identical names are valid when the frames genuinely serve an equivalent purpose.',
    es: 'Los nombres de frame repetidos pueden hacer indistinguibles distintos contextos incrustados, aunque son válidos cuando los frames tienen realmente un propósito equivalente.',
  },
  references: [wcagNameRoleValue, actFrameUniqueName, htmlIframe],
};

export const EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE: RuleDefinition = {
  id: 'FT-REVIEW-039',
  title: 'Nested audit context was not evaluated',
  severity: 'moderate',
  severityRationale: {
    en: 'A closed shadow root, cross-origin frame, sandboxed frame or traversal-budget boundary prevents complete local inspection, so FocusTrace must expose that boundary instead of claiming the nested content is clean.',
    es: 'Un shadow root cerrado, un frame cross-origin o aislado por sandbox, o un límite del presupuesto de recorrido impiden una inspección local completa, por lo que FocusTrace debe exponer ese límite en vez de afirmar que el contenido anidado está libre de problemas.',
  },
  references: [htmlIframe],
};

export const EMBEDDED_CONTENT_RULES = [
  OBJECT_ALTERNATIVE_RULE,
  FRAME_ACCESSIBLE_NAME_RULE,
  FRAME_FOCUSABLE_CONTENT_RULE,
  FRAME_NAME_UNIQUENESS_REVIEW_RULE,
  EMBEDDED_CONTENT_UNEVALUATED_REVIEW_RULE,
] as const;
