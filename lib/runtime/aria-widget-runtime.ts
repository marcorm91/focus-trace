import { accessibleName, isProgrammaticallyHidden, semanticRole, selectorFor } from '../audit/dom';
import { accessibilityOwns, ariaOwnedElements } from './aria-ownership';
import {
  captureCompositeWidgetProbes,
  evaluateCompositeWidgetProbe,
  isCompositeWidgetProbe,
  type CompositeWidgetProbe,
} from './composite-widget-runtime';
import { snapshot } from './page-inspection';
import type { RuntimeEvent, StandardReference } from '../../shared/types';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

export type RuntimeWidgetAction =
  | { kind: 'click' }
  | { kind: 'keydown'; key: string };

export type AriaWidgetProbe =
  | { kind: 'expanded-control'; control: Element }
  | { kind: 'tab-activation'; tab: Element }
  | { kind: 'menu-open-focus'; trigger: Element; menu: Element }
  | { kind: 'menu-escape'; menu: Element; trigger?: Element }
  | { kind: 'combobox-popup'; combobox: Element }
  | { kind: 'active-descendant'; owner: Element }
  | { kind: 'active-descendant-transition'; owner: Element; beforeId?: string }
  | { kind: 'combobox-escape'; combobox: Element; popup?: Element }
  | { kind: 'listbox-selection'; listbox: Element }
  | CompositeWidgetProbe;

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

const ARIA_ACTIVEDESCENDANT_REFERENCE: StandardReference = {
  type: 'WAI-ARIA',
  id: 'aria-activedescendant',
  label: 'WAI-ARIA aria-activedescendant',
  url: 'https://www.w3.org/TR/wai-aria-1.2/#aria-activedescendant',
  status: 'normative',
};

const ARIA_COMBOBOX_REFERENCE: StandardReference = {
  type: 'WAI-ARIA',
  id: 'combobox',
  label: 'WAI-ARIA combobox role',
  url: 'https://www.w3.org/TR/wai-aria-1.2/#combobox',
  status: 'normative',
};

const ARIA_HASPOPUP_REFERENCE: StandardReference = {
  type: 'WAI-ARIA',
  id: 'aria-haspopup',
  label: 'WAI-ARIA aria-haspopup',
  url: 'https://www.w3.org/TR/wai-aria-1.2/#aria-haspopup',
  status: 'normative',
};

const APG_TABS_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'tabs',
  label: 'Tabs Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
  status: 'informative',
};

const APG_MENU_BUTTON_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'menu-button',
  label: 'Menu Button Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/',
  status: 'informative',
};

const APG_DIALOG_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'dialog-modal',
  label: 'Dialog (Modal) Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
  status: 'informative',
};

const APG_COMBOBOX_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'combobox',
  label: 'Combobox Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
  status: 'informative',
};

const APG_LISTBOX_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'listbox',
  label: 'Listbox Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
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

const COMBOBOX_POPUP_ROLES = new Set(['listbox', 'tree', 'grid', 'dialog']);
const ACTIVE_DESCENDANT_POPUP_ROLES = new Set(['listbox', 'tree', 'grid']);
const ACTIVE_DESCENDANT_COMPOSITE_ROLES = new Set(['tree', 'grid', 'treegrid']);

function ids(value: string | null): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}

function controlledElements(control: Element): Element[] {
  return ids(control.getAttribute('aria-controls'))
    .map((id) => document.getElementById(id))
    .filter((element): element is HTMLElement => element != null);
}

function isAvailable(element: Element): boolean {
  return element.isConnected && !isProgrammaticallyHidden(element);
}

function activationAction(action: RuntimeWidgetAction): boolean {
  if (action.kind === 'click') return true;
  return action.key === 'Enter' || action.key === ' ';
}

function menuActivationAction(action: RuntimeWidgetAction): boolean {
  if (activationAction(action)) return true;
  return action.kind === 'keydown' && (action.key === 'ArrowDown' || action.key === 'ArrowUp');
}

function widgetNavigationAction(action: RuntimeWidgetAction): boolean {
  if (action.kind === 'click') return true;
  return ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape'].includes(action.key);
}

function activeDescendantAction(action: RuntimeWidgetAction): boolean {
  return widgetNavigationAction(action) && !(action.kind === 'keydown' && action.key === 'Escape');
}

function controlledMenu(trigger: Element): Element | undefined {
  return controlledElements(trigger).find((element) => semanticRole(element) === 'menu');
}

function menuTrigger(menu: Element): Element | undefined {
  if (!menu.id) return undefined;
  return [...document.querySelectorAll('[aria-controls]')].find((candidate) => {
    if (!ids(candidate.getAttribute('aria-controls')).includes(menu.id)) return false;
    const hasPopup = candidate.getAttribute('aria-haspopup')?.trim().toLowerCase();
    return hasPopup === 'menu' || hasPopup === 'true' || controlledMenu(candidate) === menu;
  });
}

function tabPanel(tab: Element): Element | undefined {
  return controlledElements(tab).find((element) => semanticRole(element) === 'tabpanel');
}

function controlledComboboxPopup(combobox: Element): Element | undefined {
  return controlledElements(combobox).find((element) => COMBOBOX_POPUP_ROLES.has(semanticRole(element) ?? ''));
}

function listboxForElement(element: Element): Element | undefined {
  const ancestor = element.closest('[role="listbox"]');
  if (ancestor) return ancestor;
  return [...document.querySelectorAll('[role="listbox"][aria-owns]')]
    .find((candidate) => accessibilityOwns(candidate, element));
}

function expectedComboboxPopupRole(combobox: Element): string {
  const hasPopup = combobox.getAttribute('aria-haspopup')?.trim().toLowerCase();
  if (!hasPopup) return 'listbox';
  if (hasPopup === 'true') return 'menu';
  return hasPopup;
}

function activeDescendantTarget(owner: Element): Element | undefined {
  const id = owner.getAttribute('aria-activedescendant')?.trim();
  if (!id) return undefined;
  return document.getElementById(id) ?? undefined;
}

function validActiveDescendantRelationship(owner: Element, active: Element): boolean {
  if (accessibilityOwns(owner, active)) return true;
  if (!['combobox', 'textbox', 'searchbox'].includes(semanticRole(owner) ?? '')) return false;
  return controlledElements(owner).some((controlled) => {
    const role = semanticRole(controlled);
    return ACTIVE_DESCENDANT_POPUP_ROLES.has(role ?? '') && accessibilityOwns(controlled, active);
  });
}

function activeDescendantPatternReferences(owner: Element): StandardReference[] {
  const role = semanticRole(owner);
  if (role === 'tree') return [ARIA_ACTIVEDESCENDANT_REFERENCE, APG_TREE_REFERENCE];
  if (role === 'grid') return [ARIA_ACTIVEDESCENDANT_REFERENCE, APG_GRID_REFERENCE];
  if (role === 'treegrid') return [ARIA_ACTIVEDESCENDANT_REFERENCE, APG_TREEGRID_REFERENCE];
  if (role === 'listbox') return [ARIA_ACTIVEDESCENDANT_REFERENCE, APG_LISTBOX_REFERENCE];
  return [ARIA_ACTIVEDESCENDANT_REFERENCE, APG_COMBOBOX_REFERENCE, APG_LISTBOX_REFERENCE];
}

function listboxOptions(listbox: Element): Element[] {
  const direct = [...listbox.querySelectorAll('[role="option"]')];
  const owned = ariaOwnedElements(listbox).flatMap((root) => {
    const nested = [...root.querySelectorAll('[role="option"]')];
    return semanticRole(root) === 'option' ? [root, ...nested] : nested;
  });
  return [...new Set([...direct, ...owned])];
}

function listboxSelectedOptions(listbox: Element): Element[] {
  return listboxOptions(listbox).filter((option) =>
    option.getAttribute('aria-selected')?.trim().toLowerCase() === 'true'
      || option.getAttribute('aria-checked')?.trim().toLowerCase() === 'true');
}

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

function pushActiveDescendantProbes(
  probes: AriaWidgetProbe[],
  owner: Element,
  action: RuntimeWidgetAction,
): void {
  if (!owner.hasAttribute('aria-activedescendant') || !activeDescendantAction(action)) return;
  const beforeId = owner.getAttribute('aria-activedescendant')?.trim() || undefined;
  probes.push({ kind: 'active-descendant', owner });
  probes.push({ kind: 'active-descendant-transition', owner, ...(beforeId ? { beforeId } : {}) });
}

export function captureAriaWidgetProbes(
  target: Element,
  action: RuntimeWidgetAction,
): AriaWidgetProbe[] {
  const probes: AriaWidgetProbe[] = [];
  const role = semanticRole(target);
  const comboboxInteraction = role === 'combobox' && widgetNavigationAction(action);

  if (
    (activationAction(action) || comboboxInteraction)
    && target.hasAttribute('aria-expanded')
    && controlledElements(target).length
  ) {
    probes.push({ kind: 'expanded-control', control: target });
  }

  if (role === 'tab' && activationAction(action)) {
    probes.push({ kind: 'tab-activation', tab: target });
  }

  const menu = controlledMenu(target);
  if (menu && menuActivationAction(action) && action.kind === 'keydown') {
    probes.push({ kind: 'menu-open-focus', trigger: target, menu });
  }

  if (comboboxInteraction) {
    probes.push({ kind: 'combobox-popup', combobox: target });
    pushActiveDescendantProbes(probes, target, action);
    if (action.kind === 'keydown' && action.key === 'Escape') {
      const popup = controlledComboboxPopup(target);
      probes.push({ kind: 'combobox-escape', combobox: target, ...(popup ? { popup } : {}) });
    }
  }

  const listbox = role === 'listbox' ? target : listboxForElement(target);
  if (listbox && activeDescendantAction(action)) {
    probes.push({ kind: 'listbox-selection', listbox });
    pushActiveDescendantProbes(probes, listbox, action);
  }

  if (ACTIVE_DESCENDANT_COMPOSITE_ROLES.has(role ?? '')) {
    pushActiveDescendantProbes(probes, target, action);
  }

  if (action.kind === 'keydown' && action.key === 'Escape') {
    const owner = target.closest('[role="menu"]');
    if (owner && isAvailable(owner)) {
      const trigger = menuTrigger(owner);
      probes.push({
        kind: 'menu-escape',
        menu: owner,
        ...(trigger ? { trigger } : {}),
      });
    }
  }

  probes.push(...captureCompositeWidgetProbes(target, action));
  return probes;
}

function evaluateExpandedControl(control: Element): PendingRuntimeEvent | undefined {
  if (!control.isConnected) return undefined;
  const expanded = control.getAttribute('aria-expanded')?.trim().toLowerCase();
  if (expanded !== 'true' && expanded !== 'false') return undefined;

  const controlled = controlledElements(control);
  if (!controlled.length) return undefined;
  const available = controlled.map(isAvailable);
  const mismatch = expanded === 'true'
    ? available.every((value) => !value)
    : available.some(Boolean);
  if (!mismatch) return undefined;

  const targets = controlled.map(selectorFor).join(', ');
  return pendingFinding({
    ruleId: 'FT-RUNTIME-ARIA-001',
    title: 'Expanded state does not match controlled content',
    detail: `The control reports aria-expanded="${expanded}" while its controlled content (${targets}) is ${expanded === 'true' ? 'programmatically hidden' : 'still available'}.`,
    severity: 'serious',
    outcome: 'warning',
    element: control,
    references: [ARIA_EXPANDED_REFERENCE],
  });
}

function evaluateTabActivation(tab: Element): PendingRuntimeEvent | undefined {
  if (!tab.isConnected || semanticRole(tab) !== 'tab') return undefined;
  const panel = tabPanel(tab);
  const selected = tab.getAttribute('aria-selected')?.trim().toLowerCase() === 'true';

  if (!selected) {
    return pendingFinding({
      ruleId: 'FT-APG-004',
      title: 'Activated tab did not become selected',
      detail: `The activated tab ${selectorFor(tab)} still reports aria-selected other than true after activation. Review whether the tab pattern is using manual activation intentionally and whether Enter/Space/click selects the tab.`,
      severity: 'moderate',
      outcome: 'review',
      element: tab,
      references: [APG_TABS_REFERENCE],
    });
  }

  if (panel && !isAvailable(panel)) {
    return pendingFinding({
      ruleId: 'FT-RUNTIME-ARIA-002',
      title: 'Selected tab controls a hidden tab panel',
      detail: `The selected tab ${selectorFor(tab)} controls ${selectorFor(panel)}, but that tab panel remains programmatically hidden.`,
      severity: 'serious',
      outcome: 'warning',
      element: tab,
      references: [ARIA_SELECTED_REFERENCE, APG_TABS_REFERENCE],
    });
  }

  return undefined;
}

function evaluateMenuOpenFocus(trigger: Element, menu: Element): PendingRuntimeEvent | undefined {
  if (!trigger.isConnected || !menu.isConnected || !isAvailable(menu)) return undefined;
  const expanded = trigger.getAttribute('aria-expanded')?.trim().toLowerCase();
  if (expanded === 'false') return undefined;

  const active = document.activeElement;
  if (active instanceof Element && (active === menu || menu.contains(active))) return undefined;

  return pendingFinding({
    ruleId: 'FT-APG-005',
    title: 'Menu opened from the keyboard without moving focus inside',
    detail: `The menu ${selectorFor(menu)} is open after keyboard activation of ${selectorFor(trigger)}, but keyboard focus was not observed inside the menu.`,
    severity: 'moderate',
    outcome: 'review',
    element: trigger,
    references: [APG_MENU_BUTTON_REFERENCE],
  });
}

function evaluateMenuEscape(menu: Element, trigger?: Element): PendingRuntimeEvent | undefined {
  if (menu.isConnected && isAvailable(menu)) {
    return pendingFinding({
      ruleId: 'FT-APG-006',
      title: 'Escape did not close the open menu',
      detail: `Escape was pressed inside ${selectorFor(menu)}, but the menu remained available after the interaction.`,
      severity: 'moderate',
      outcome: 'review',
      element: menu,
      references: [APG_MENU_BUTTON_REFERENCE],
    });
  }

  if (!trigger?.isConnected) return undefined;
  if (document.activeElement === trigger) return undefined;

  return pendingFinding({
    ruleId: 'FT-APG-006',
    title: 'Menu closed without returning focus to its trigger',
    detail: `Escape closed the menu, but focus did not return to ${selectorFor(trigger)}.`,
    severity: 'moderate',
    outcome: 'review',
    element: trigger,
    references: [APG_MENU_BUTTON_REFERENCE],
  });
}

function evaluateComboboxPopup(combobox: Element): PendingRuntimeEvent | undefined {
  if (!combobox.isConnected || semanticRole(combobox) !== 'combobox') return undefined;
  if (combobox.getAttribute('aria-expanded')?.trim().toLowerCase() !== 'true') return undefined;

  const controlled = controlledElements(combobox);
  if (!controlled.length) {
    return pendingFinding({
      ruleId: 'FT-RUNTIME-ARIA-003',
      title: 'Expanded combobox has no controlled popup',
      detail: `The expanded combobox ${selectorFor(combobox)} does not resolve aria-controls to a popup element.`,
      severity: 'serious',
      outcome: 'warning',
      element: combobox,
      references: [ARIA_COMBOBOX_REFERENCE],
    });
  }

  const popup = controlledComboboxPopup(combobox);
  if (!popup) {
    const roles = controlled.map((element) => semanticRole(element) ?? 'not exposed').join(', ');
    return pendingFinding({
      ruleId: 'FT-RUNTIME-ARIA-003',
      title: 'Combobox controls an invalid popup role',
      detail: `The expanded combobox ${selectorFor(combobox)} controls content with role ${roles}. WAI-ARIA requires a listbox, tree, grid, or dialog popup.`,
      severity: 'serious',
      outcome: 'warning',
      element: combobox,
      references: [ARIA_COMBOBOX_REFERENCE],
    });
  }

  const popupRole = semanticRole(popup)!;
  const expectedRole = expectedComboboxPopupRole(combobox);
  if (expectedRole !== popupRole) {
    return pendingFinding({
      ruleId: 'FT-RUNTIME-ARIA-004',
      title: 'Combobox popup role does not match aria-haspopup',
      detail: `The combobox ${selectorFor(combobox)} exposes aria-haspopup as ${expectedRole}, but its controlled popup ${selectorFor(popup)} has role ${popupRole}.`,
      severity: 'serious',
      outcome: 'warning',
      element: combobox,
      references: [ARIA_COMBOBOX_REFERENCE, ARIA_HASPOPUP_REFERENCE],
    });
  }

  return undefined;
}

function evaluateActiveDescendant(owner: Element): PendingRuntimeEvent | undefined {
  if (!owner.isConnected || document.activeElement !== owner) return undefined;
  const activeId = owner.getAttribute('aria-activedescendant')?.trim();
  if (!activeId) return undefined;
  const active = activeDescendantTarget(owner);

  if (!active) {
    return pendingFinding({
      ruleId: 'FT-RUNTIME-ARIA-005',
      title: 'aria-activedescendant points to a missing element',
      detail: `${selectorFor(owner)} reports aria-activedescendant="${activeId}", but no element with that ID exists after the interaction.`,
      severity: 'serious',
      outcome: 'warning',
      element: owner,
      references: [ARIA_ACTIVEDESCENDANT_REFERENCE],
    });
  }

  if (!validActiveDescendantRelationship(owner, active)) {
    return pendingFinding({
      ruleId: 'FT-RUNTIME-ARIA-005',
      title: 'aria-activedescendant points outside the owned widget',
      detail: `${selectorFor(owner)} points aria-activedescendant to ${selectorFor(active)}, but that element is neither owned by the focused widget nor by an eligible controlled popup.`,
      severity: 'serious',
      outcome: 'warning',
      element: owner,
      references: [ARIA_ACTIVEDESCENDANT_REFERENCE],
    });
  }

  if (!isAvailable(active)) {
    return pendingFinding({
      ruleId: 'FT-APG-008',
      title: 'Active descendant is programmatically hidden',
      detail: `${selectorFor(owner)} points to ${selectorFor(active)} as the active descendant, but that element is programmatically hidden after the interaction.`,
      severity: 'moderate',
      outcome: 'review',
      element: owner,
      references: activeDescendantPatternReferences(owner),
    });
  }

  return undefined;
}

function evaluateActiveDescendantTransition(
  owner: Element,
  beforeId?: string,
): PendingRuntimeEvent | undefined {
  if (!owner.isConnected || document.activeElement !== owner) return undefined;
  const afterId = owner.getAttribute('aria-activedescendant')?.trim();
  if (!afterId || afterId === beforeId) return undefined;
  const active = document.getElementById(afterId);
  if (!active || !validActiveDescendantRelationship(owner, active) || !isAvailable(active)) return undefined;

  return {
    kind: 'virtual-focus',
    severity: 'info',
    title: 'Virtual focus moved',
    detail: `aria-activedescendant changed${beforeId ? ` from ${beforeId}` : ''} to ${afterId} while DOM focus remained on ${selectorFor(owner)}.`,
    element: snapshot(active),
    references: [ARIA_ACTIVEDESCENDANT_REFERENCE],
  };
}

function evaluateComboboxEscape(combobox: Element, popup?: Element): PendingRuntimeEvent | undefined {
  if (!combobox.isConnected || semanticRole(combobox) !== 'combobox') return undefined;
  const expanded = combobox.getAttribute('aria-expanded')?.trim().toLowerCase() === 'true';
  const popupAvailable = popup?.isConnected === true && isAvailable(popup);
  if (!expanded && !popupAvailable) return undefined;

  return pendingFinding({
    ruleId: 'FT-APG-009',
    title: 'Escape did not dismiss the combobox popup',
    detail: `Escape was pressed on ${selectorFor(combobox)}, but the combobox still reports an open popup after the interaction.`,
    severity: 'moderate',
    outcome: 'review',
    element: combobox,
    references: [APG_COMBOBOX_REFERENCE],
  });
}

function evaluateListboxSelection(listbox: Element): PendingRuntimeEvent | undefined {
  if (!listbox.isConnected || semanticRole(listbox) !== 'listbox') return undefined;
  if (listbox.getAttribute('aria-multiselectable')?.trim().toLowerCase() === 'true') return undefined;
  const selected = listboxSelectedOptions(listbox);
  if (selected.length <= 1) return undefined;

  return pendingFinding({
    ruleId: 'FT-APG-010',
    title: 'Single-select listbox exposes multiple selected options',
    detail: `${selectorFor(listbox)} is not marked aria-multiselectable="true", but ${selected.length} options expose a selected or checked state after the interaction.`,
    severity: 'moderate',
    outcome: 'review',
    element: listbox,
    references: [ARIA_SELECTED_REFERENCE, APG_LISTBOX_REFERENCE],
  });
}

export function evaluateAriaWidgetProbe(probe: AriaWidgetProbe): PendingRuntimeEvent | undefined {
  if (isCompositeWidgetProbe(probe)) return evaluateCompositeWidgetProbe(probe);

  switch (probe.kind) {
    case 'expanded-control':
      return evaluateExpandedControl(probe.control);
    case 'tab-activation':
      return evaluateTabActivation(probe.tab);
    case 'menu-open-focus':
      return evaluateMenuOpenFocus(probe.trigger, probe.menu);
    case 'menu-escape':
      return evaluateMenuEscape(probe.menu, probe.trigger);
    case 'combobox-popup':
      return evaluateComboboxPopup(probe.combobox);
    case 'active-descendant':
      return evaluateActiveDescendant(probe.owner);
    case 'active-descendant-transition':
      return evaluateActiveDescendantTransition(probe.owner, probe.beforeId);
    case 'combobox-escape':
      return evaluateComboboxEscape(probe.combobox, probe.popup);
    case 'listbox-selection':
      return evaluateListboxSelection(probe.listbox);
  }
}

export function createDynamicDialogNameReview(dialog: Element): PendingRuntimeEvent | undefined {
  if (!dialog.isConnected || !['dialog', 'alertdialog'].includes(semanticRole(dialog) ?? '')) return undefined;
  if (accessibleName(dialog).trim()) return undefined;

  return pendingFinding({
    ruleId: 'FT-APG-007',
    title: 'Opened dialog has no accessible name',
    detail: `The dynamically observed dialog ${selectorFor(dialog)} opened without an accessible name. Review aria-labelledby or aria-label for the dialog container.`,
    severity: 'serious',
    outcome: 'review',
    element: dialog,
    references: [APG_DIALOG_REFERENCE],
  });
}
