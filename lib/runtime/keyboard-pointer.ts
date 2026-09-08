import {
  KEYBOARD_OPERABILITY_RULE,
  KEYBOARD_TRAP_RULE,
  POINTER_CANCELLATION_RULE,
} from '../../shared/keyboard-pointer-rules';
import type { ElementSnapshot, RuntimeEvent } from '../../shared/types';
import { isSequentiallyFocusable, semanticRole } from '../audit/dom';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;
export type TabDirection = 'forward' | 'backward';

const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'tab',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'slider',
  'spinbutton',
  'combobox',
]);

function isNativeKeyboardTarget(element: Element): boolean {
  if (element instanceof HTMLButtonElement) return true;
  if (element instanceof HTMLAnchorElement || element instanceof HTMLAreaElement) return element.hasAttribute('href');
  if (element instanceof HTMLInputElement) return element.type.toLowerCase() !== 'hidden';
  if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) return true;
  return element instanceof HTMLElement && element.tagName === 'SUMMARY';
}

function hasObservableCustomActionSignal(element: Element): boolean {
  const role = semanticRole(element);
  if (role && INTERACTIVE_ROLES.has(role)) return true;
  if (element.hasAttribute('tabindex')) return true;
  if (element.hasAttribute('onclick')) return true;
  if (typeof (element as HTMLElement).onclick === 'function') return true;
  return ['aria-pressed', 'aria-expanded', 'aria-haspopup', 'aria-checked']
    .some((attribute) => element.hasAttribute(attribute));
}

export function observedPointerActionTarget(start: Element): Element | undefined {
  let current: Element | null = start;
  while (current && current !== document.body && current !== document.documentElement) {
    if (isNativeKeyboardTarget(current) || hasObservableCustomActionSignal(current)) return current;
    current = current.parentElement;
  }
  return undefined;
}

export function keyboardOperabilityReviewForPointerAction(
  element: Element,
  snapshot: ElementSnapshot,
): PendingRuntimeEvent | undefined {
  if (isNativeKeyboardTarget(element) || isSequentiallyFocusable(element)) return undefined;

  const role = semanticRole(element);
  return {
    kind: 'click',
    severity: KEYBOARD_OPERABILITY_RULE.severity,
    title: KEYBOARD_OPERABILITY_RULE.title,
    outcome: 'review',
    ruleId: KEYBOARD_OPERABILITY_RULE.id,
    references: KEYBOARD_OPERABILITY_RULE.references,
    element: snapshot,
    detail: `A trusted pointer activation was observed on a custom ${role ? `role=${JSON.stringify(role)} ` : ''}<${element.tagName.toLowerCase()}> that is not in sequential keyboard focus navigation. Review whether the same functionality is reachable and operable from the keyboard through this or an equivalent control.`,
  };
}

export interface KeyboardTrapFocusInput {
  selector: string;
  element: ElementSnapshot;
  direction: TabDirection;
  tabOrderSize: number;
  inModal: boolean;
}

export interface KeyboardTrapObservation {
  kind: 'cycle' | 'no-move';
  direction: TabDirection;
  selectors: string[];
  tabOrderSize: number;
  element: ElementSnapshot;
}

export class KeyboardTrapTracker {
  private history: KeyboardTrapFocusInput[] = [];
  private noMove?: { selector: string; direction: TabDirection; count: number; tabOrderSize: number };
  private reported = new Set<string>();

  recordFocus(input: KeyboardTrapFocusInput): KeyboardTrapObservation | undefined {
    this.noMove = undefined;
    if (input.inModal || input.tabOrderSize <= 1) {
      this.history = [];
      return undefined;
    }

    this.history.push(input);
    this.history = this.history.slice(-8);

    for (let cycleLength = 2; cycleLength <= 4; cycleLength += 1) {
      const required = cycleLength * 2;
      if (this.history.length < required) continue;
      const sample = this.history.slice(-required);
      if (sample.some((entry) => entry.inModal || entry.direction !== input.direction)) continue;
      const first = sample.slice(0, cycleLength).map((entry) => entry.selector);
      const second = sample.slice(cycleLength).map((entry) => entry.selector);
      if (!first.every((selector, index) => selector === second[index])) continue;
      if (new Set(first).size !== cycleLength) continue;
      const minimumTabOrderSize = Math.min(...sample.map((entry) => entry.tabOrderSize));
      if (minimumTabOrderSize <= cycleLength) continue;

      const signature = `cycle:${input.direction}:${first.join('>')}`;
      if (this.reported.has(signature)) return undefined;
      this.reported.add(signature);
      return {
        kind: 'cycle',
        direction: input.direction,
        selectors: first,
        tabOrderSize: minimumTabOrderSize,
        element: input.element,
      };
    }

    return undefined;
  }

  recordNoMove(input: KeyboardTrapFocusInput): KeyboardTrapObservation | undefined {
    this.history = [];
    if (input.inModal || input.tabOrderSize <= 1) {
      this.noMove = undefined;
      return undefined;
    }

    const same = this.noMove?.selector === input.selector && this.noMove.direction === input.direction;
    this.noMove = {
      selector: input.selector,
      direction: input.direction,
      count: same ? (this.noMove?.count ?? 0) + 1 : 1,
      tabOrderSize: input.tabOrderSize,
    };
    if (this.noMove.count < 2) return undefined;

    const signature = `no-move:${input.direction}:${input.selector}`;
    if (this.reported.has(signature)) return undefined;
    this.reported.add(signature);
    return {
      kind: 'no-move',
      direction: input.direction,
      selectors: [input.selector],
      tabOrderSize: input.tabOrderSize,
      element: input.element,
    };
  }

  reset(): void {
    this.history = [];
    this.noMove = undefined;
    this.reported.clear();
  }
}

export function createKeyboardTrapReviewEvent(observation: KeyboardTrapObservation): PendingRuntimeEvent {
  const cycle = observation.selectors.join(' → ');
  const detail = observation.kind === 'cycle'
    ? `Two consecutive ${observation.direction} Tab sequences repeated the same ${observation.selectors.length}-target cycle (${cycle}) while the observed page tab order contained at least ${observation.tabOrderSize} targets. Review whether the component can be exited with standard keyboard navigation or an explicitly documented alternative.`
    : `Two consecutive ${observation.direction} Tab attempts left focus on ${cycle} while the observed page tab order contained at least ${observation.tabOrderSize} targets. Review whether focus is trapped or whether an appropriate documented escape mechanism exists.`;
  return {
    kind: 'focus',
    severity: KEYBOARD_TRAP_RULE.severity,
    title: KEYBOARD_TRAP_RULE.title,
    outcome: 'review',
    ruleId: KEYBOARD_TRAP_RULE.id,
    references: KEYBOARD_TRAP_RULE.references,
    element: observation.element,
    detail,
  };
}

const POINTER_STATE_ATTRIBUTES = [
  'aria-expanded',
  'aria-pressed',
  'aria-checked',
  'aria-selected',
  'open',
] as const;

interface PointerActivationState {
  connected: boolean;
  url: string;
  attributes: Record<string, string | null>;
  checked?: boolean;
  open?: boolean;
}

interface PendingPointerAction {
  pointerId: number;
  element: Element;
  snapshot: ElementSnapshot;
  state: PointerActivationState;
}

export interface PointerCancellationObservation {
  phase: 'up' | 'cancel';
  element: ElementSnapshot;
  changes: string[];
}

function pointerActivationState(element: Element, url: string): PointerActivationState {
  const attributes = Object.fromEntries(
    POINTER_STATE_ATTRIBUTES.map((attribute) => [attribute, element.getAttribute(attribute)]),
  );
  const state: PointerActivationState = {
    connected: element.isConnected,
    url,
    attributes,
  };
  if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type.toLowerCase())) {
    state.checked = element.checked;
  }
  if (element instanceof HTMLDetailsElement || element instanceof HTMLDialogElement) state.open = element.open;
  return state;
}

export class PointerCancellationTracker {
  private pending = new Map<number, PendingPointerAction>();

  start(pointerId: number, element: Element, snapshot: ElementSnapshot, url: string): void {
    this.pending.set(pointerId, {
      pointerId,
      element,
      snapshot,
      state: pointerActivationState(element, url),
    });
  }

  finish(pointerId: number, phase: 'up' | 'cancel', url: string): PointerCancellationObservation | undefined {
    const pending = this.pending.get(pointerId);
    if (!pending) return undefined;
    this.pending.delete(pointerId);

    const after = pointerActivationState(pending.element, url);
    const changes: string[] = [];
    if (pending.state.connected && !after.connected) changes.push('the pointer-down target was removed before release');
    if (pending.state.url !== after.url) changes.push('the document URL changed before release');
    for (const attribute of POINTER_STATE_ATTRIBUTES) {
      if (pending.state.attributes[attribute] !== after.attributes[attribute]) {
        changes.push(`${attribute} changed before ${phase === 'up' ? 'pointer release' : 'pointer cancellation'}`);
      }
    }
    if (pending.state.checked !== after.checked && pending.state.checked != null && after.checked != null) {
      changes.push(`checked state changed before ${phase === 'up' ? 'pointer release' : 'pointer cancellation'}`);
    }
    if (pending.state.open !== after.open && pending.state.open != null && after.open != null) {
      changes.push(`open state changed before ${phase === 'up' ? 'pointer release' : 'pointer cancellation'}`);
    }
    if (!changes.length) return undefined;

    return { phase, element: pending.snapshot, changes: [...new Set(changes)] };
  }

  cancel(pointerId?: number): void {
    if (pointerId == null) this.pending.clear();
    else this.pending.delete(pointerId);
  }

  reset(): void {
    this.pending.clear();
  }
}

export function createPointerCancellationReviewEvent(
  observation: PointerCancellationObservation,
): PendingRuntimeEvent {
  return {
    kind: 'click',
    severity: POINTER_CANCELLATION_RULE.severity,
    title: POINTER_CANCELLATION_RULE.title,
    outcome: 'review',
    ruleId: POINTER_CANCELLATION_RULE.id,
    references: POINTER_CANCELLATION_RULE.references,
    element: observation.element,
    detail: `FocusTrace observed activation-like state before ${observation.phase === 'up' ? 'pointer release' : 'a pointercancel event'}: ${observation.changes.join('; ')}. Review whether accidental activation can be aborted or undone and whether a WCAG 2.5.2 exception applies.`,
  };
}
