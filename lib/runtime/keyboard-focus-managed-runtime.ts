import { isProgrammaticallyHidden, semanticRole, selectorFor } from '../audit/dom';
import { accessibilityOwns, ownedRoleElements } from './aria-ownership';
import { isDialogOpen, isModalDialog, snapshot } from './page-inspection';
import type { KeyboardFocusAction } from './keyboard-focus-types';
import type { RuntimeEvent, StandardReference } from '../../shared/types';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;
type ManagedGroupRole = 'tablist' | 'radiogroup' | 'toolbar' | 'menu' | 'menubar' | 'listbox';
type ManagedPattern = 'tabs' | 'radio group' | 'toolbar' | 'menu' | 'listbox';

export type ManagedKeyboardFocusProbe =
  | { kind: 'managed-roving-tabindex'; group: Element; roles: string[]; pattern: ManagedPattern }
  | { kind: 'tab-navigation'; tablist: Element; expected: Element; key: string }
  | { kind: 'radio-navigation'; radiogroup: Element; expected: Element; key: string }
  | { kind: 'toolbar-navigation'; toolbar: Element; expected: Element; key: string }
  | { kind: 'menu-navigation'; menu: Element; expected: Element; key: string }
  | { kind: 'listbox-navigation'; listbox: Element; expected: Element; key: string }
  | {
      kind: 'menu-button-open';
      trigger: Element;
      menu: Element;
      key: string;
      requiredOpen: boolean;
      expectedPosition: 'first' | 'last';
    }
  | { kind: 'disclosure-toggle'; control: Element; beforeExpanded: 'true' | 'false' }
  | { kind: 'dialog-escape'; dialog: Element };

const MANAGED_PROBE_KINDS = new Set<ManagedKeyboardFocusProbe['kind']>([
  'managed-roving-tabindex',
  'tab-navigation',
  'radio-navigation',
  'toolbar-navigation',
  'menu-navigation',
  'listbox-navigation',
  'menu-button-open',
  'disclosure-toggle',
  'dialog-escape',
]);

const MANAGED_GROUP_SELECTOR = [
  '[role="tablist"]',
  '[role="radiogroup"]',
  '[role="toolbar"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="listbox"]',
].join(', ');
const MENU_ITEM_ROLES = ['menuitem', 'menuitemcheckbox', 'menuitemradio'];
const TOOLBAR_CONTROL_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
].join(', ');

const APG_KEYBOARD_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'keyboard-interface',
  label: 'Developing a Keyboard Interface',
  url: 'https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/',
  status: 'informative',
};
const APG_TABS_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'tabs',
  label: 'Tabs Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
  status: 'informative',
};
const APG_RADIO_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'radio',
  label: 'Radio Group Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/radio/',
  status: 'informative',
};
const APG_TOOLBAR_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'toolbar',
  label: 'Toolbar Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/',
  status: 'informative',
};
const APG_MENU_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'menubar',
  label: 'Menu and Menubar Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menubar/',
  status: 'informative',
};
const APG_MENU_BUTTON_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'menu-button',
  label: 'Menu Button Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/',
  status: 'informative',
};
const APG_LISTBOX_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'listbox',
  label: 'Listbox Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
  status: 'informative',
};
const APG_DISCLOSURE_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'disclosure',
  label: 'Disclosure Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
  status: 'informative',
};
const APG_DIALOG_REFERENCE: StandardReference = {
  type: 'WAI-ARIA APG',
  id: 'dialog-modal',
  label: 'Dialog (Modal) Pattern',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
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

function ids(value: string | null): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}

function controlledElements(control: Element): Element[] {
  return ids(control.getAttribute('aria-controls'))
    .map((id) => document.getElementById(id))
    .filter((element): element is HTMLElement => element != null);
}

function groupForTarget(target: Element, role: ManagedGroupRole): Element | undefined {
  const ancestor = target.closest(`[role="${role}"]`);
  if (ancestor) return ancestor;
  return [...document.querySelectorAll(`[role="${role}"]`)]
    .find((candidate) => accessibilityOwns(candidate, target));
}

function belongsToManagedGroup(group: Element, candidate: Element): boolean {
  const nearest = candidate.closest(MANAGED_GROUP_SELECTOR);
  if (nearest && nearest !== group) return false;
  return accessibilityOwns(group, candidate);
}

function managedRoleItems(group: Element, roles: string[], includeHidden = false): Element[] {
  return ownedRoleElements(group, roles)
    .filter((candidate) =>
      candidate !== group
      && belongsToManagedGroup(group, candidate)
      && (includeHidden || isAvailable(candidate)),
    );
}

function activeManagedItem(group: Element, items: Element[]): Element | undefined {
  const activeId = group.getAttribute('aria-activedescendant')?.trim();
  if (activeId) {
    const active = document.getElementById(activeId);
    if (active && items.includes(active)) return active;
  }
  const active = document.activeElement instanceof Element ? document.activeElement : undefined;
  if (!active) return undefined;
  return items.find((item) => item === active || item.contains(active));
}

function adjacentItem(
  items: Element[],
  current: Element,
  direction: 1 | -1,
  wrap: boolean,
): Element | undefined {
  const index = items.indexOf(current);
  if (index < 0 || items.length < 2) return undefined;
  const next = index + direction;
  if (next >= 0 && next < items.length) return items[next];
  if (!wrap) return undefined;
  return direction === 1 ? items[0] : items[items.length - 1];
}

function isNativeDisabled(element: Element): boolean {
  if (element instanceof HTMLButtonElement) return element.disabled;
  if (element instanceof HTMLInputElement) return element.disabled || element.type.toLowerCase() === 'hidden';
  if (element instanceof HTMLSelectElement) return element.disabled;
  if (element instanceof HTMLTextAreaElement) return element.disabled;
  return false;
}

function isSequentialTabStop(element: Element): boolean {
  if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return false;
  if (!isAvailable(element) || isNativeDisabled(element)) return false;
  return element.tabIndex >= 0;
}

function toolbarControls(toolbar: Element): Element[] {
  return [...toolbar.querySelectorAll(TOOLBAR_CONTROL_SELECTOR)]
    .filter((candidate) => {
      if (candidate === toolbar || !isAvailable(candidate) || isNativeDisabled(candidate)) return false;
      const nestedToolbar = candidate.closest('[role="toolbar"]');
      return nestedToolbar === toolbar;
    });
}

function targetConsumesNavigationKey(target: Element, key: string): boolean {
  const role = semanticRole(target);
  if (role === 'slider') return true;
  if (role === 'spinbutton') return ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key);
  if (['combobox', 'textbox', 'searchbox'].includes(role ?? '')) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    const type = target.type.toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'image'].includes(type);
  }
  return target.getAttribute('contenteditable')?.trim().toLowerCase() === 'true';
}

function navigationDirection(key: string, orientation: 'horizontal' | 'vertical'): 1 | -1 | undefined {
  if (orientation === 'horizontal') {
    if (key === 'ArrowRight') return 1;
    if (key === 'ArrowLeft') return -1;
    return undefined;
  }
  if (key === 'ArrowDown') return 1;
  if (key === 'ArrowUp') return -1;
  return undefined;
}

function tabNavigation(target: Element, key: string): ManagedKeyboardFocusProbe | undefined {
  if (semanticRole(target) !== 'tab') return undefined;
  const tablist = groupForTarget(target, 'tablist');
  if (!tablist) return undefined;
  const tabs = managedRoleItems(tablist, ['tab']);
  const orientation = tablist.getAttribute('aria-orientation')?.trim().toLowerCase() === 'vertical'
    ? 'vertical'
    : 'horizontal';
  const direction = navigationDirection(key, orientation);
  if (!direction) return undefined;
  const expected = adjacentItem(tabs, target, direction, true);
  return expected ? { kind: 'tab-navigation', tablist, expected, key } : undefined;
}

function radioNavigation(target: Element, key: string): ManagedKeyboardFocusProbe | undefined {
  if (semanticRole(target) !== 'radio' || target.closest('[role="toolbar"]')) return undefined;
  const radiogroup = groupForTarget(target, 'radiogroup');
  if (!radiogroup) return undefined;
  const radios = managedRoleItems(radiogroup, ['radio']);
  const direction = ['ArrowRight', 'ArrowDown'].includes(key)
    ? 1
    : ['ArrowLeft', 'ArrowUp'].includes(key)
      ? -1
      : undefined;
  if (!direction) return undefined;
  const expected = adjacentItem(radios, target, direction, true);
  return expected ? { kind: 'radio-navigation', radiogroup, expected, key } : undefined;
}

function toolbarNavigation(target: Element, key: string): ManagedKeyboardFocusProbe | undefined {
  const toolbar = groupForTarget(target, 'toolbar');
  if (!toolbar || target === toolbar || targetConsumesNavigationKey(target, key)) return undefined;
  const controls = toolbarControls(toolbar);
  const current = controls.find((control) => control === target || control.contains(target));
  if (!current) return undefined;
  const orientation = toolbar.getAttribute('aria-orientation')?.trim().toLowerCase() === 'vertical'
    ? 'vertical'
    : 'horizontal';
  const direction = navigationDirection(key, orientation);
  if (!direction) return undefined;
  const expected = adjacentItem(controls, current, direction, false);
  return expected ? { kind: 'toolbar-navigation', toolbar, expected, key } : undefined;
}

function menuNavigation(target: Element, key: string): ManagedKeyboardFocusProbe | undefined {
  const menu = groupForTarget(target, 'menu') ?? groupForTarget(target, 'menubar');
  if (!menu) return undefined;
  const items = managedRoleItems(menu, MENU_ITEM_ROLES);
  const current = activeManagedItem(menu, items) ?? items.find((item) => item === target || item.contains(target));
  if (!current) return undefined;
  const role = semanticRole(menu);
  const vertical = role === 'menu'
    ? menu.getAttribute('aria-orientation')?.trim().toLowerCase() !== 'horizontal'
    : menu.getAttribute('aria-orientation')?.trim().toLowerCase() === 'vertical';
  const direction = navigationDirection(key, vertical ? 'vertical' : 'horizontal');
  if (!direction) return undefined;
  const expected = adjacentItem(items, current, direction, false);
  return expected ? { kind: 'menu-navigation', menu, expected, key } : undefined;
}

function listboxNavigation(target: Element, key: string): ManagedKeyboardFocusProbe | undefined {
  const listbox = semanticRole(target) === 'listbox' ? target : groupForTarget(target, 'listbox');
  if (!listbox) return undefined;
  const options = managedRoleItems(listbox, ['option']);
  const current = activeManagedItem(listbox, options) ?? options.find((item) => item === target || item.contains(target));
  if (!current) return undefined;
  const orientation = listbox.getAttribute('aria-orientation')?.trim().toLowerCase() === 'horizontal'
    ? 'horizontal'
    : 'vertical';
  const direction = navigationDirection(key, orientation);
  if (!direction) return undefined;
  const expected = adjacentItem(options, current, direction, false);
  return expected ? { kind: 'listbox-navigation', listbox, expected, key } : undefined;
}

function controlledMenu(trigger: Element): Element | undefined {
  return controlledElements(trigger).find((element) => semanticRole(element) === 'menu');
}

function menuButtonOpen(target: Element, key: string): ManagedKeyboardFocusProbe | undefined {
  if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(key)) return undefined;
  const menu = controlledMenu(target);
  if (!menu) return undefined;
  const hasPopup = target.getAttribute('aria-haspopup')?.trim().toLowerCase();
  if (hasPopup !== 'menu' && hasPopup !== 'true') return undefined;
  const authoredItems = managedRoleItems(menu, MENU_ITEM_ROLES, true);
  if (!authoredItems.length) return undefined;
  return {
    kind: 'menu-button-open',
    trigger: target,
    menu,
    key,
    requiredOpen: key === 'Enter' || key === ' ',
    expectedPosition: key === 'ArrowUp' ? 'last' : 'first',
  };
}

function disclosureToggle(target: Element, key: string): ManagedKeyboardFocusProbe | undefined {
  if (!['Enter', ' '].includes(key) || semanticRole(target) !== 'button') return undefined;
  if (target.hasAttribute('aria-haspopup') || !controlledElements(target).length) return undefined;
  const beforeExpanded = target.getAttribute('aria-expanded')?.trim().toLowerCase();
  if (beforeExpanded !== 'true' && beforeExpanded !== 'false') return undefined;
  return { kind: 'disclosure-toggle', control: target, beforeExpanded };
}

function dialogEscape(target: Element, key: string): ManagedKeyboardFocusProbe | undefined {
  if (key !== 'Escape') return undefined;
  const dialog = target.closest('dialog, [role="dialog"], [role="alertdialog"]');
  if (!dialog || !isDialogOpen(dialog) || !isModalDialog(dialog)) return undefined;
  return { kind: 'dialog-escape', dialog };
}

function rovingProbeForTarget(target: Element): ManagedKeyboardFocusProbe | undefined {
  let group = target.closest(MANAGED_GROUP_SELECTOR);
  if (!group) return undefined;
  let role = semanticRole(group) as ManagedGroupRole | undefined;
  if (role === 'radiogroup' && group.closest('[role="toolbar"]')) {
    group = group.closest('[role="toolbar"]');
    role = group ? 'toolbar' : undefined;
  }
  if (!group || !role) return undefined;
  if (role === 'tablist') return { kind: 'managed-roving-tabindex', group, roles: ['tab'], pattern: 'tabs' };
  if (role === 'radiogroup') return { kind: 'managed-roving-tabindex', group, roles: ['radio'], pattern: 'radio group' };
  if (role === 'toolbar') return { kind: 'managed-roving-tabindex', group, roles: [], pattern: 'toolbar' };
  if (role === 'menu' || role === 'menubar') {
    return { kind: 'managed-roving-tabindex', group, roles: MENU_ITEM_ROLES, pattern: 'menu' };
  }
  if (role === 'listbox') return { kind: 'managed-roving-tabindex', group, roles: ['option'], pattern: 'listbox' };
  return undefined;
}

export function captureManagedKeyboardFocusProbes(
  target: Element,
  action: KeyboardFocusAction,
): ManagedKeyboardFocusProbe[] {
  if (action.kind !== 'keydown') return [];
  const probes: ManagedKeyboardFocusProbe[] = [];
  const key = action.key;

  const dialog = dialogEscape(target, key);
  if (dialog) probes.push(dialog);
  const menuOpen = menuButtonOpen(target, key);
  if (menuOpen) probes.push(menuOpen);
  const disclosure = disclosureToggle(target, key);
  if (disclosure) probes.push(disclosure);

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    const tab = tabNavigation(target, key);
    if (tab) probes.push(tab);
    const radio = radioNavigation(target, key);
    if (radio) probes.push(radio);
    const toolbar = toolbarNavigation(target, key);
    if (toolbar) probes.push(toolbar);
    const menu = menuNavigation(target, key);
    if (menu) probes.push(menu);
    const listbox = listboxNavigation(target, key);
    if (listbox) probes.push(listbox);
  }

  const roving = rovingProbeForTarget(target);
  if (roving && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' '].includes(key)) {
    probes.push(roving);
  }

  return probes;
}

function evaluateManagedRovingTabindex(
  group: Element,
  roles: string[],
  pattern: ManagedPattern,
): PendingRuntimeEvent | undefined {
  if (!group.isConnected || Boolean(group.getAttribute('aria-activedescendant')?.trim())) return undefined;
  const items = pattern === 'toolbar' ? toolbarControls(group) : managedRoleItems(group, roles);
  const tabStops = items.filter(isSequentialTabStop);
  if (tabStops.length <= 1) return undefined;
  return pendingFinding({
    ruleId: 'FT-APG-011',
    title: 'Composite widget exposes multiple roving tab stops',
    detail: `${selectorFor(group)} exposes ${tabStops.length} managed ${pattern} items in the page tab sequence after the interaction. Review whether the composite should expose one tab stop while arrow keys manage movement inside it.`,
    element: group,
    references: [APG_KEYBOARD_REFERENCE],
  });
}

function evaluateExpectedFocus(input: {
  owner: Element;
  expected: Element;
  key: string;
  ruleId: string;
  title: string;
  pattern: string;
  reference: StandardReference;
}): PendingRuntimeEvent | undefined {
  if (!input.owner.isConnected || !input.expected.isConnected || !isAvailable(input.expected)) return undefined;
  const active = document.activeElement instanceof Element ? document.activeElement : undefined;
  const activeDescendant = input.owner.getAttribute('aria-activedescendant')?.trim();
  const virtualActive = activeDescendant ? document.getElementById(activeDescendant) : undefined;
  if (
    active === input.expected
    || (active != null && input.expected.contains(active))
    || virtualActive === input.expected
    || (virtualActive != null && input.expected.contains(virtualActive))
  ) return undefined;
  return pendingFinding({
    ruleId: input.ruleId,
    title: input.title,
    detail: `${input.key} was pressed in ${selectorFor(input.owner)}, but ${input.pattern} focus did not move to the expected item ${selectorFor(input.expected)} after the interaction.`,
    element: input.owner,
    references: [input.reference],
  });
}

function evaluateRadioNavigation(
  radiogroup: Element,
  expected: Element,
  key: string,
): PendingRuntimeEvent | undefined {
  const focusFinding = evaluateExpectedFocus({
    owner: radiogroup,
    expected,
    key,
    ruleId: 'FT-APG-016',
    title: 'Radio group arrow navigation did not reach the expected radio',
    pattern: 'radio group',
    reference: APG_RADIO_REFERENCE,
  });
  if (focusFinding) return focusFinding;
  if (expected.getAttribute('aria-checked')?.trim().toLowerCase() === 'true') return undefined;
  return pendingFinding({
    ruleId: 'FT-APG-016',
    title: 'Radio group arrow navigation did not update selection',
    detail: `${key} moved radio-group focus to ${selectorFor(expected)}, but the focused radio did not expose aria-checked="true" after the interaction.`,
    element: radiogroup,
    references: [APG_RADIO_REFERENCE],
  });
}

function evaluateMenuButtonOpen(
  probe: Extract<ManagedKeyboardFocusProbe, { kind: 'menu-button-open' }>,
): PendingRuntimeEvent | undefined {
  if (!probe.trigger.isConnected) return undefined;
  const expanded = probe.trigger.getAttribute('aria-expanded')?.trim().toLowerCase();
  const menuAvailable = probe.menu.isConnected && isAvailable(probe.menu);
  if (!menuAvailable || expanded === 'false') {
    if (!probe.requiredOpen) return undefined;
    return pendingFinding({
      ruleId: 'FT-APG-005',
      title: 'Keyboard activation did not open the menu',
      detail: `${probe.key === ' ' ? 'Space' : probe.key} was pressed on ${selectorFor(probe.trigger)}, but its controlled menu did not become available after the interaction.`,
      element: probe.trigger,
      references: [APG_MENU_BUTTON_REFERENCE],
    });
  }

  const items = managedRoleItems(probe.menu, MENU_ITEM_ROLES);
  const expected = probe.expectedPosition === 'last' ? items[items.length - 1] : items[0];
  if (!expected) {
    return pendingFinding({
      ruleId: 'FT-APG-005',
      title: 'Opened menu has no available menu item for keyboard focus',
      detail: `${selectorFor(probe.menu)} opened after keyboard activation of ${selectorFor(probe.trigger)}, but FocusTrace could not resolve an available menu item to receive focus.`,
      element: probe.trigger,
      references: [APG_MENU_BUTTON_REFERENCE],
    });
  }

  return evaluateExpectedFocus({
    owner: probe.menu,
    expected,
    key: probe.key,
    ruleId: 'FT-APG-005',
    title: 'Menu opened without focusing the expected item',
    pattern: 'menu',
    reference: APG_MENU_BUTTON_REFERENCE,
  });
}

function evaluateDisclosureToggle(
  control: Element,
  beforeExpanded: 'true' | 'false',
): PendingRuntimeEvent | undefined {
  if (!control.isConnected) return undefined;
  const afterExpanded = control.getAttribute('aria-expanded')?.trim().toLowerCase();
  if ((afterExpanded === 'true' || afterExpanded === 'false') && afterExpanded !== beforeExpanded) return undefined;
  return pendingFinding({
    ruleId: 'FT-APG-021',
    title: 'Disclosure keyboard activation did not toggle its expanded state',
    detail: `${selectorFor(control)} reported aria-expanded="${beforeExpanded}" before keyboard activation and did not expose the opposite state after the interaction.`,
    element: control,
    references: [APG_DISCLOSURE_REFERENCE],
  });
}

function evaluateDialogEscape(dialog: Element): PendingRuntimeEvent | undefined {
  if (!dialog.isConnected || !isDialogOpen(dialog)) return undefined;
  return pendingFinding({
    ruleId: 'FT-APG-020',
    title: 'Escape did not close the open modal dialog',
    detail: `Escape was pressed inside ${selectorFor(dialog)}, but the modal dialog remained open after the interaction.`,
    element: dialog,
    references: [APG_DIALOG_REFERENCE],
  });
}

export function isManagedKeyboardFocusProbe(
  probe: { kind: string },
): probe is ManagedKeyboardFocusProbe {
  return MANAGED_PROBE_KINDS.has(probe.kind as ManagedKeyboardFocusProbe['kind']);
}

export function evaluateManagedKeyboardFocusProbe(
  probe: ManagedKeyboardFocusProbe,
): PendingRuntimeEvent | undefined {
  switch (probe.kind) {
    case 'managed-roving-tabindex':
      return evaluateManagedRovingTabindex(probe.group, probe.roles, probe.pattern);
    case 'tab-navigation':
      return evaluateExpectedFocus({
        owner: probe.tablist,
        expected: probe.expected,
        key: probe.key,
        ruleId: 'FT-APG-015',
        title: 'Tab arrow navigation did not reach the expected tab',
        pattern: 'tablist',
        reference: APG_TABS_REFERENCE,
      });
    case 'radio-navigation':
      return evaluateRadioNavigation(probe.radiogroup, probe.expected, probe.key);
    case 'toolbar-navigation':
      return evaluateExpectedFocus({
        owner: probe.toolbar,
        expected: probe.expected,
        key: probe.key,
        ruleId: 'FT-APG-017',
        title: 'Toolbar arrow navigation did not reach the expected control',
        pattern: 'toolbar',
        reference: APG_TOOLBAR_REFERENCE,
      });
    case 'menu-navigation':
      return evaluateExpectedFocus({
        owner: probe.menu,
        expected: probe.expected,
        key: probe.key,
        ruleId: 'FT-APG-018',
        title: 'Menu arrow navigation did not reach the expected item',
        pattern: 'menu',
        reference: APG_MENU_REFERENCE,
      });
    case 'listbox-navigation':
      return evaluateExpectedFocus({
        owner: probe.listbox,
        expected: probe.expected,
        key: probe.key,
        ruleId: 'FT-APG-019',
        title: 'Listbox arrow navigation did not reach the expected option',
        pattern: 'listbox',
        reference: APG_LISTBOX_REFERENCE,
      });
    case 'menu-button-open':
      return evaluateMenuButtonOpen(probe);
    case 'disclosure-toggle':
      return evaluateDisclosureToggle(probe.control, probe.beforeExpanded);
    case 'dialog-escape':
      return evaluateDialogEscape(probe.dialog);
  }
}
