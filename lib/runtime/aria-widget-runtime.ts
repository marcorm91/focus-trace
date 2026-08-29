import { accessibleName, isProgrammaticallyHidden, semanticRole, selectorFor } from '../audit/dom';
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
  | { kind: 'menu-escape'; menu: Element; trigger?: Element };

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

export function captureAriaWidgetProbes(
  target: Element,
  action: RuntimeWidgetAction,
): AriaWidgetProbe[] {
  const probes: AriaWidgetProbe[] = [];
  const role = semanticRole(target);

  if (activationAction(action) && target.hasAttribute('aria-expanded') && controlledElements(target).length) {
    probes.push({ kind: 'expanded-control', control: target });
  }

  if (role === 'tab' && activationAction(action)) {
    probes.push({ kind: 'tab-activation', tab: target });
  }

  const menu = controlledMenu(target);
  if (menu && menuActivationAction(action) && action.kind === 'keydown') {
    probes.push({ kind: 'menu-open-focus', trigger: target, menu });
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

export function evaluateAriaWidgetProbe(probe: AriaWidgetProbe): PendingRuntimeEvent | undefined {
  switch (probe.kind) {
    case 'expanded-control':
      return evaluateExpandedControl(probe.control);
    case 'tab-activation':
      return evaluateTabActivation(probe.tab);
    case 'menu-open-focus':
      return evaluateMenuOpenFocus(probe.trigger, probe.menu);
    case 'menu-escape':
      return evaluateMenuEscape(probe.menu, probe.trigger);
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
