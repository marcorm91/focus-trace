import type { RuleDefinition } from './rule-catalog';
import type { StandardReference } from './types';

const htmlIdReference: StandardReference = {
  type: 'HTML',
  id: 'id',
  label: 'HTML Living Standard · The id attribute',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute',
};

const htmlMainReference: StandardReference = {
  type: 'HTML',
  id: 'the-main-element',
  label: 'HTML Living Standard · The main element',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element',
};

const htmlButtonReference: StandardReference = {
  type: 'HTML',
  id: 'the-button-element',
  label: 'HTML Living Standard · The button element',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element',
};

const htmlLinkReference: StandardReference = {
  type: 'HTML',
  id: 'links-created-by-a-and-area-elements',
  label: 'HTML Living Standard · Links created by a and area elements',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/links.html#links-created-by-a-and-area-elements',
};

const htmlObsoleteReference: StandardReference = {
  type: 'HTML',
  id: 'obsolete',
  label: 'HTML Living Standard · Obsolete features',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/obsolete.html',
};

const ariaAuthoringReference: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'read-me-first',
  label: 'ARIA Authoring Practices Guide · Read Me First',
  status: 'informative',
  url: 'https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/',
};

const landmarkReference: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'landmark-regions',
  label: 'ARIA Authoring Practices Guide · Landmark Regions',
  status: 'informative',
  url: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
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

export const OBSOLETE_HTML_ELEMENT_RULE: RuleDefinition = {
  id: 'FT-WARN-005',
  title: 'Entirely obsolete HTML element is used',
  severity: 'moderate',
  severityRationale: {
    en: 'Entirely obsolete HTML elements are non-conforming authoring features and can preserve legacy behavior or semantics that are harder to maintain and reason about, although their presence alone is not a WCAG failure.',
    es: 'Los elementos HTML totalmente obsoletos son características de autoría no conformes y pueden mantener comportamientos o semánticas heredadas más difíciles de mantener y analizar, aunque su presencia por sí sola no supone un fallo WCAG.',
  },
  references: [htmlObsoleteReference],
};

export const OBSOLETE_HTML_ATTRIBUTE_RULE: RuleDefinition = {
  id: 'FT-WARN-006',
  title: 'Obsolete non-conforming HTML attribute is used',
  severity: 'minor',
  severityRationale: {
    en: 'An obsolete attribute is a current HTML authoring error and often reflects presentation or legacy behavior that belongs in modern markup, CSS or script, but it does not necessarily create an accessibility barrier by itself.',
    es: 'Un atributo obsoleto es un error de autoría en HTML actual y suele reflejar presentación o comportamiento heredado que debe trasladarse a marcado moderno, CSS o JavaScript, pero no crea necesariamente una barrera de accesibilidad por sí solo.',
  },
  references: [htmlObsoleteReference],
};

export const OBSOLETE_BUT_CONFORMING_HTML_RULE: RuleDefinition = {
  id: 'FT-WARN-007',
  title: 'Obsolete but conforming HTML feature is used',
  severity: 'minor',
  severityRationale: {
    en: 'HTML still permits this legacy feature only so conformance checkers can distinguish old vestigial markup from a hard conformance error; authors are expected to remove or modernize it.',
    es: 'HTML todavía permite esta característica heredada para que los validadores distingan marcado residual antiguo de un error de conformidad estricto; se espera que los autores la eliminen o modernicen.',
  },
  references: [htmlObsoleteReference],
};

export const MAIN_LANDMARK_RULE: RuleDefinition = {
  id: 'FT-REVIEW-004',
  title: 'Page exposes a primary main landmark',
  severity: 'moderate',
  severityRationale: {
    en: 'A missing main landmark can make repeated navigation and orientation harder for assistive-technology users, but its absence alone does not prove a WCAG failure.',
    es: 'La ausencia de un landmark principal puede dificultar la orientación y la navegación repetida a usuarios de tecnologías de asistencia, pero por sí sola no demuestra un incumplimiento WCAG.',
  },
  references: [htmlMainReference, landmarkReference],
};

export const MULTIPLE_MAIN_LANDMARKS_RULE: RuleDefinition = {
  id: 'FT-REVIEW-005',
  title: 'Multiple main landmarks need structural review',
  severity: 'moderate',
  severityRationale: {
    en: 'Several exposed main landmarks can make the primary content ambiguous unless the structure and landmark names clearly distinguish their purpose.',
    es: 'Varios landmarks principales expuestos pueden hacer ambiguo el contenido principal salvo que la estructura y sus nombres distingan claramente su propósito.',
  },
  references: [htmlMainReference, landmarkReference],
};

export const NATIVE_BUTTON_SEMANTICS_RULE: RuleDefinition = {
  id: 'FT-REVIEW-006',
  title: 'Button-like interaction should prefer native button semantics',
  severity: 'moderate',
  severityRationale: {
    en: 'A custom button can be accessible when implemented completely, but native button semantics provide keyboard behavior, focus handling and platform semantics without recreating them manually.',
    es: 'Un botón personalizado puede ser accesible si se implementa por completo, pero la semántica nativa de button aporta comportamiento de teclado, foco y semántica de plataforma sin tener que recrearlos manualmente.',
  },
  references: [htmlButtonReference, ariaAuthoringReference],
};

export const NATIVE_LINK_SEMANTICS_RULE: RuleDefinition = {
  id: 'FT-REVIEW-007',
  title: 'Navigation-like interaction should prefer native link semantics',
  severity: 'moderate',
  severityRationale: {
    en: 'A custom link can expose a link role, but a native anchor with href supplies navigation semantics and expected browser behavior more reliably.',
    es: 'Un enlace personalizado puede exponer el rol link, pero un ancla nativa con href aporta semántica de navegación y comportamiento esperado del navegador de forma más fiable.',
  },
  references: [htmlLinkReference, ariaAuthoringReference],
};

export const GENERIC_INTERACTIVE_SEMANTICS_RULE: RuleDefinition = {
  id: 'FT-REVIEW-008',
  title: 'Generic interactive element needs semantic review',
  severity: 'moderate',
  severityRationale: {
    en: 'Pointer interaction on a generic element may represent a button, link or another widget. FocusTrace keeps this as review until the intended interaction can be established confidently.',
    es: 'La interacción de puntero sobre un elemento genérico puede representar un botón, un enlace u otro widget. FocusTrace lo mantiene como revisión hasta poder determinar con suficiente confianza la interacción prevista.',
  },
  references: [ariaAuthoringReference],
};
