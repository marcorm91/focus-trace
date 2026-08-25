import { describe, expect, it } from 'vitest';
import {
  createFocusEvent,
  createFocusHiddenEvent,
  createFocusLostEvent,
  createFocusObscuredEvent,
  createFocusWalkEndEvent,
  createFocusWalkStartEvent,
} from '../lib/runtime/focus-events';

const button = {
  tag: 'button',
  id: 'save',
  selector: '#save',
  name: 'Save',
};

describe('runtime focus event builders', () => {
  it('creates an informational focus event', () => {
    expect(createFocusEvent({ element: button, label: 'Save' })).toMatchObject({
      kind: 'focus',
      severity: 'info',
      title: 'Focus → Save',
      element: button,
    });
  });

  it('creates automatic focus walk lifecycle events', () => {
    expect(createFocusWalkStartEvent(3)).toMatchObject({
      kind: 'focus-walk-start',
      severity: 'info',
      title: 'Automatic focus walk started',
    });
    expect(createFocusWalkEndEvent({ focusedSteps: 2, totalCandidates: 3, skipped: 1, stopped: false })).toMatchObject({
      kind: 'focus-walk-end',
      severity: 'info',
      title: 'Automatic focus walk completed',
      detail: 'Focused 2/3 candidates; skipped 1.',
    });
  });

  it('creates a focus obscured review event with evidence', () => {
    expect(
      createFocusObscuredEvent({
        element: button,
        evidence: 'All sampled points were covered.',
      }),
    ).toMatchObject({
      kind: 'focus-obscured',
      severity: 'serious',
      outcome: 'review',
      ruleId: 'FT-RUNTIME-002',
      title: 'Focused component may be completely obscured',
      detail: 'All sampled points were covered.',
      element: button,
    });
  });

  it('creates a focus lost event and includes body fallback cause when relevant', () => {
    const event = createFocusLostEvent({
      removed: button,
      activeSelector: '<body>',
      fellBackToBody: true,
    });

    expect(event).toMatchObject({
      kind: 'focus-lost',
      severity: 'serious',
      outcome: 'review',
      ruleId: 'FT-RUNTIME-001',
      title: 'Focused element removed during interaction',
      element: button,
      causes: [
        {
          type: 'FOCUSED_NODE_REMOVED',
          confidence: 'deterministic',
          summary: 'Focused node #save was removed from the DOM.',
        },
        {
          type: 'FOCUS_FELL_BACK_TO_BODY',
          confidence: 'deterministic',
          summary: 'After the focused node was removed, document focus fell back to <body>.',
        },
      ],
    });
    expect(event.detail).toContain('Focus fell back to <body>');
  });

  it('creates a focus hidden review event', () => {
    const event = createFocusHiddenEvent({
      element: button,
      elementSelector: '#save',
    });

    expect(event).toMatchObject({
      kind: 'focus-hidden',
      severity: 'serious',
      outcome: 'review',
      ruleId: 'FT-RUNTIME-005',
      title: 'Focused element became hidden during interaction',
      element: button,
      causes: [
        {
          type: 'FOCUSED_ELEMENT_BECAME_HIDDEN',
          confidence: 'deterministic',
          summary: 'A mutation hid the element that held focus or one of its ancestors.',
        },
      ],
    });
    expect(event.detail).toContain('Focus remained associated with #save');
  });
});