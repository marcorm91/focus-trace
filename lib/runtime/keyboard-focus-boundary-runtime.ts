import { isProgrammaticallyHidden, semanticRole, selectorFor } from '../audit/dom';
import { accessibilityOwns, ownedRoleElements } from './aria-ownership';
import { snapshot } from './page-inspection';
import type { KeyboardFocusAction } from './keyboard-focus-types';
import type { RuntimeEvent, StandardReference } from '../../shared/types';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;
type BoundaryPattern = 'tree' | 'grid' | 'treegrid';

export type BoundaryKeyboardFocusProbe = {
  kind: 'boundary-navigation';
  owner: Element;
  expected: Element;
  key: 'Home' | 'End';
  pattern: BoundaryPattern;
};

const COMPOSITE_SELECTOR = '[role="tree"], [role="grid"], [role="treegrid"]';
const GRID_CELL_ROLES = ['gridcell', 'rowheader', 'columnheader'];

const APG_TREE_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'treeview',
  label: 'Tree View Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/treeview/',
  status: 'informative',
};
const APG_GRID_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'grid',
  label: 'Grid Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/grid/',
  status: 'informative',
};
const APG_TREEGRID_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'treegrid',
  label: 'Treegrid Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/',
  status: 'informative',
};

function pendingFinding(input: {
  ruleId: string;
  title: string;
  detail: string;
  element: Element;
  references: StandardReference[];
}): PendingRuntimeEvent {
  return {
    kind: 'aria-widget',
    severity: 'moderate',
    outcome: 'review',
    ruleId: input.ruleId,
    title: input.title,
    detail: input.detail,
    element: snapshot(input.element),
    references: input.references,
  };
}

function isAvailable(element: Element): boolean {
  return element.isConnected && !isProgrammaticallyHidden(element);
}

function compositeForTarget(target: Element): Element | undefined {
  const ancestor = target.closest(COMPOSITE_SELECTOR);
  if (ancestor) return ancestor;
  return [...document.querySelectorAll(COMPOSITE_SELECTOR)]
    .find((candidate) => accessibilityOwns(candidate, target));
}

function belongsToComposite(composite: Element, candidate: Element): boolean {
  const nearest = candidate.closest(COMPOSITE_SELECTOR);
  if (nearest && nearest !== composite) return false;
  return accessibilityOwns(composite, candidate);
}

function targetConsumesBoundaryKey(target: Element): boolean {
  const role = semanticRole(target);
  if (['slider', 'spinbutton', 'combobox', 'textbox', 'searchbox'].includes(role ?? '')) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    const type = target.type.toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'image'].includes(type);
  }
  return target.getAttribute('contenteditable')?.trim().toLowerCase() === 'true';
}

function activeCompositeItem(composite: Element, managed: Element[]): Element | undefined {
  const activeId = composite.getAttribute('aria-activedescendant')?.trim();
  if (activeId) {
    const active = document.getElementById(activeId);
    if (active) {
      const managedActive = managed.find((item) => item === active || item.contains(active));
      if (managedActive) return managedActive;
    }
  }
  const active = document.activeElement instanceof Element ? document.activeElement : undefined;
  if (!active) return undefined;
  return managed.find((item) => item === active || item.contains(active));
}

function treeBoundaryNavigation(
  tree: Element,
  key: 'Home' | 'End',
): BoundaryKeyboardFocusProbe | undefined {
  const items = ownedRoleElements(tree, ['treeitem'])
    .filter((item) => belongsToComposite(tree, item) && isAvailable(item));
  if (!items.length || !activeCompositeItem(tree, items)) return undefined;
  const expected = key === 'Home' ? items[0] : items[items.length - 1];
  return expected ? { kind: 'boundary-navigation', owner: tree, expected, key, pattern: 'tree' } : undefined;
}

function gridRows(grid: Element): Element[] {
  return ownedRoleElements(grid, ['row'])
    .filter((row) => belongsToComposite(grid, row) && isAvailable(row));
}

function rowCells(row: Element): Element[] {
  return ownedRoleElements(row, GRID_CELL_ROLES)
    .filter((cell) => {
      const domRow = cell.closest('[role="row"]');
      return (domRow ? domRow === row : accessibilityOwns(row, cell)) && isAvailable(cell);
    });
}

function managedGridItem(grid: Element): Element | undefined {
  const rows = gridRows(grid);
  const cells = rows.flatMap(rowCells);
  const activeId = grid.getAttribute('aria-activedescendant')?.trim();
  const rawActive = activeId
    ? document.getElementById(activeId)
    : document.activeElement instanceof Element
      ? document.activeElement
      : undefined;
  if (!rawActive) return undefined;
  const cell = cells.find((candidate) => candidate === rawActive || candidate.contains(rawActive));
  if (cell) return cell;
  return rows.find((row) => row === rawActive || row.contains(rawActive));
}

function gridBoundaryNavigation(
  grid: Element,
  key: 'Home' | 'End',
): BoundaryKeyboardFocusProbe | undefined {
  const current = managedGridItem(grid);
  if (!current) return undefined;
  const role = semanticRole(grid);

  if (semanticRole(current) === 'row') {
    if (role !== 'treegrid') return undefined;
    const rows = gridRows(grid);
    const expected = key === 'Home' ? rows[0] : rows[rows.length - 1];
    return expected
      ? { kind: 'boundary-navigation', owner: grid, expected, key, pattern: 'treegrid' }
      : undefined;
  }

  const row = current.closest('[role="row"]')
    ?? gridRows(grid).find((candidate) => accessibilityOwns(candidate, current));
  if (!row) return undefined;
  const cells = rowCells(row);
  const expected = key === 'Home' ? cells[0] : cells[cells.length - 1];
  if (!expected) return undefined;
  return {
    kind: 'boundary-navigation',
    owner: grid,
    expected,
    key,
    pattern: role === 'treegrid' ? 'treegrid' : 'grid',
  };
}

export function captureBoundaryKeyboardFocusProbes(
  target: Element,
  action: KeyboardFocusAction,
): BoundaryKeyboardFocusProbe[] {
  if (action.kind !== 'keydown' || (action.key !== 'Home' && action.key !== 'End')) return [];
  const composite = compositeForTarget(target);
  if (!composite || (target !== composite && targetConsumesBoundaryKey(target))) return [];
  const role = semanticRole(composite);
  const probe = role === 'tree'
    ? treeBoundaryNavigation(composite, action.key)
    : role === 'grid' || role === 'treegrid'
      ? gridBoundaryNavigation(composite, action.key)
      : undefined;
  return probe ? [probe] : [];
}

function evaluateExpectedFocus(probe: BoundaryKeyboardFocusProbe): PendingRuntimeEvent | undefined {
  if (!probe.owner.isConnected || !probe.expected.isConnected || !isAvailable(probe.expected)) return undefined;
  const active = document.activeElement instanceof Element ? document.activeElement : undefined;
  const activeId = probe.owner.getAttribute('aria-activedescendant')?.trim();
  const virtualActive = activeId ? document.getElementById(activeId) : undefined;
  if (
    active === probe.expected
    || (active != null && probe.expected.contains(active))
    || virtualActive === probe.expected
    || (virtualActive != null && probe.expected.contains(virtualActive))
  ) return undefined;

  const reference = probe.pattern === 'tree'
    ? APG_TREE_REFERENCE
    : probe.pattern === 'treegrid'
      ? APG_TREEGRID_REFERENCE
      : APG_GRID_REFERENCE;
  const patternLabel = probe.pattern === 'tree' ? 'Tree' : probe.pattern === 'treegrid' ? 'Treegrid' : 'Grid';
  return pendingFinding({
    ruleId: probe.pattern === 'tree' ? 'FT-APG-012' : 'FT-APG-013',
    title: `${patternLabel} ${probe.key} navigation did not reach the expected boundary item`,
    detail: `${probe.key} was pressed in ${selectorFor(probe.owner)}, but focus did not reach ${selectorFor(probe.expected)} as expected for the ${probe.pattern} navigation model.`,
    element: probe.owner,
    references: [reference],
  });
}

export function isBoundaryKeyboardFocusProbe(
  probe: { kind: string },
): probe is BoundaryKeyboardFocusProbe {
  return probe.kind === 'boundary-navigation';
}

export function evaluateBoundaryKeyboardFocusProbe(
  probe: BoundaryKeyboardFocusProbe,
): PendingRuntimeEvent | undefined {
  return evaluateExpectedFocus(probe);
}
