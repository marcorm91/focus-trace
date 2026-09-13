import type { RuleDefinition } from './rule-catalog';
import {
  REPEATED_LANDMARK_LABEL_RULE,
  SECTION_HEADING_REVIEW_RULE,
} from './structural-html-rules';
import type { StandardReference } from './types';

export type DocumentStructureRuntimeRule = Pick<RuleDefinition, 'id' | 'title' | 'severity' | 'references'>;

const htmlHeadings: StandardReference = {
  type: 'HTML',
  id: 'headings-and-sections',
  label: 'HTML Living Standard · Headings and sections',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/sections.html#headings-and-sections',
};

const landmarkGuidance: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'landmark-regions',
  label: 'ARIA Authoring Practices Guide · Landmark Regions',
  status: 'informative',
  url: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
};

const ariaRegion: StandardReference = {
  type: 'WAI-ARIA',
  id: 'region',
  label: 'WAI-ARIA · region role',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/#region',
};

const PAGE_LEVEL_ONE_HEADING_RULE_ID = 'FT-REVIEW-030';
const EMPTY_HEADING_RULE_ID = 'FT-REVIEW-031';
const PARAGRAPH_AS_HEADING_RULE_ID = 'FT-REVIEW-032';
const TOP_LEVEL_LANDMARK_RULE_ID = 'FT-REVIEW-033';
const DUPLICATE_SINGLETON_LANDMARK_RULE_ID = 'FT-REVIEW-034';
const LANDMARK_COVERAGE_RULE_ID = 'FT-REVIEW-035';
const REGION_NAME_RULE_ID = 'FT-WARN-024';

const PAGE_LEVEL_ONE_HEADING_RULE_TITLE = 'Page should expose a level-one heading';
const EMPTY_HEADING_RULE_TITLE = 'Exposed heading should contain usable content';
const PARAGRAPH_AS_HEADING_RULE_TITLE = 'Heading-like paragraph needs semantic review';
const TOP_LEVEL_LANDMARK_RULE_TITLE = 'Primary landmarks should be top level';
const DUPLICATE_SINGLETON_LANDMARK_RULE_TITLE = 'Repeated banner or contentinfo landmarks need review';
const LANDMARK_COVERAGE_RULE_TITLE = 'Perceivable page content should be contained by landmarks';
const REGION_NAME_RULE_TITLE = 'Explicit region landmark requires an accessible name';

const headingRuntimeReferences = SECTION_HEADING_REVIEW_RULE.references;
const landmarkRuntimeReferences = REPEATED_LANDMARK_LABEL_RULE.references;

function runtimeRule(id: string, title: string, references: StandardReference[]): DocumentStructureRuntimeRule {
  return { id, title, severity: 'moderate', references };
}

export const PAGE_LEVEL_ONE_HEADING_RULE = runtimeRule(
  PAGE_LEVEL_ONE_HEADING_RULE_ID,
  PAGE_LEVEL_ONE_HEADING_RULE_TITLE,
  headingRuntimeReferences,
);

export const EMPTY_HEADING_RULE = runtimeRule(
  EMPTY_HEADING_RULE_ID,
  EMPTY_HEADING_RULE_TITLE,
  headingRuntimeReferences,
);

export const PARAGRAPH_AS_HEADING_RULE = runtimeRule(
  PARAGRAPH_AS_HEADING_RULE_ID,
  PARAGRAPH_AS_HEADING_RULE_TITLE,
  headingRuntimeReferences,
);

export const TOP_LEVEL_LANDMARK_RULE = runtimeRule(
  TOP_LEVEL_LANDMARK_RULE_ID,
  TOP_LEVEL_LANDMARK_RULE_TITLE,
  landmarkRuntimeReferences,
);

export const DUPLICATE_SINGLETON_LANDMARK_RULE = runtimeRule(
  DUPLICATE_SINGLETON_LANDMARK_RULE_ID,
  DUPLICATE_SINGLETON_LANDMARK_RULE_TITLE,
  landmarkRuntimeReferences,
);

export const LANDMARK_COVERAGE_RULE = runtimeRule(
  LANDMARK_COVERAGE_RULE_ID,
  LANDMARK_COVERAGE_RULE_TITLE,
  landmarkRuntimeReferences,
);

export const REGION_NAME_RULE = runtimeRule(
  REGION_NAME_RULE_ID,
  REGION_NAME_RULE_TITLE,
  [ariaRegion],
);

export const DOCUMENT_STRUCTURE_RULES = [
  PAGE_LEVEL_ONE_HEADING_RULE,
  EMPTY_HEADING_RULE,
  PARAGRAPH_AS_HEADING_RULE,
  TOP_LEVEL_LANDMARK_RULE,
  DUPLICATE_SINGLETON_LANDMARK_RULE,
  LANDMARK_COVERAGE_RULE,
  REGION_NAME_RULE,
] as const;

const PAGE_LEVEL_ONE_HEADING_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-REVIEW-030',
  title: PAGE_LEVEL_ONE_HEADING_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'A page without a level-one heading can make its hierarchy and primary topic harder to identify, but heading strategy remains contextual and is therefore reviewed rather than failed automatically.',
    es: 'Una página sin encabezado de nivel uno puede dificultar identificar su jerarquía y tema principal, pero la estrategia de encabezados depende del contexto y por eso se revisa en lugar de fallar automáticamente.',
  },
  references: [htmlHeadings],
};

const EMPTY_HEADING_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-REVIEW-031',
  title: EMPTY_HEADING_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'An exposed empty heading adds a navigation stop without communicating a section topic. FocusTrace keeps the result as review because rendered or alternative content can require contextual verification.',
    es: 'Un encabezado vacío expuesto añade una parada de navegación sin comunicar el tema de una sección. FocusTrace mantiene el resultado como revisión porque el contenido renderizado o alternativo puede requerir verificación contextual.',
  },
  references: [htmlHeadings],
};

const PARAGRAPH_AS_HEADING_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-REVIEW-032',
  title: PARAGRAPH_AS_HEADING_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'Text styled prominently like a heading but authored as a paragraph can hide document structure from assistive technology. Styling is only a heuristic, so FocusTrace never promotes this signal to an automatic failure.',
    es: 'Un texto con apariencia destacada de encabezado pero creado como párrafo puede ocultar la estructura del documento a las tecnologías de asistencia. El estilo solo es una heurística, por lo que FocusTrace nunca convierte esta señal en un fallo automático.',
  },
  references: [htmlHeadings],
};

const TOP_LEVEL_LANDMARK_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-REVIEW-033',
  title: TOP_LEVEL_LANDMARK_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'Nesting banner, main, complementary or contentinfo landmarks inside other landmarks can make the page-level structure harder to understand. APG expresses this as authoring guidance, so FocusTrace reports REVIEW.',
    es: 'Anidar landmarks banner, main, complementary o contentinfo dentro de otros landmarks puede dificultar comprender la estructura de nivel de página. APG lo expresa como guía de autoría, por lo que FocusTrace informa REVIEW.',
  },
  references: [landmarkGuidance],
};

const DUPLICATE_SINGLETON_LANDMARK_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-REVIEW-034',
  title: DUPLICATE_SINGLETON_LANDMARK_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'Multiple banner or contentinfo landmarks in the same document scope can make global page regions ambiguous. Nested document/application scopes are evaluated independently and the result remains contextual review.',
    es: 'Varios landmarks banner o contentinfo dentro del mismo ámbito documental pueden volver ambiguas las regiones globales de la página. Los ámbitos document/application anidados se evalúan por separado y el resultado sigue siendo una revisión contextual.',
  },
  references: [landmarkGuidance],
};

const LANDMARK_COVERAGE_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-REVIEW-035',
  title: LANDMARK_COVERAGE_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'Content outside landmark regions can be easier to overlook when assistive-technology users navigate by landmarks. Because landmark coverage is an APG best practice and page design is contextual, FocusTrace reports REVIEW.',
    es: 'El contenido situado fuera de regiones landmark puede ser más fácil de pasar por alto al navegar mediante landmarks con tecnologías de asistencia. Como la cobertura por landmarks es una buena práctica APG y el diseño depende del contexto, FocusTrace informa REVIEW.',
  },
  references: [landmarkGuidance],
};

const REGION_NAME_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-WARN-024',
  title: REGION_NAME_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'An explicitly authored region without an accessible name cannot communicate the purpose that distinguishes the region from surrounding content. This is reported as an ARIA authoring warning rather than a WCAG failure.',
    es: 'Una región creada explícitamente sin nombre accesible no puede comunicar el propósito que la distingue del contenido circundante. Se informa como aviso de autoría ARIA y no como fallo WCAG.',
  },
  references: [ariaRegion, landmarkGuidance],
};

export const DOCUMENT_STRUCTURE_RULE_DEFINITIONS = [
  PAGE_LEVEL_ONE_HEADING_RULE_DEFINITION,
  EMPTY_HEADING_RULE_DEFINITION,
  PARAGRAPH_AS_HEADING_RULE_DEFINITION,
  TOP_LEVEL_LANDMARK_RULE_DEFINITION,
  DUPLICATE_SINGLETON_LANDMARK_RULE_DEFINITION,
  LANDMARK_COVERAGE_RULE_DEFINITION,
  REGION_NAME_RULE_DEFINITION,
] as const;
