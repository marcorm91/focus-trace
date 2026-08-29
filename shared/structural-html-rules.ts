import type { RuleDefinition } from './rule-catalog';
import type { StandardReference } from './types';

const htmlContentModels: StandardReference = {
  type: 'HTML',
  id: 'content-models',
  label: 'HTML Living Standard · Content models',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/dom.html#content-models',
};

const htmlElementIndex: StandardReference = {
  type: 'HTML',
  id: 'elements-3',
  label: 'HTML Living Standard · Element index and permitted parents',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/indices.html#elements-3',
};

const htmlInteractiveContent: StandardReference = {
  type: 'HTML',
  id: 'interactive-content-2',
  label: 'HTML Living Standard · Interactive content',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/dom.html#interactive-content-2',
};

const htmlMain: StandardReference = {
  type: 'HTML',
  id: 'the-main-element',
  label: 'HTML Living Standard · The main element',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element',
};

const htmlSections: StandardReference = {
  type: 'HTML',
  id: 'sections',
  label: 'HTML Living Standard · Sections',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/sections.html',
};

const landmarkGuidance: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'landmark-regions',
  label: 'ARIA Authoring Practices Guide · Landmark Regions',
  status: 'informative',
  url: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
};

export const HTML_PARENT_CONTEXT_RULE: RuleDefinition = {
  id: 'FT-WARN-008',
  title: 'HTML element is used outside its required semantic context',
  severity: 'moderate',
  severityRationale: {
    en: 'Some native elements only have defined semantics in specific parent or ancestor contexts. Using them elsewhere is non-conforming HTML and can remove or distort the relationship authors intended to expose.',
    es: 'Algunos elementos nativos solo tienen una semántica definida dentro de contextos padre o ancestro concretos. Utilizarlos fuera de ellos genera HTML no conforme y puede eliminar o distorsionar la relación que se pretendía exponer.',
  },
  references: [htmlElementIndex, htmlContentModels],
};

export const HTML_CONTENT_MODEL_RULE: RuleDefinition = {
  id: 'FT-WARN-009',
  title: 'HTML semantic structure violates a native content model',
  severity: 'moderate',
  severityRationale: {
    en: 'Native structures such as lists, description lists, tables, details, figures and media have defined child ordering and grouping rules. Violating those rules can produce repaired DOM, undefined relationships or inconsistent accessibility semantics.',
    es: 'Las estructuras nativas como listas, listas de descripción, tablas, details, figure y multimedia tienen reglas definidas de hijos, orden y agrupación. Incumplirlas puede producir un DOM reparado, relaciones indefinidas o semántica de accesibilidad inconsistente.',
  },
  references: [htmlContentModels, htmlElementIndex],
};

export const NESTED_INTERACTIVE_CONTENT_RULE: RuleDefinition = {
  id: 'FT-WARN-010',
  title: 'Native interactive content is nested in a conflicting structure',
  severity: 'serious',
  severityRationale: {
    en: 'Nesting interactive controls or conflicting label/control semantics can create ambiguous activation, focus and accessibility-tree behavior. HTML explicitly prohibits several of these combinations.',
    es: 'Anidar controles interactivos o semánticas de etiqueta/control incompatibles puede crear comportamientos ambiguos de activación, foco y árbol de accesibilidad. HTML prohíbe explícitamente varias de estas combinaciones.',
  },
  references: [htmlInteractiveContent, htmlContentModels],
};

export const MAIN_HIERARCHY_RULE: RuleDefinition = {
  id: 'FT-WARN-011',
  title: 'Native main element is not hierarchically correct',
  severity: 'serious',
  severityRationale: {
    en: 'HTML restricts native main ancestors so the dominant page content is not placed inside competing sectioning, navigation or landmark structures. An invalid hierarchy can make the document primary region misleading.',
    es: 'HTML restringe los ancestros permitidos de main para que el contenido dominante no quede dentro de estructuras de sección, navegación o landmarks competidoras. Una jerarquía inválida puede hacer engañosa la región principal del documento.',
  },
  references: [htmlMain],
};

export const SECTION_HEADING_REVIEW_RULE: RuleDefinition = {
  id: 'FT-REVIEW-009',
  title: 'Sectioning content should be identifiable from its structure',
  severity: 'minor',
  severityRationale: {
    en: 'A section or article without a heading or other usable name is not automatically invalid, but it can make the document hierarchy harder to understand and may indicate that a generic container would be more appropriate.',
    es: 'Un section o article sin encabezado ni otro nombre utilizable no es automáticamente inválido, pero puede dificultar la comprensión de la jerarquía del documento e indicar que quizá sería más apropiado un contenedor genérico.',
  },
  references: [htmlSections],
};

export const REPEATED_LANDMARK_LABEL_RULE: RuleDefinition = {
  id: 'FT-REVIEW-010',
  title: 'Repeated landmarks should have distinguishable accessible names',
  severity: 'moderate',
  severityRationale: {
    en: 'When several navigation, complementary or search landmarks expose the same role, missing or duplicate names can make landmark navigation ambiguous for assistive-technology users.',
    es: 'Cuando varios landmarks de navegación, complementarios o de búsqueda exponen el mismo rol, los nombres ausentes o duplicados pueden volver ambigua la navegación por landmarks para usuarios de tecnologías de asistencia.',
  },
  references: [landmarkGuidance],
};

export const STRUCTURAL_HTML_RULES = [
  HTML_PARENT_CONTEXT_RULE,
  HTML_CONTENT_MODEL_RULE,
  NESTED_INTERACTIVE_CONTENT_RULE,
  MAIN_HIERARCHY_RULE,
  SECTION_HEADING_REVIEW_RULE,
  REPEATED_LANDMARK_LABEL_RULE,
] as const;
