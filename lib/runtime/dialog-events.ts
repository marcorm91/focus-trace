import { RULES } from '../../shared/rule-catalog';
import type { ElementSnapshot, RuntimeEvent } from '../../shared/types';
import { createRuntimeCause as cause } from './events';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

interface DialogFocusEscapeEventInput {
  target: ElementSnapshot;
  targetSelector: string;
}

export function createDialogFocusEscapeEvent({
  target,
  targetSelector,
}: DialogFocusEscapeEventInput): PendingRuntimeEvent {
  return {
    kind: 'dialog-focus-escape',
    severity: RULES.dialogFocusEscape.severity,
    outcome: 'review',
    ruleId: RULES.dialogFocusEscape.id,
    references: RULES.dialogFocusEscape.references,
    title: RULES.dialogFocusEscape.title,
    detail: `Focus moved to ${targetSelector} while a modal dialog remained open.`,
    element: target,
    causes: [cause('MODAL_FOCUS_ESCAPE', 'Focus moved outside an open modal dialog.')],
  };
}

interface DialogOpenEventInput {
  dialog: ElementSnapshot;
  focusedInside: boolean;
}

export function createDialogOpenEvent({ dialog, focusedInside }: DialogOpenEventInput): PendingRuntimeEvent {
  return {
    kind: 'dialog-open',
    severity: focusedInside ? 'info' : RULES.dialogInitialFocus.severity,
    ...(focusedInside
      ? {}
      : {
          outcome: 'review' as const,
          ruleId: RULES.dialogInitialFocus.id,
          references: RULES.dialogInitialFocus.references,
          causes: [
            cause(
              'DIALOG_OPENED_WITHOUT_FOCUS',
              'A dialog opened but focus was not established inside it.',
            ),
          ],
        }),
    title: focusedInside ? 'Dialog opened with focus inside' : RULES.dialogInitialFocus.title,
    ...(!focusedInside
      ? {
          detail:
            'WAI-ARIA APG expects focus to move to an element inside a modal dialog when it opens.',
        }
      : {}),
    element: dialog,
  };
}

export function createDialogCloseEvent(dialog: ElementSnapshot): PendingRuntimeEvent {
  return {
    kind: 'dialog-close',
    severity: 'info',
    title: 'Dialog closed',
    element: dialog,
  };
}

interface DialogRestoreFocusEventInput {
  triggerSelector: string;
  activeSelector: string;
  activeElement?: ElementSnapshot;
}

export function createDialogRestoreFocusEvent({
  triggerSelector,
  activeSelector,
  activeElement,
}: DialogRestoreFocusEventInput): PendingRuntimeEvent {
  return {
    kind: 'dialog-close',
    severity: RULES.dialogRestoreFocus.severity,
    outcome: 'review',
    ruleId: RULES.dialogRestoreFocus.id,
    references: RULES.dialogRestoreFocus.references,
    title: RULES.dialogRestoreFocus.title,
    detail: `Dialog trigger was ${triggerSelector}; focus ended on ${activeSelector}. APG allows workflow-specific exceptions, so this requires review.`,
    ...(activeElement ? { element: activeElement } : {}),
  };
}
