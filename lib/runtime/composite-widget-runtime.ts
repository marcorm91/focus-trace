import { isProgrammaticallyHidden, semanticRole, selectorFor } from '../audit/dom';
import { accessibilityOwns, ariaOwnedElements, ownedRoleElements } from './aria-ownership';
import { snapshot } from './page-inspection';
import type { RuntimeEvent, StandardReference } from '../../shared/types';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

type CompositeRole = 'tree' | 'grid' | 'treegrid';
type CompositeAction = { kind: 'click' } | { kind: 'keydown'; key: string };
type TreeNavigationExpectation =
  | { type: 'focus'; expected: Element }
  | { type: 'expand'; item: Element }
  | { type: 'collapse'; item: Element };
type GridNavigationExpectation =
  | { type: 'focus'; expected: Element }
  | { type: 'expand'; row: Element }
  | { type: 'collapse'; row: Element };

export type CompositeWidgetProbe =
  | { kind: 'composite-roving-tabindex'; composite: Element }
  | { kind: 'tree-expanded-state'; treeitem: Element; group: Element }
  | { kind: 'tree-arrow-navigation'; tree: Element; key: string; expectation: TreeNavigationExpectation }
  | { kind: 'tree-selection'; tree: Element }
  | { kind: 'grid-arrow-navigation'; grid: Element; key: string; expectation: GridNavigationExpectation };

const COMPOSITE_SELECTOR = '[role="tree"], [role="grid"], [role="treegrid"]';
const TREE_ITEM_SELECTOR = '[role="treeitem"]';
const GRID_CELL_SELECTOR = '[role="gridcell"], [role="rowheader"], [role="columnheader"]';
const GRID_MANAGED_ROLES = ['row', 'gridcell', 'rowheader', 'columnheader'];
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const ARROW_CONSUMING_ROLES = new Set([
  'combobox',
  'textbox',
  'searchbox',
  'spinbutton',
  'slider',
  'listbox',
  'menu',
  'menubar',
  'tab',
]);
const ARROW_CONSUMING_ANCESTOR_SELECTOR = [
  '[role="radiogroup"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="listbox"]',
  '[role="toolbar"]',
].join(', ');

const ARIA_EXPANDED_REFERENCE: StandardReference = {
  type: 'WAI-ARIA',
  id: 'aria-expanded',
  label: 'WAI-ARIA aria-expanded',
  url: 'https://www.w3.org/TR/wai-aria-1.2/#aria-expanded',
  status: 'normative',
};

const ARIA_SELECTED_REFERENCE: StandardReference = {
  type: 'WAI-ARIA',
  id: 'aria-selected',
  label: 'WAI-ARIA aria-selected',
  url: 'https://www.w3.org/TR/wai-aria-1.2/#aria-selected',
  status: 'normative',
};

const APG_KEYBOARD_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'keyboard-interface',
  label: 'Developing a Keyboard Interface',
  url: 'https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/',
  status: 'informative',
};

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
  severity: 'serious' | 'moderate';
  outcome: 'warning' | 'review';
  element: Element;
  references: StandardReference[];
}): PendingRuntimeEvent {
  return {
    kind: 'aria-widget',
    severity: input.severity,
    outcome: input.outcome,
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

function compositeRole(element: Element): CompositeRole | undefined {
  const role = semanticRole(element);
  return role === 'tree' || role === 'grid' || role === 'treegrid' ? role : undefined;
}

function belongsToComposite(composite: Element, candidate: Element): boolean {
  const nearest = candidate.closest(COMPOSITE_SELECTOR);
  if (nearest && nearest !== composite) return false;
  return accessibilityOwns(composite, candidate);
}

function compositeForTarget(target: Element): Element | undefined {
  if (compositeRole(target)) return target;
  const ancestor = target.closest(COMPOSITE_SELECTOR);
  if (ancestor) return ancestor;

  return [...document.querySelectorAll(COMPOSITE_SELECTOR)]
    .find((candidate) => accessibilityOwns(candidate, target));
}

function nativeRadioGroupUsesArrows(target: Element): boolean {
  if (!(target instanceof HTMLInputElement) || target.type.toLowerCase() !== 'radio' || !target.name) return false;
  return [...document.querySelectorAll('input[type="radio"]')].some((candidate) =>
    candidate instanceof HTMLInputElement
    && candidate !== target
    && candidate.name === target.name
    && candidate.form === target.form);
}

function targetConsumesArrowKeys(target: Element, composite: Element): boolean {
  if (target === composite) return false;
  const role = semanticRole(target);
  if (role && ARROW_CONSUMING_ROLES.has(role)) return true;
  if (nativeRadioGroupUsesArrows(target)) return true;

  const arrowWidget = target.closest(ARROW_CONSUMING_ANCESTOR_SELECTOR);
  if (arrowWidget && arrowWidget !== composite && accessibilityOwns(composite, arrowWidget)) return true;

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    const type = target.type.toLowerCase();
    if (['button', 'submit', 'reset', 'checkbox', 'image'].includes(type)) return false;
    return true;
  }
  return target.getAttribute('contenteditable')?.trim().toLowerCase() === 'true';
}

function managedRoles(composite: Element): string[] {
  return compositeRole(composite) === 'tree' ? ['treeitem'] : GRID_MANAGED_ROLES;
}

function managedItems(composite: Element): Element[] {
  return ownedRoleElements(composite, managedRoles(composite))
    .filter((candidate) => candidate !== composite && belongsToComposite(composite, candidate));
}

function managedItemFromElement(composite: Element, element: Element | null): Element | undefined {
  if (!element) return undefined;
  const roles = managedRoles(composite);
  const ownRole = semanticRole(element);
  if (ownRole && roles.includes(ownRole) && belongsToComposite(composite, element)) return element;

  const selector = compositeRole(composite) === 'tree'
    ? TREE_ITEM_SELECTOR
    : `${GRID_CELL_SELECTOR}, [role="row"]`;
  const ancestor = element.closest(selector);
  return ancestor && belongsToComposite(composite, ancestor) ? ancestor : undefined;
}

function activeCompositeItem(composite: Element): Element | undefined {
  const activeId = composite.getAttribute('aria-activedescendant')?.trim();
  if (activeId) {
    const active = document.getElementById(activeId);
    const managed = active ? managedItemFromElement(composite, active) : undefined;
    if (managed) return managed;
  }

  const active = document.activeElement instanceof Element ? document.activeElement : null;
  return managedItemFromElement(composite, active);
}

function treeChildGroup(treeitem: Element): Element | undefined {
  const domGroup = [...treeitem.querySelectorAll('[role="group"]')]
    .find((group) => group.closest('[role="treeitem"]') === treeitem);
  if (domGroup) return domGroup;

  return ariaOwnedElements(treeitem)
    .find((owned) => semanticRole(owned) === 'group');
}

function directTreeItemsInGroup(group: Element): Element[] {
  const candidates = ownedRoleElements(group, ['treeitem']);
  return candidates.filter((item) => {
    const domGroup = item.closest('[role="group"]');
    if (domGroup) return domGroup === group;
    return ariaOwnedElements(group).some((owned) => owned === item || owned.contains(item));
  });
}

function parentTreeItem(tree: Element, item: Element): Element | undefined {
  const domGroup = item.closest('[role="group"]');
  const domParent = domGroup?.closest('[role="treeitem"]');
  if (domParent && belongsToComposite(tree, domParent)) return domParent;

  return managedItems(tree)
    .filter((candidate) => semanticRole(candidate) === 'treeitem')
    .find((candidate) => {
      const group = treeChildGroup(candidate);
      return group ? accessibilityOwns(group, item) : false;
    });
}

function visibleTreeItems(tree: Element): Element[] {
  return managedItems(tree)
    .filter((item) => semanticRole(item) === 'treeitem' && isAvailable(item));
}

function treeIntent(tree: Element, key: string): 'next' | 'previous' | 'expand-child' | 'collapse-parent' | undefined {
  const horizontal = tree.getAttribute('aria-orientation')?.trim().toLowerCase() === 'horizontal';
  if (horizontal) {
    if (key === 'ArrowRight') return 'next';
    if (key === 'ArrowLeft') return 'previous';
    if (key === 'ArrowDown') return 'expand-child';
    if (key === 'ArrowUp') return 'collapse-parent';
    return undefined;
  }

  if (key === 'ArrowDown') return 'next';
  if (key === 'ArrowUp') return 'previous';
  if (key === 'ArrowRight') return 'expand-child';
  if (key === 'ArrowLeft') return 'collapse-parent';
  return undefined;
}

function treeNavigationExpectation(tree: Element, key: string): TreeNavigationExpectation | undefined {
  const active = activeCompositeItem(tree);
  if (!active || semanticRole(active) !== 'treeitem') return undefined;
  const intent = treeIntent(tree, key);
  if (!intent) return undefined;

  if (intent === 'next' || intent === 'previous') {
    const visible = visibleTreeItems(tree);
    const index = visible.indexOf(active);
    if (index < 0) return undefined;
    const expected = visible[index + (intent === 'next' ? 1 : -1)];
    return expected ? { type: 'focus', expected } : undefined;
  }

  const group = treeChildGroup(active);
  const expanded = active.getAttribute('aria-expanded')?.trim().toLowerCase();

  if (intent === 'expand-child') {
    if (!group) return undefined;
    if (expanded === 'false') return { type: 'expand', item: active };
    if (expanded === 'true' && isAvailable(group)) {
      const firstChild = directTreeItemsInGroup(group).find(isAvailable);
      return firstChild ? { type: 'focus', expected: firstChild } : undefined;
    }
    return undefined;
  }

  if (group && expanded === 'true') return { type: 'collapse', item: active };
  const parent = parentTreeItem(tree, active);
  return parent ? { type: 'focus', expected: parent } : undefined;
}

function gridRows(grid: Element): Element[] {
  return ownedRoleElements(grid, ['row'])
    .filter((row) => belongsToComposite(grid, row) && isAvailable(row));
}

function rowForItem(grid: Element, item: Element): Element | undefined {
  if (semanticRole(item) === 'row') return item;
  const domRow = item.closest('[role="row"]');
  if (domRow && belongsToComposite(grid, domRow)) return domRow;
  return gridRows(grid).find((row) => accessibilityOwns(row, item));
}

function rowCells(row: Element): Element[] {
  return ownedRoleElements(row, ['gridcell', 'rowheader', 'columnheader'])
    .filter((cell) => {
      const domRow = cell.closest('[role="row"]');
      return domRow ? domRow === row : accessibilityOwns(row, cell);
    })
    .filter(isAvailable);
}

function gridNavigationExpectation(grid: Element, key: string): GridNavigationExpectation | undefined {
  const active = activeCompositeItem(grid);
  if (!active) return undefined;
  const role = compositeRole(grid);
  const activeRole = semanticRole(active);
  const rows = gridRows(grid);

  if (role === 'treegrid' && activeRole === 'row') {
    const rowIndex = rows.indexOf(active);
    if (key === 'ArrowDown') {
      const expected = rows[rowIndex + 1];
      return expected ? { type: 'focus', expected } : undefined;
    }
    if (key === 'ArrowUp') {
      const expected = rows[rowIndex - 1];
      return expected ? { type: 'focus', expected } : undefined;
    }
    if (key === 'ArrowRight') {
      const expanded = active.getAttribute('aria-expanded')?.trim().toLowerCase();
      if (expanded === 'false') return { type: 'expand', row: active };
      const firstCell = rowCells(active)[0];
      return firstCell ? { type: 'focus', expected: firstCell } : undefined;
    }
    if (key === 'ArrowLeft' && active.getAttribute('aria-expanded')?.trim().toLowerCase() === 'true') {
      return { type: 'collapse', row: active };
    }
    return undefined;
  }

  if (!['gridcell', 'rowheader', 'columnheader'].includes(activeRole ?? '')) return undefined;
  const row = rowForItem(grid, active);
  if (!row) return undefined;
  const cells = rowCells(row);
  const columnIndex = cells.indexOf(active);
  if (columnIndex < 0) return undefined;

  if (key === 'ArrowRight') {
    const expected = cells[columnIndex + 1];
    return expected ? { type: 'focus', expected } : undefined;
  }
  if (key === 'ArrowLeft') {
    if (role === 'treegrid' && columnIndex === 0) return undefined;
    const expected = cells[columnIndex - 1];
    return expected ? { type: 'focus', expected } : undefined;
  }

  const rowIndex = rows.indexOf(row);
  if (rowIndex < 0) return undefined;
  const targetRow = key === 'ArrowDown' ? rows[rowIndex + 1] : key === 'ArrowUp' ? rows[rowIndex - 1] : undefined;
  if (!targetRow) return undefined;
  const expected = rowCells(targetRow)[columnIndex];
  return expected ? { type: 'focus', expected } : undefined;
}

function compositeUsesActiveDescendant(composite: Element): boolean {
  return Boolean(composite.getAttribute('aria-activedescendant')?.trim());
}

function selectedTreeItems(tree: Element): Element[] {
  return managedItems(tree).filter((item) => {
    if (semanticRole(item) !== 'treeitem') return false;
    return item.getAttribute('aria-selected')?.trim().toLowerCase() === 'true'
      || item.getAttribute('aria-checked')?.trim().toLowerCase() === 'true';
  });
}

function compositeInteraction(action: CompositeAction): boolean {
  if (action.kind === 'click') return true;
  return ARROW_KEYS.has(action.key) || action.key === 'Enter' || action.key === ' ';
}

export function captureCompositeWidgetProbes(
  target: Element,
  action: CompositeAction,
): CompositeWidgetProbe[] {
  if (!compositeInteraction(action)) return [];
  const composite = compositeForTarget(target);
  if (!composite) return [];
  const role = compositeRole(composite);
  if (!role) return [];

  if (action.kind === 'keydown' && ARROW_KEYS.has(action.key) && targetConsumesArrowKeys(target, composite)) {
    return [];
  }

  const probes: CompositeWidgetProbe[] = [
    { kind: 'composite-roving-tabindex', composite },
  ];

  if (role === 'tree') {
    probes.push({ kind: 'tree-selection', tree: composite });
    const active = activeCompositeItem(composite);
    if (active && semanticRole(active) === 'treeitem') {
      const group = treeChildGroup(active);
      if (group) probes.push({ kind: 'tree-expanded-state', treeitem: active, group });
    }
    if (action.kind === 'keydown' && ARROW_KEYS.has(action.key)) {
      const expectation = treeNavigationExpectation(composite, action.key);
      if (expectation) probes.push({ kind: 'tree-arrow-navigation', tree: composite, key: action.key, expectation });
    }
  }

  if ((role === 'grid' || role === 'treegrid') && action.kind === 'keydown' && ARROW_KEYS.has(action.key)) {
    const expectation = gridNavigationExpectation(composite, action.key);
    if (expectation) probes.push({ kind: 'grid-arrow-navigation', grid: composite, key: action.key, expectation });
  }

  return probes;
}

function evaluateRovingTabindex(composite: Element): PendingRuntimeEvent | undefined {
  if (!composite.isConnected || compositeUsesActiveDescendant(composite)) return undefined;
  const zeroTabStops = managedItems(composite).filter((item) => item.getAttribute('tabindex')?.trim() === '0');
  if (zeroTabStops.length <= 1) return undefined;

  return pendingFinding({
    ruleId: 'FT-APG-011',
    title: 'Composite widget exposes multiple roving tab stops',
    detail: `${selectorFor(composite)} exposes ${zeroTabStops.length} managed items with tabindex="0" after the interaction. Review whether the composite is maintaining one page-tab-sequence entry while arrow keys manage movement inside it.`,
    severity: 'moderate',
    outcome: 'review',
    element: composite,
    references: [APG_KEYBOARD_REFERENCE],
  });
}

function evaluateTreeExpandedState(treeitem: Element, group: Element): PendingRuntimeEvent | undefined {
  if (!treeitem.isConnected || !group.isConnected) return undefined;
  const expanded = treeitem.getAttribute('aria-expanded')?.trim().toLowerCase();
  if (expanded !== 'true' && expanded !== 'false') return undefined;
  const groupAvailable = isAvailable(group);
  const mismatch = expanded === 'true' ? !groupAvailable : groupAvailable;
  if (!mismatch) return undefined;

  return pendingFinding({
    ruleId: 'FT-RUNTIME-ARIA-006',
    title: 'Tree item expanded state does not match its child group',
    detail: `${selectorFor(treeitem)} reports aria-expanded="${expanded}" while its child group ${selectorFor(group)} is ${groupAvailable ? 'programmatically available' : 'programmatically hidden'}.`,
    severity: 'serious',
    outcome: 'warning',
    element: treeitem,
    references: [ARIA_EXPANDED_REFERENCE, APG_TREE_REFERENCE],
  });
}

function evaluateTreeNavigation(
  tree: Element,
  key: string,
  expectation: TreeNavigationExpectation,
): PendingRuntimeEvent | undefined {
  if (!tree.isConnected) return undefined;

  if (expectation.type === 'focus') {
    if (!expectation.expected.isConnected || !isAvailable(expectation.expected)) return undefined;
    if (activeCompositeItem(tree) === expectation.expected) return undefined;
    return pendingFinding({
      ruleId: 'FT-APG-012',
      title: 'Tree arrow navigation did not reach the expected item',
      detail: `${key} was pressed in ${selectorFor(tree)}, but the active tree item did not move to ${selectorFor(expectation.expected)} even though that destination remained available.`,
      severity: 'moderate',
      outcome: 'review',
      element: tree,
      references: [APG_TREE_REFERENCE],
    });
  }

  const expectedExpanded = expectation.type === 'expand' ? 'true' : 'false';
  if (!expectation.item.isConnected) return undefined;
  if (expectation.item.getAttribute('aria-expanded')?.trim().toLowerCase() === expectedExpanded) return undefined;

  return pendingFinding({
    ruleId: 'FT-APG-012',
    title: 'Tree arrow navigation did not update the expected state',
    detail: `${key} was pressed on ${selectorFor(expectation.item)}, but aria-expanded did not become ${expectedExpanded} after the interaction.`,
    severity: 'moderate',
    outcome: 'review',
    element: expectation.item,
    references: [APG_TREE_REFERENCE],
  });
}

function evaluateTreeSelection(tree: Element): PendingRuntimeEvent | undefined {
  if (!tree.isConnected || tree.getAttribute('aria-multiselectable')?.trim().toLowerCase() === 'true') return undefined;
  const selected = selectedTreeItems(tree);
  if (selected.length <= 1) return undefined;

  return pendingFinding({
    ruleId: 'FT-APG-014',
    title: 'Single-select tree exposes multiple selected items',
    detail: `${selectorFor(tree)} is not marked aria-multiselectable="true", but ${selected.length} tree items expose a selected or checked state after the interaction.`,
    severity: 'moderate',
    outcome: 'review',
    element: tree,
    references: [ARIA_SELECTED_REFERENCE, APG_TREE_REFERENCE],
  });
}

function evaluateGridNavigation(
  grid: Element,
  key: string,
  expectation: GridNavigationExpectation,
): PendingRuntimeEvent | undefined {
  if (!grid.isConnected) return undefined;
  const reference = compositeRole(grid) === 'treegrid' ? APG_TREEGRID_REFERENCE : APG_GRID_REFERENCE;

  if (expectation.type === 'focus') {
    if (!expectation.expected.isConnected || !isAvailable(expectation.expected)) return undefined;
    if (activeCompositeItem(grid) === expectation.expected) return undefined;
    return pendingFinding({
      ruleId: 'FT-APG-013',
      title: 'Grid arrow navigation did not reach the expected cell or row',
      detail: `${key} was pressed in ${selectorFor(grid)}, but the active grid item did not move to ${selectorFor(expectation.expected)} even though that destination remained available.`,
      severity: 'moderate',
      outcome: 'review',
      element: grid,
      references: [reference],
    });
  }

  const expectedExpanded = expectation.type === 'expand' ? 'true' : 'false';
  if (!expectation.row.isConnected) return undefined;
  if (expectation.row.getAttribute('aria-expanded')?.trim().toLowerCase() === expectedExpanded) return undefined;

  return pendingFinding({
    ruleId: 'FT-APG-013',
    title: 'Treegrid arrow navigation did not update the expected row state',
    detail: `${key} was pressed on ${selectorFor(expectation.row)}, but aria-expanded did not become ${expectedExpanded} after the interaction.`,
    severity: 'moderate',
    outcome: 'review',
    element: expectation.row,
    references: [APG_TREEGRID_REFERENCE],
  });
}

const COMPOSITE_PROBE_KINDS = new Set<CompositeWidgetProbe['kind']>([
  'composite-roving-tabindex',
  'tree-expanded-state',
  'tree-arrow-navigation',
  'tree-selection',
  'grid-arrow-navigation',
]);

export function isCompositeWidgetProbe(probe: { kind: string }): probe is CompositeWidgetProbe {
  return COMPOSITE_PROBE_KINDS.has(probe.kind as CompositeWidgetProbe['kind']);
}

export function evaluateCompositeWidgetProbe(probe: CompositeWidgetProbe): PendingRuntimeEvent | undefined {
  switch (probe.kind) {
    case 'composite-roving-tabindex':
      return evaluateRovingTabindex(probe.composite);
    case 'tree-expanded-state':
      return evaluateTreeExpandedState(probe.treeitem, probe.group);
    case 'tree-arrow-navigation':
      return evaluateTreeNavigation(probe.tree, probe.key, probe.expectation);
    case 'tree-selection':
      return evaluateTreeSelection(probe.tree);
    case 'grid-arrow-navigation':
      return evaluateGridNavigation(probe.grid, probe.key, probe.expectation);
  }
}
