import type { RuleDefinition } from './rule-catalog';
import type { StandardReference } from './types';

export type TableRuntimeRule = Pick<RuleDefinition, 'id' | 'title' | 'severity' | 'references'>;

const wcagInfoRelationships: StandardReference = {
  type: 'WCAG',
  id: '1.3.1',
  label: 'WCAG 2.2 · 1.3.1 Info and Relationships',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#info-and-relationships',
};

const htmlTables: StandardReference = {
  type: 'HTML',
  id: 'tables',
  label: 'HTML Living Standard · Tabular data',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/tables.html',
};

const ariaTable: StandardReference = {
  type: 'WAI-ARIA',
  id: 'table',
  label: 'WAI-ARIA · table, grid and cell roles',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/#table',
};

const CELL_HEADER_RELATIONSHIP_RULE_ID = 'FT-WCAG-017';
const EMPTY_TABLE_HEADER_RULE_ID = 'FT-WARN-025';
const TABLE_SCOPE_RULE_ID = 'FT-WARN-026';
const TABLE_HEADERS_REFERENCE_RULE_ID = 'FT-WARN-027';
const TABLE_HEADER_USAGE_RULE_ID = 'FT-REVIEW-036';
const TABLE_NAMING_RULE_ID = 'FT-REVIEW-037';

const CELL_HEADER_RELATIONSHIP_RULE_TITLE = 'Data table cell has a determinable header relationship';
const EMPTY_TABLE_HEADER_RULE_TITLE = 'Table header cell should expose usable header text';
const TABLE_SCOPE_RULE_TITLE = 'Table scope usage must match the HTML table model';
const TABLE_HEADERS_REFERENCE_RULE_TITLE = 'Table headers references must resolve to header cells in the same table';
const TABLE_HEADER_USAGE_RULE_TITLE = 'Table header should describe at least one data cell';
const TABLE_NAMING_RULE_TITLE = 'Table naming and caption-like content need review';

function runtimeRule(
  id: string,
  title: string,
  severity: RuleDefinition['severity'],
  references: StandardReference[],
): TableRuntimeRule {
  return { id, title, severity, references };
}

export const CELL_HEADER_RELATIONSHIP_RULE = runtimeRule(
  CELL_HEADER_RELATIONSHIP_RULE_ID,
  CELL_HEADER_RELATIONSHIP_RULE_TITLE,
  'serious',
  [wcagInfoRelationships, htmlTables, ariaTable],
);

export const EMPTY_TABLE_HEADER_RULE = runtimeRule(
  EMPTY_TABLE_HEADER_RULE_ID,
  EMPTY_TABLE_HEADER_RULE_TITLE,
  'moderate',
  [htmlTables, ariaTable],
);

export const TABLE_SCOPE_RULE = runtimeRule(
  TABLE_SCOPE_RULE_ID,
  TABLE_SCOPE_RULE_TITLE,
  'moderate',
  [htmlTables],
);

export const TABLE_HEADERS_REFERENCE_RULE = runtimeRule(
  TABLE_HEADERS_REFERENCE_RULE_ID,
  TABLE_HEADERS_REFERENCE_RULE_TITLE,
  'serious',
  [wcagInfoRelationships, htmlTables],
);

export const TABLE_HEADER_USAGE_RULE = runtimeRule(
  TABLE_HEADER_USAGE_RULE_ID,
  TABLE_HEADER_USAGE_RULE_TITLE,
  'moderate',
  [wcagInfoRelationships, htmlTables, ariaTable],
);

export const TABLE_NAMING_RULE = runtimeRule(
  TABLE_NAMING_RULE_ID,
  TABLE_NAMING_RULE_TITLE,
  'minor',
  [htmlTables, ariaTable],
);

export const TABLE_RULES = [
  CELL_HEADER_RELATIONSHIP_RULE,
  EMPTY_TABLE_HEADER_RULE,
  TABLE_SCOPE_RULE,
  TABLE_HEADERS_REFERENCE_RULE,
  TABLE_HEADER_USAGE_RULE,
  TABLE_NAMING_RULE,
] as const;

const CELL_HEADER_RELATIONSHIP_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-WCAG-017',
  title: CELL_HEADER_RELATIONSHIP_RULE_TITLE,
  severity: 'serious',
  severityRationale: {
    en: 'A data cell whose header relationship cannot be determined can lose essential row or column context for screen-reader users. FocusTrace fails only simple, deterministic cases and keeps complex table models for review.',
    es: 'Una celda de datos cuya relación con cabeceras no pueda determinarse puede perder contexto esencial de fila o columna para usuarios de lector de pantalla. FocusTrace solo falla casos simples y deterministas y mantiene los modelos de tabla complejos para revisión.',
  },
  references: [wcagInfoRelationships, htmlTables, ariaTable],
};

const EMPTY_TABLE_HEADER_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-WARN-025',
  title: EMPTY_TABLE_HEADER_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'An empty exposed header cell declares header semantics without usable identifying content, which can make table navigation ambiguous.',
    es: 'Una celda de cabecera expuesta pero vacía declara semántica de cabecera sin contenido identificativo útil, lo que puede hacer ambigua la navegación por la tabla.',
  },
  references: [htmlTables, ariaTable],
};

const TABLE_SCOPE_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-WARN-026',
  title: TABLE_SCOPE_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'Invalid or inapplicable scope authoring can contradict the table model and prevent reliable header association.',
    es: 'Un uso inválido o no aplicable de scope puede contradecir el modelo de tabla e impedir una asociación fiable de cabeceras.',
  },
  references: [htmlTables],
};

const TABLE_HEADERS_REFERENCE_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-WARN-027',
  title: TABLE_HEADERS_REFERENCE_RULE_TITLE,
  severity: 'serious',
  severityRationale: {
    en: 'Broken headers IDREFs can explicitly point a cell at missing, non-header or foreign-table elements and therefore expose an unreliable relationship.',
    es: 'Las referencias IDREF rotas de headers pueden apuntar explícitamente a elementos inexistentes, no cabecera o pertenecientes a otra tabla y exponer una relación no fiable.',
  },
  references: [wcagInfoRelationships, htmlTables],
};

const TABLE_HEADER_USAGE_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-REVIEW-036',
  title: TABLE_HEADER_USAGE_RULE_TITLE,
  severity: 'moderate',
  severityRationale: {
    en: 'A header that appears not to describe any data cell can indicate an incomplete or misleading table model, but complex layouts require human context.',
    es: 'Una cabecera que parece no describir ninguna celda de datos puede indicar un modelo de tabla incompleto o engañoso, pero las estructuras complejas requieren contexto humano.',
  },
  references: [wcagInfoRelationships, htmlTables, ariaTable],
};

const TABLE_NAMING_RULE_DEFINITION: RuleDefinition = {
  id: 'FT-REVIEW-037',
  title: TABLE_NAMING_RULE_TITLE,
  severity: 'minor',
  severityRationale: {
    en: 'Duplicate or caption-like naming patterns can make tables harder to distinguish, but intent and visual presentation require review rather than an automatic WCAG failure.',
    es: 'Los patrones de nombre duplicado o similares a un caption pueden dificultar distinguir tablas, pero la intención y la presentación visual requieren revisión en lugar de un fallo WCAG automático.',
  },
  references: [htmlTables, ariaTable],
};

export const TABLE_RULE_DEFINITIONS = [
  CELL_HEADER_RELATIONSHIP_RULE_DEFINITION,
  EMPTY_TABLE_HEADER_RULE_DEFINITION,
  TABLE_SCOPE_RULE_DEFINITION,
  TABLE_HEADERS_REFERENCE_RULE_DEFINITION,
  TABLE_HEADER_USAGE_RULE_DEFINITION,
  TABLE_NAMING_RULE_DEFINITION,
] as const;
