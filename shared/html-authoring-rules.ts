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
