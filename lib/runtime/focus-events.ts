import { RULES } from '../../shared/rule-catalog';
import type { ElementSnapshot, FocusWalkResult, RuntimeEvent } from '../../shared/types';
import { createRuntimeCause as cause } from './events';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

interface FocusEventInput {
  element: ElementSnapshot;
  label: string;
}

export function createFocusEvent({ element, label }: FocusEventInput): PendingRuntimeEvent {
  return {
    kind: 'focus',
    severity: 'info',
    title: `Focus → ${label}`,
    element,
  };
}

export function createFocusWalkStartEvent(totalCandidates: number): PendingRuntimeEvent {
  return {
    kind: 'focus-walk-start',
    severity: 'info',
    title: 'Automatic focus walk started',
    detail: `FocusTrace will move focus across ${totalCandidates} keyboard-focusable candidate${totalCandidates === 1 ? '' : 's'} in computed tab order.`,
    focusWalk: {
      totalCandidates,
      focusedSteps: 0,
      skipped: 0,
      stopped: false,
    },
  };
}

export function createFocusWalkEndEvent({
  focusedSteps,
  totalCandidates,
  skipped,
  stopped,
}: FocusWalkResult): PendingRuntimeEvent {
  return {
    kind: 'focus-walk-end',
    severity: 'info',
    title: stopped ? 'Automatic focus walk stopped early' : 'Automatic focus walk completed',
    detail: `Focused ${focusedSteps}/${totalCandidates} candidate${totalCandidates === 1 ? '' : 's'}; skipped ${skipped}.`,
    focusWalk: {
      focusedSteps,
      totalCandidates,
      skipped,
      stopped,
    },
  };
}

interface FocusObscuredEventInput {
  element: ElementSnapshot;
  evidence?: string;
}

export function createFocusObscuredEvent({ element, evidence }: FocusObscuredEventInput): PendingRuntimeEvent {
  return {
    kind: 'focus-obscured',
    severity: RULES.focusObscured.severity,
    outcome: 'review',
    ruleId: RULES.focusObscured.id,
    references: RULES.focusObscured.references,
    title: RULES.focusObscured.title,
    ...(evidence ? { detail: evidence } : {}),
    element,
  };
}

interface FocusLostEventInput {
  removed: ElementSnapshot;
  activeSelector: string;
  fellBackToBody: boolean;
}

export function createFocusLostEvent({
  removed,
  activeSelector,
  fellBackToBody,
}: FocusLostEventInput): PendingRuntimeEvent {
  return {
    kind: 'focus-lost',
    severity: RULES.focusLost.severity,
    outcome: 'review',
    ruleId: RULES.focusLost.id,
    references: RULES.focusLost.references,
    title: RULES.focusLost.title,
    detail: `Focused node ${removed.selector} was removed. Focus fell back to ${activeSelector}. Review whether the resulting focus order remains meaningful and operable.`,
    element: removed,
    causes: [
      cause('FOCUSED_NODE_REMOVED', `Focused node ${removed.selector} was removed from the DOM.`),
      ...(fellBackToBody
        ? [
            cause(
              'FOCUS_FELL_BACK_TO_BODY',
              'After the focused node was removed, document focus fell back to <body>.',
            ),
          ]
        : []),
    ],
  };
}

interface FocusHiddenEventInput {
  element: ElementSnapshot;
  elementSelector: string;
}

export function createFocusHiddenEvent({ element, elementSelector }: FocusHiddenEventInput): PendingRuntimeEvent {
  return {
    kind: 'focus-hidden',
    severity: RULES.focusedElementHidden.severity,
    outcome: 'review',
    ruleId: RULES.focusedElementHidden.id,
    references: RULES.focusedElementHidden.references,
    title: RULES.focusedElementHidden.title,
    detail: `Focus remained associated with ${elementSelector} while it became hidden from rendering or assistive technology.`,
    element,
    causes: [
      cause(
        'FOCUSED_ELEMENT_BECAME_HIDDEN',
        'A mutation hid the element that held focus or one of its ancestors.',
      ),
    ],
  };
}
