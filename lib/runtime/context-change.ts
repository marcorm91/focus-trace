import { RULES } from '../../shared/rule-catalog';
import type {
  ElementSnapshot,
  RuntimeContextChangeEvidence,
  RuntimeEvent,
} from '../../shared/types';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

export const CONTEXT_CHANGE_WINDOW_MS = 1200;

export type SettingChangeEventKind = 'input' | 'change';

type ContextTriggerKind = 'focus' | 'input';

type ContextChangeSignal =
  | { kind: 'focus-move'; destination: ElementSnapshot }
  | { kind: 'route'; fromUrl: string; toUrl: string }
  | { kind: 'dialog-open'; destination: ElementSnapshot };

interface PendingContextTrigger {
  kind: ContextTriggerKind;
  element: ElementSnapshot;
  timestamp: number;
  interactionId?: string;
  inputEventType?: SettingChangeEventKind;
}

export interface RuntimeContextChangeFinding {
  event: PendingRuntimeEvent;
  interactionId?: string;
}

const SETTING_CHANGE_ROLES = new Set([
  'checkbox',
  'combobox',
  'listbox',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'textbox',
]);

const NON_SETTING_INPUT_TYPES = new Set([
  'button',
  'hidden',
  'image',
  'reset',
  'submit',
]);

export function isSettingChangeTarget(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag === 'select' || tag === 'textarea') return true;
  if (tag === 'input') {
    const type = (element.getAttribute('type') || 'text').trim().toLowerCase();
    return !NON_SETTING_INPUT_TYPES.has(type);
  }

  const contentEditable = element.getAttribute('contenteditable')?.trim().toLowerCase();
  if (contentEditable === '' || contentEditable === 'true' || contentEditable === 'plaintext-only') return true;

  const roles = element.getAttribute('role')?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  return roles.some((role) => SETTING_CHANGE_ROLES.has(role));
}

export function createSettingChangeEvent(
  element: ElementSnapshot,
  inputEventType: SettingChangeEventKind,
): PendingRuntimeEvent {
  return {
    kind: 'input-change',
    severity: 'info',
    title: inputEventType === 'input' ? 'Input changed' : 'Control setting changed',
    detail: `A trusted ${inputEventType} event changed this control. FocusTrace records the control identity and event type, not its value.`,
    element,
    inputEventType,
  };
}

function signalEvidence(
  trigger: PendingContextTrigger,
  signal: ContextChangeSignal,
): RuntimeContextChangeEvidence {
  return {
    triggerKind: trigger.kind,
    changeKind: signal.kind,
    ...(trigger.inputEventType ? { inputEventType: trigger.inputEventType } : {}),
    ...('destination' in signal ? { destination: signal.destination } : {}),
  };
}

function contextChangeDescription(trigger: PendingContextTrigger, signal: ContextChangeSignal): string {
  const source = trigger.element.selector;
  const change = signal.kind === 'route'
    ? `a route change from ${signal.fromUrl} to ${signal.toUrl}`
    : signal.kind === 'dialog-open'
      ? `the dialog ${signal.destination.selector} opening`
      : `focus moving programmatically to ${signal.destination.selector}`;

  if (trigger.kind === 'focus') {
    return `Receiving focus on ${source} was followed by ${change} without a separate observed activation. FocusTrace keeps this as REVIEW because the observed ordering is strong runtime evidence but does not prove which author handler initiated the change.`;
  }

  return `A trusted ${trigger.inputEventType ?? 'input'} event on ${source} was followed by ${change}. FocusTrace keeps this as REVIEW because WCAG 3.2.2 allows an automatic context change when the user was advised beforehand, and that prior advice cannot always be established from this runtime sequence.`;
}

function createContextChangeReview(
  trigger: PendingContextTrigger,
  signal: ContextChangeSignal,
): RuntimeContextChangeFinding {
  const rule = trigger.kind === 'focus' ? RULES.onFocusContextChange : RULES.onInputContextChange;
  return {
    event: {
      kind: 'context-change',
      severity: rule.severity,
      title: rule.title,
      detail: contextChangeDescription(trigger, signal),
      element: trigger.element,
      contextChange: signalEvidence(trigger, signal),
      ...(
        signal.kind === 'route'
          ? { fromUrl: signal.fromUrl, toUrl: signal.toUrl }
          : {}
      ),
      outcome: 'review',
      ruleId: rule.id,
      references: rule.references,
    },
    ...(trigger.interactionId ? { interactionId: trigger.interactionId } : {}),
  };
}

function isSameTarget(trigger: PendingContextTrigger, destination: ElementSnapshot): boolean {
  return trigger.element.selector === destination.selector;
}

export class RuntimeContextChangeTracker {
  private focusTrigger?: PendingContextTrigger;
  private inputTrigger?: PendingContextTrigger;

  constructor(private readonly windowMs = CONTEXT_CHANGE_WINDOW_MS) {}

  private prune(timestamp: number): void {
    if (this.focusTrigger && timestamp - this.focusTrigger.timestamp > this.windowMs) this.focusTrigger = undefined;
    if (this.inputTrigger && timestamp - this.inputTrigger.timestamp > this.windowMs) this.inputTrigger = undefined;
  }

  private clearPending(): void {
    this.focusTrigger = undefined;
    this.inputTrigger = undefined;
  }

  private resolve(signal: ContextChangeSignal, timestamp: number): RuntimeContextChangeFinding | undefined {
    this.prune(timestamp);
    const trigger = this.inputTrigger ?? this.focusTrigger;
    this.clearPending();
    if (!trigger || timestamp < trigger.timestamp) return undefined;
    if ('destination' in signal && isSameTarget(trigger, signal.destination)) return undefined;
    return createContextChangeReview(trigger, signal);
  }

  beginUserAction(timestamp: number): void {
    this.prune(timestamp);
    this.clearPending();
  }

  recordActivation(timestamp: number): void {
    this.prune(timestamp);
    // Activation can legitimately change context. Clear only focus attribution;
    // a setting-change event produced by the activation is recorded separately.
    this.focusTrigger = undefined;
  }

  recordFocus(input: {
    element: ElementSnapshot;
    timestamp: number;
    interactionId?: string;
    userInitiatedFocusMove?: boolean;
  }): RuntimeContextChangeFinding | undefined {
    this.prune(input.timestamp);

    let finding: RuntimeContextChangeFinding | undefined;
    if (input.userInitiatedFocusMove) {
      // Tab/pointer navigation is the user's chosen focus movement, not an
      // automatic context change caused by the previous control.
      this.clearPending();
    } else {
      finding = this.resolve({ kind: 'focus-move', destination: input.element }, input.timestamp);
    }

    this.focusTrigger = {
      kind: 'focus',
      element: input.element,
      timestamp: input.timestamp,
      ...(input.interactionId ? { interactionId: input.interactionId } : {}),
    };
    return finding;
  }

  recordSettingChange(input: {
    element: ElementSnapshot;
    inputEventType: SettingChangeEventKind;
    timestamp: number;
    interactionId?: string;
  }): void {
    this.prune(input.timestamp);
    // Once a control setting changes, WCAG 3.2.2 is the more specific causal
    // question. Do not also blame the control merely for having focus.
    this.focusTrigger = undefined;
    this.inputTrigger = {
      kind: 'input',
      element: input.element,
      timestamp: input.timestamp,
      inputEventType: input.inputEventType,
      ...(input.interactionId ? { interactionId: input.interactionId } : {}),
    };
  }

  recordRouteChange(
    fromUrl: string,
    toUrl: string,
    timestamp: number,
  ): RuntimeContextChangeFinding | undefined {
    if (fromUrl === toUrl) return undefined;
    return this.resolve({ kind: 'route', fromUrl, toUrl }, timestamp);
  }

  recordDialogOpen(
    dialog: ElementSnapshot,
    timestamp: number,
    options: { suppressFocusTrigger?: boolean } = {},
  ): RuntimeContextChangeFinding | undefined {
    this.prune(timestamp);
    if (this.inputTrigger) return this.resolve({ kind: 'dialog-open', destination: dialog }, timestamp);
    if (options.suppressFocusTrigger) {
      this.focusTrigger = undefined;
      return undefined;
    }
    return this.resolve({ kind: 'dialog-open', destination: dialog }, timestamp);
  }

  reset(): void {
    this.clearPending();
  }
}
