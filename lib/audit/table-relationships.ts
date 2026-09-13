import type { FindingOutcome, ScanRuleResult } from '../../shared/types';
import {
  CELL_HEADER_RELATIONSHIP_RULE,
  EMPTY_TABLE_HEADER_RULE,
  TABLE_HEADER_USAGE_RULE,
  TABLE_HEADERS_REFERENCE_RULE,
  TABLE_NAMING_RULE,
  TABLE_RULES,
  TABLE_SCOPE_RULE,
  type TableRuntimeRule,
} from '../../shared/table-rules';
import { accessibleNameDetails, isProgrammaticallyHidden } from './dom';
import { scopedElements } from './scan-elements';
import { registeredExplicitAriaRole } from './standards-registry';

export type TableSignalKind =
  | 'missing-cell-header'
  | 'empty-header'
  | 'invalid-scope'
  | 'invalid-headers-reference'
  | 'unused-header'
  | 'table-naming';

export interface TableRelationshipSignal {
  kind: TableSignalKind;
  rule: TableRuntimeRule;
  element: Element;
  outcome: FindingOutcome;
  description: string;
  evidence: string;
}

export interface TableRelationshipEvaluation {
  signals: TableRelationshipSignal[];
  ruleResults: ScanRuleResult[];
  passes: number;
}

type RootKind = 'native' | 'aria-table' | 'aria-grid' | 'aria-treegrid';
type HeaderKind = 'native' | 'rowheader' | 'columnheader';

interface TableRoot {
  element: Element;
  kind: RootKind;
}

interface CellModel {
  element: Element;
  row: number;
  colStart: number;
  colEnd: number;
  rowGroup?: Element;
  headerKind?: HeaderKind;
  data: boolean;
}

interface Model {
  root: TableRoot;
  rows: Element[];
  cells: CellModel[];
  headers: CellModel[];
  dataCells: CellModel[];
  complex: boolean;
  dataTable: boolean;
}

interface MutableStats {
  applicable: number;
  passed: number;
  failures: number;
  reviews: number;
  warnings: number;
}

const TABLE_ROOT_ROLES = new Set(['table', 'grid', 'treegrid']);
const ARIA_CELL_ROLES = new Set(['cell', 'gridcell', 'rowheader', 'columnheader']);
const VALID_SCOPE = new Set(['row', 'col', 'rowgroup', 'colgroup']);

function normalizedText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function explicitRole(element: Element): string | undefined {
  return element.hasAttribute('role') ? registeredExplicitAriaRole(element)?.name : undefined;
}

function rootKind(element: Element): RootKind | null {
  const role = explicitRole(element);
  if (element.tagName === 'TABLE') {
    if (role === 'presentation' || role === 'none') return null;
    if (role === 'grid') return 'aria-grid';
    if (role === 'treegrid') return 'aria-treegrid';
    if (role && role !== 'table') return null;
    return 'native';
  }
  if (role === 'table') return 'aria-table';
  if (role === 'grid') return 'aria-grid';
  if (role === 'treegrid') return 'aria-treegrid';
  return null;
}

function tableRoots(root: Document | Element): TableRoot[] {
  return scopedElements(root, 'table, [role]')
    .filter((element) => !isProgrammaticallyHidden(element))
    .map((element) => ({ element, kind: rootKind(element) }))
    .filter((entry): entry is TableRoot => entry.kind != null);
}

function nearestTableRoot(element: Element): Element | null {
  let current: Element | null = element;
  while (current) {
    if (rootKind(current)) return current;
    current = current.parentElement;
  }
  return null;
}

function ownNativeRows(table: Element): Element[] {
  return scopedElements(table, 'tr').filter((row) => nearestTableRoot(row) === table && !isProgrammaticallyHidden(row));
}

function ownAriaRows(table: Element): Element[] {
  return scopedElements(table, '[role]')
    .filter((row) => explicitRole(row) === 'row' && nearestTableRoot(row) === table && !isProgrammaticallyHidden(row));
}

function nativeModel(root: TableRoot): Model {
  const rows = ownNativeRows(root.element);
  const cells: CellModel[] = [];
  const occupied = new Map<number, { remaining: number }>();
  let complex = false;

  rows.forEach((row, rowIndex) => {
    for (const [column, span] of [...occupied]) {
      span.remaining -= 1;
      if (span.remaining <= 0) occupied.delete(column);
    }

    let column = 0;
    const rowCells = [...row.children].filter((child) =>
      (child.tagName === 'TH' || child.tagName === 'TD') && nearestTableRoot(child) === root.element && !isProgrammaticallyHidden(child),
    );

    for (const cell of rowCells) {
      while (occupied.has(column)) column += 1;
      const colspan = Math.max(1, Number.parseInt(cell.getAttribute('colspan') ?? '1', 10) || 1);
      const rawRowspan = Number.parseInt(cell.getAttribute('rowspan') ?? '1', 10);
      const rowspan = rawRowspan === 0 ? rows.length - rowIndex : Math.max(1, rawRowspan || 1);
      if (colspan > 1 || rowspan > 1) complex = true;

      const model: CellModel = {
        element: cell,
        row: rowIndex,
        colStart: column,
        colEnd: column + colspan - 1,
        rowGroup: row.closest('thead, tbody, tfoot') ?? undefined,
        ...(cell.tagName === 'TH' ? { headerKind: 'native' as const, data: false } : { data: true }),
      };
      cells.push(model);

      if (rowspan > 1) {
        for (let offset = 0; offset < colspan; offset += 1) {
          occupied.set(column + offset, { remaining: rowspan });
        }
      }
      column += colspan;
    }
  });

  const widths = rows.map((_, rowIndex) => cells.filter((cell) => cell.row === rowIndex).reduce((max, cell) => Math.max(max, cell.colEnd + 1), 0));
  const nonZeroWidths = widths.filter(Boolean);
  if (new Set(nonZeroWidths).size > 1) complex = true;

  const headers = cells.filter((cell) => cell.headerKind);
  const dataCells = cells.filter((cell) => cell.data);
  const caption = root.element.querySelector(':scope > caption');
  const hasName = Boolean(tableName(root));
  const hasExplicitHeaders = dataCells.some((cell) => cell.element.hasAttribute('headers'));
  const hasSummary = Boolean(normalizedText(root.element.getAttribute('summary')));
  const dataTable = headers.length > 0 || hasExplicitHeaders || Boolean(normalizedText(caption?.textContent)) || hasSummary || hasName;

  return { root, rows, cells, headers, dataCells, complex, dataTable };
}

function ariaModel(root: TableRoot): Model {
  const rows = ownAriaRows(root.element);
  const cells: CellModel[] = [];
  let complex = root.element.hasAttribute('aria-rowcount') || root.element.hasAttribute('aria-colcount') || root.element.hasAttribute('aria-owns');

  rows.forEach((row, rowIndex) => {
    if (row.hasAttribute('aria-rowindex') || row.hasAttribute('aria-owns')) complex = true;
    let column = 0;
    const rowCells = scopedElements(row, '[role]')
      .filter((cell) => nearestTableRoot(cell) === root.element && cell.closest('[role="row"]') === row && ARIA_CELL_ROLES.has(explicitRole(cell) ?? '') && !isProgrammaticallyHidden(cell));

    for (const cell of rowCells) {
      const role = explicitRole(cell);
      const explicitColumn = Number.parseInt(cell.getAttribute('aria-colindex') ?? '', 10);
      const colspan = Math.max(1, Number.parseInt(cell.getAttribute('aria-colspan') ?? '1', 10) || 1);
      const rowspan = Math.max(1, Number.parseInt(cell.getAttribute('aria-rowspan') ?? '1', 10) || 1);
      if (cell.hasAttribute('aria-colindex') || cell.hasAttribute('aria-rowindex') || colspan > 1 || rowspan > 1) complex = true;
      if (Number.isFinite(explicitColumn) && explicitColumn > 0) column = explicitColumn - 1;

      const headerKind: HeaderKind | undefined = role === 'rowheader'
        ? 'rowheader'
        : role === 'columnheader'
          ? 'columnheader'
          : undefined;
      cells.push({
        element: cell,
        row: rowIndex,
        colStart: column,
        colEnd: column + colspan - 1,
        ...(headerKind ? { headerKind, data: false } : { data: true }),
      });
      column += colspan;
    }
  });

  const widths = rows.map((_, rowIndex) => cells.filter((cell) => cell.row === rowIndex).reduce((max, cell) => Math.max(max, cell.colEnd + 1), 0));
  if (new Set(widths.filter(Boolean)).size > 1) complex = true;
  const headers = cells.filter((cell) => cell.headerKind);
  const dataCells = cells.filter((cell) => cell.data);
  return { root, rows, cells, headers, dataCells, complex, dataTable: true };
}

function buildModel(root: TableRoot): Model {
  return root.kind === 'native' ? nativeModel(root) : ariaModel(root);
}

function tableName(root: TableRoot): string {
  const explicit = normalizedText(accessibleNameDetails(root.element).name);
  if (explicit) return explicit;
  if (root.kind !== 'native') return '';
  const caption = root.element.querySelector(':scope > caption');
  return normalizedText(caption?.textContent);
}

function headerText(cell: CellModel): string {
  const name = normalizedText(accessibleNameDetails(cell.element).name);
  if (name) return name;
  return normalizedText(cell.element.textContent);
}

function overlapsColumn(a: CellModel, b: CellModel): boolean {
  return a.colStart <= b.colEnd && b.colStart <= a.colEnd;
}

function scopeValue(header: CellModel): string {
  return normalizedText(header.element.getAttribute('scope')).toLowerCase();
}

function nativeHeaderApplies(header: CellModel, data: CellModel, simple: boolean): boolean {
  const scope = scopeValue(header);
  if (scope === 'row') return header.row === data.row && data.colEnd >= header.colStart;
  if (scope === 'col') return header.row <= data.row && overlapsColumn(header, data);
  if (scope === 'rowgroup') return Boolean(header.rowGroup && header.rowGroup === data.rowGroup && data.row >= header.row);
  if (scope === 'colgroup') return false;
  if (!simple) return false;
  if (header.row === 0 && header.row < data.row && overlapsColumn(header, data)) return true;
  if (header.colStart === 0 && header.row === data.row && header.colEnd < data.colStart) return true;
  return false;
}

function ariaHeaderApplies(header: CellModel, data: CellModel): boolean {
  if (header.headerKind === 'columnheader') return header.row < data.row && overlapsColumn(header, data);
  if (header.headerKind === 'rowheader') return header.row === data.row && header.colEnd < data.colStart;
  return false;
}

function explicitHeaders(
  model: Model,
  cell: CellModel,
): { present: boolean; valid: boolean; headers: CellModel[]; detail?: string } {
  if (model.root.kind !== 'native' || !cell.element.hasAttribute('headers')) {
    return { present: false, valid: false, headers: [] };
  }

  const raw = normalizedText(cell.element.getAttribute('headers'));
  const ids = raw.split(/\s+/).filter(Boolean);
  if (!ids.length) return { present: true, valid: false, headers: [], detail: 'headers is present but contains no IDREF token.' };

  const resolved: CellModel[] = [];
  const problems: string[] = [];
  for (const id of ids) {
    const target = document.getElementById(id);
    if (!target) {
      problems.push(`${JSON.stringify(id)} does not resolve`);
      continue;
    }
    if (target.tagName !== 'TH') {
      problems.push(`${JSON.stringify(id)} resolves to <${target.tagName.toLowerCase()}> instead of <th>`);
      continue;
    }
    if (nearestTableRoot(target) !== model.root.element) {
      problems.push(`${JSON.stringify(id)} resolves to a header in another table`);
      continue;
    }
    if (isProgrammaticallyHidden(target)) {
      problems.push(`${JSON.stringify(id)} resolves to a programmatically hidden header`);
      continue;
    }
    const header = model.headers.find((candidate) => candidate.element === target);
    if (!header) {
      problems.push(`${JSON.stringify(id)} does not resolve to an exposed header cell in this table model`);
      continue;
    }
    resolved.push(header);
  }
  return {
    present: true,
    valid: problems.length === 0 && resolved.length > 0,
    headers: resolved,
    ...(problems.length ? { detail: problems.join('; ') } : {}),
  };
}

function signal(
  kind: TableSignalKind,
  rule: TableRuntimeRule,
  element: Element,
  outcome: FindingOutcome,
  description: string,
  evidence: string,
): TableRelationshipSignal {
  return { kind, rule, element, outcome, description, evidence };
}

function statsTemplate(): Map<string, MutableStats> {
  return new Map(TABLE_RULES.map((rule) => [rule.id, { applicable: 0, passed: 0, failures: 0, reviews: 0, warnings: 0 }]));
}

function mark(stats: Map<string, MutableStats>, rule: TableRuntimeRule, outcome: 'pass' | FindingOutcome): void {
  const value = stats.get(rule.id);
  if (!value) return;
  value.applicable += 1;
  if (outcome === 'pass') value.passed += 1;
  else if (outcome === 'fail') value.failures += 1;
  else if (outcome === 'review') value.reviews += 1;
  else value.warnings += 1;
}

function scopeProblem(model: Model, element: Element): string | null {
  const value = normalizedText(element.getAttribute('scope')).toLowerCase();
  if (element.tagName !== 'TH') return 'scope is only conforming on native <th> cells.';
  if (!VALID_SCOPE.has(value)) return `scope=${JSON.stringify(value)} is not row, col, rowgroup or colgroup.`;
  if (value === 'rowgroup') {
    const group = element.closest('thead, tbody, tfoot');
    if (!group || nearestTableRoot(group) !== model.root.element) return 'scope="rowgroup" is not anchored in a row group for this table.';
  }
  if (value === 'colgroup' && !model.root.element.querySelector(':scope > colgroup')) {
    return 'scope="colgroup" is present but this table exposes no colgroup to establish that column group.';
  }
  return null;
}

function namingSignals(models: Model[], signals: TableRelationshipSignal[], stats: Map<string, MutableStats>): void {
  const names = new Map<string, Model[]>();
  for (const model of models) {
    let reviewed = false;
    if (model.root.kind === 'native') {
      const caption = normalizedText(model.root.element.querySelector(':scope > caption')?.textContent);
      const summary = normalizedText(model.root.element.getAttribute('summary'));
      if (caption && summary && caption.toLocaleLowerCase() === summary.toLocaleLowerCase()) {
        signals.push(signal(
          'table-naming', TABLE_NAMING_RULE, model.root.element, 'review',
          'The table exposes the same text through its caption and legacy summary attribute. Review the redundant naming so assistive-technology users do not receive duplicated identification.',
          `caption and summary both normalize to ${JSON.stringify(caption.slice(0, 160))}.`,
        ));
        reviewed = true;
      }

      if (!caption) {
        const firstRow = model.rows[0];
        if (firstRow) {
          const firstRowCells = model.cells.filter((cell) => cell.row === 0);
          const candidate = firstRowCells.length === 1 && firstRowCells[0]?.element.tagName === 'TD' ? firstRowCells[0] : undefined;
          const laterWidth = model.cells.filter((cell) => cell.row > 0).reduce((max, cell) => Math.max(max, cell.colEnd + 1), 0);
          const candidateText = candidate ? normalizedText(candidate.element.textContent) : '';
          if (candidate && candidateText && (candidate.colEnd > candidate.colStart || laterWidth > 1)) {
            signals.push(signal(
              'table-naming', TABLE_NAMING_RULE, candidate.element, 'review',
              'The first data cell spans or precedes multiple columns and looks structurally like caption content, but the table has no native caption. Review whether this text should be a <caption>.',
              `caption-like first cell text=${JSON.stringify(candidateText.slice(0, 160))}; observed later width=${laterWidth}.`,
            ));
            reviewed = true;
          }
        }
      }
    }

    const name = tableName(model.root).toLocaleLowerCase();
    if (name) names.set(name, [...(names.get(name) ?? []), model]);
    mark(stats, TABLE_NAMING_RULE, reviewed ? 'review' : 'pass');
  }

  for (const [name, duplicates] of names) {
    if (duplicates.length < 2) continue;
    for (const model of duplicates) {
      signals.push(signal(
        'table-naming', TABLE_NAMING_RULE, model.root.element, 'review',
        'Multiple exposed tables use the same accessible name. Review whether users can distinguish these table regions reliably.',
        `duplicate normalized table name=${JSON.stringify(name.slice(0, 160))}; matching tables=${duplicates.length}.`,
      ));
      const value = stats.get(TABLE_NAMING_RULE.id);
      if (value?.passed) {
        value.passed -= 1;
        value.reviews += 1;
      }
    }
  }
}

export function evaluateTableRelationships(root: Document | Element): TableRelationshipEvaluation {
  const signals: TableRelationshipSignal[] = [];
  const stats = statsTemplate();
  const models = tableRoots(root).map(buildModel);

  for (const model of models) {
    const associatedHeaders = new Set<Element>();

    for (const header of model.headers) {
      const empty = !headerText(header);
      mark(stats, EMPTY_TABLE_HEADER_RULE, empty ? 'warning' : 'pass');
      if (empty) {
        signals.push(signal(
          'empty-header', EMPTY_TABLE_HEADER_RULE, header.element, 'warning',
          'This exposed table header cell has no usable text or accessible name. Header semantics without identifying content can make row or column context ambiguous.',
          `header role=${header.headerKind}; row=${header.row + 1}; columns=${header.colStart + 1}-${header.colEnd + 1}.`,
        ));
      }
    }

    if (model.root.kind === 'native') {
      const scoped = scopedElements(model.root.element, '[scope]').filter((element) => nearestTableRoot(element) === model.root.element && !isProgrammaticallyHidden(element));
      for (const element of scoped) {
        const problem = scopeProblem(model, element);
        mark(stats, TABLE_SCOPE_RULE, problem ? 'warning' : 'pass');
        if (problem) {
          signals.push(signal(
            'invalid-scope', TABLE_SCOPE_RULE, element, 'warning',
            'The scope attribute is invalid or cannot be applied reliably in this native table model.',
            problem,
          ));
        }
      }

      for (const cell of model.cells.filter((candidate) => candidate.element.hasAttribute('headers'))) {
        const explicit = explicitHeaders(model, cell);
        mark(stats, TABLE_HEADERS_REFERENCE_RULE, explicit.valid ? 'pass' : 'warning');
        if (!explicit.valid) {
          signals.push(signal(
            'invalid-headers-reference', TABLE_HEADERS_REFERENCE_RULE, cell.element, 'warning',
            'The explicit headers relationship does not resolve exclusively to exposed <th> cells in the same table.',
            explicit.detail ?? 'The headers relationship did not resolve to a usable header cell.',
          ));
        }
      }
    }

    if (!model.dataTable) continue;

    for (const dataCell of model.dataCells) {
      const explicit = explicitHeaders(model, dataCell);
      const inferred = model.headers.filter((header) => model.root.kind === 'native'
        ? nativeHeaderApplies(header, dataCell, !model.complex)
        : ariaHeaderApplies(header, dataCell));
      const resolved = explicit.valid ? explicit.headers : inferred;
      resolved.forEach((header) => associatedHeaders.add(header.element));

      if (resolved.length) {
        mark(stats, CELL_HEADER_RELATIONSHIP_RULE, 'pass');
        continue;
      }

      const deterministic = !model.complex && model.headers.length > 0 && !explicit.present;
      const outcome: FindingOutcome = deterministic ? 'fail' : 'review';
      mark(stats, CELL_HEADER_RELATIONSHIP_RULE, outcome);
      signals.push(signal(
        'missing-cell-header', CELL_HEADER_RELATIONSHIP_RULE, dataCell.element, outcome,
        deterministic
          ? 'This data cell belongs to a simple exposed data table, but FocusTrace cannot resolve a row or column header for it from native/ARIA semantics.'
          : 'FocusTrace cannot prove a header relationship for this data cell because the table is complex, explicitly authored with an unresolved relationship, or exposes insufficient header semantics. Review the table model manually.',
        `table kind=${model.root.kind}; row=${dataCell.row + 1}; columns=${dataCell.colStart + 1}-${dataCell.colEnd + 1}; complex=${model.complex}; headers=${model.headers.length}; explicit headers=${explicit.present ? (explicit.valid ? 'valid' : 'unresolved') : 'absent'}.`,
      ));
    }

    for (const header of model.headers) {
      if (!headerText(header)) continue;
      const used = associatedHeaders.has(header.element);
      mark(stats, TABLE_HEADER_USAGE_RULE, used ? 'pass' : 'review');
      if (!used) {
        signals.push(signal(
          'unused-header', TABLE_HEADER_USAGE_RULE, header.element, 'review',
          'FocusTrace did not resolve this exposed header to any data cell. Review whether it represents a real row/column header or whether a complex table relationship needs more explicit authoring.',
          `header role=${header.headerKind}; row=${header.row + 1}; columns=${header.colStart + 1}-${header.colEnd + 1}; table complex=${model.complex}.`,
        ));
      }
    }
  }

  namingSignals(models, signals, stats);

  const ruleResults = TABLE_RULES.map((rule) => {
    const value = stats.get(rule.id)!;
    return { ruleId: rule.id, ...value };
  });
  const passes = ruleResults.reduce((sum, result) => sum + result.passed, 0);
  return { signals, ruleResults, passes };
}
