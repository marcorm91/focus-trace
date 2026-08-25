import { describe, expect, it } from 'vitest';
import {
  createDialogCloseEvent,
  createDialogFocusEscapeEvent,
  createDialogOpenEvent,
  createDialogRestoreFocusEvent,
} from '../lib/runtime/dialog-events';

const dialog = {
  tag: 'div',
  role: 'dialog',
  id: 'modal',
  selector: '#modal',
  name: 'Settings',
};

const button = {
  tag: 'button',
  id: 'save',
  selector: '#save',
  name: 'Save',
};

describe('runtime dialog event builders', () => {
  it('creates a modal focus escape review event', () => {
    const event = createDialogFocusEscapeEvent({
      target: button,
      targetSelector: '#save',
    });

    expect(event).toMatchObject({
      kind: 'dialog-focus-escape',
      severity: 'serious',
      outcome: 'review',
      ruleId: 'FT-APG-002',
      title: 'Focus escaped an open modal dialog',
      detail: 'Focus moved to #save while a modal dialog remained open.',
      element: button,
      causes: [
        {
          type: 'MODAL_FOCUS_ESCAPE',
          confidence: 'deterministic',
          summary: 'Focus moved outside an open modal dialog.',
        },
      ],
    });
  });

  it('creates an informational dialog open event when focus is inside', () => {
    expect(createDialogOpenEvent({ dialog, focusedInside: true })).toMatchObject({
      kind: 'dialog-open',
      severity: 'info',
      title: 'Dialog opened with focus inside',
      element: dialog,
    });
  });

  it('creates a dialog initial focus review event when focus is outside', () => {
    const event = createDialogOpenEvent({ dialog, focusedInside: false });

    expect(event).toMatchObject({
      kind: 'dialog-open',
      severity: 'serious',
      outcome: 'review',
      ruleId: 'FT-APG-001',
      title: 'Dialog opened while focus remained outside',
      element: dialog,
      causes: [
        {
          type: 'DIALOG_OPENED_WITHOUT_FOCUS',
          confidence: 'deterministic',
          summary: 'A dialog opened but focus was not established inside it.',
        },
      ],
    });
    expect(event.detail).toContain('focus to move to an element inside a modal dialog');
  });

  it('creates dialog close and restore focus events', () => {
    expect(createDialogCloseEvent(dialog)).toMatchObject({
      kind: 'dialog-close',
      severity: 'info',
      title: 'Dialog closed',
      element: dialog,
    });

    const restoreEvent = createDialogRestoreFocusEvent({
      triggerSelector: '#open-modal',
      activeSelector: '#save',
      activeElement: button,
    });

    expect(restoreEvent).toMatchObject({
      kind: 'dialog-close',
      severity: 'moderate',
      outcome: 'review',
      ruleId: 'FT-APG-003',
      title: 'Dialog closed without restoring focus to a logical target',
      element: button,
    });
    expect(restoreEvent.detail).toContain('Dialog trigger was #open-modal; focus ended on #save.');
  });
});
