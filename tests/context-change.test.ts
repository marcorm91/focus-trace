// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  CONTEXT_CHANGE_WINDOW_MS,
  createSettingChangeEvent,
  isSettingChangeTarget,
  RuntimeContextChangeTracker,
} from '../lib/runtime/context-change';
import type { ElementSnapshot } from '../shared/types';

const snap = (selector: string, tag = 'input'): ElementSnapshot => ({ tag, selector });

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Context changes</title></head><body>${body}</body></html>`);
  document.close();
}

function element(selector: string): Element {
  const result = document.querySelector(selector);
  if (!result) throw new Error(`Missing test element ${selector}`);
  return result;
}

describe('WCAG 3.2 runtime context-change correlation', () => {
  it('reviews a route change that follows receiving focus without another activation', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordFocus({ element: snap('#country'), timestamp: 100, interactionId: 'ix-tab' });

    const finding = tracker.recordRouteChange('/form', '/checkout', 240);

    expect(finding).toMatchObject({
      interactionId: 'ix-tab',
      event: {
        kind: 'context-change',
        severity: 'moderate',
        outcome: 'review',
        ruleId: 'FT-RUNTIME-008',
        element: { selector: '#country' },
        fromUrl: '/form',
        toUrl: '/checkout',
        contextChange: {
          triggerKind: 'focus',
          changeKind: 'route',
        },
        references: [expect.objectContaining({ type: 'WCAG', id: '3.2.1', level: 'A' })],
      },
    });
  });

  it('reviews a programmatic focus move caused after another component receives focus', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordFocus({ element: snap('#first'), timestamp: 100 });

    const finding = tracker.recordFocus({ element: snap('#second'), timestamp: 130 });

    expect(finding?.event).toMatchObject({
      ruleId: 'FT-RUNTIME-008',
      contextChange: {
        triggerKind: 'focus',
        changeKind: 'focus-move',
        destination: { selector: '#second' },
      },
    });
  });

  it('uses the more specific On Input rule when a setting change follows focus', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordFocus({ element: snap('#country', 'select'), timestamp: 100, interactionId: 'ix-focus' });
    tracker.recordSettingChange({
      element: snap('#country', 'select'),
      inputEventType: 'change',
      timestamp: 180,
      interactionId: 'ix-change',
    });

    const finding = tracker.recordRouteChange('/form', '/es', 260);

    expect(finding).toMatchObject({
      interactionId: 'ix-change',
      event: {
        ruleId: 'FT-RUNTIME-009',
        element: { selector: '#country' },
        contextChange: {
          triggerKind: 'input',
          changeKind: 'route',
          inputEventType: 'change',
        },
        references: [expect.objectContaining({ type: 'WCAG', id: '3.2.2', level: 'A' })],
      },
    });
  });

  it('reviews a programmatic focus move after input without recording the control value', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordSettingChange({
      element: snap('#search'),
      inputEventType: 'input',
      timestamp: 100,
      interactionId: 'ix-input',
    });

    const finding = tracker.recordFocus({ element: snap('#results-heading', 'h2'), timestamp: 170 });

    expect(finding?.event).toMatchObject({
      ruleId: 'FT-RUNTIME-009',
      contextChange: {
        triggerKind: 'input',
        changeKind: 'focus-move',
        inputEventType: 'input',
      },
    });
    expect(finding?.event.detail).not.toContain('secret value');
    expect(JSON.stringify(finding)).not.toContain('secret value');
  });

  it('does not reinterpret an explicit Tab or pointer focus move as a context change', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordSettingChange({
      element: snap('#name'),
      inputEventType: 'change',
      timestamp: 100,
    });

    const focusFinding = tracker.recordFocus({
      element: snap('#next'),
      timestamp: 150,
      userInitiatedFocusMove: true,
    });

    expect(focusFinding).toBeUndefined();

    // The newly focused component can still become the source of a later
    // On Focus context change of its own.
    expect(tracker.recordRouteChange('/step-1', '/step-2', 230)?.event.ruleId).toBe('FT-RUNTIME-008');
  });

  it('clears focus attribution when the user explicitly activates the focused control', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordFocus({ element: snap('#continue', 'button'), timestamp: 100 });
    tracker.recordActivation(150);

    expect(tracker.recordRouteChange('/one', '/two', 180)).toBeUndefined();

    tracker.recordSettingChange({
      element: snap('#plan', 'select'),
      inputEventType: 'change',
      timestamp: 220,
    });
    expect(tracker.recordRouteChange('/two', '/three', 260)?.event.ruleId).toBe('FT-RUNTIME-009');
  });

  it('clears stale causal candidates when a separate user action starts', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordFocus({ element: snap('#automatic'), timestamp: 100 });
    tracker.beginUserAction(250);

    expect(tracker.recordDialogOpen(snap('#dialog', 'dialog'), 300)).toBeUndefined();
  });

  it('expires context-change candidates outside the bounded correlation window', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordFocus({ element: snap('#field'), timestamp: 100 });

    expect(
      tracker.recordRouteChange('/one', '/two', 100 + CONTEXT_CHANGE_WINDOW_MS + 1),
    ).toBeUndefined();
  });

  it('does not blame focus for a dialog that already moved focus inside itself', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordFocus({ element: snap('#dialog-field'), timestamp: 100 });

    expect(
      tracker.recordDialogOpen(snap('#dialog', 'dialog'), 130, { suppressFocusTrigger: true }),
    ).toBeUndefined();
  });

  it('still reviews a dialog opened by a real setting change', () => {
    const tracker = new RuntimeContextChangeTracker();
    tracker.recordSettingChange({
      element: snap('#mode', 'select'),
      inputEventType: 'change',
      timestamp: 100,
      interactionId: 'ix-mode',
    });

    const finding = tracker.recordDialogOpen(
      snap('#confirmation', 'dialog'),
      140,
      { suppressFocusTrigger: true },
    );

    expect(finding).toMatchObject({
      interactionId: 'ix-mode',
      event: {
        ruleId: 'FT-RUNTIME-009',
        contextChange: {
          triggerKind: 'input',
          changeKind: 'dialog-open',
          destination: { selector: '#confirmation' },
        },
      },
    });
  });

  it('creates non-sensitive raw setting-change evidence', () => {
    const raw = createSettingChangeEvent(snap('#password'), 'input');
    expect(raw).toMatchObject({
      kind: 'input-change',
      severity: 'info',
      element: { selector: '#password' },
      inputEventType: 'input',
    });
    expect(raw.detail).toContain('not its value');
  });
});

describe('3.2.2 setting-change target scope', () => {
  it.each([
    ['text input', '<input id="target">'],
    ['checkbox', '<input id="target" type="checkbox">'],
    ['select', '<select id="target"><option>One</option></select>'],
    ['textarea', '<textarea id="target"></textarea>'],
    ['contenteditable', '<div id="target" contenteditable="true"></div>'],
    ['ARIA slider', '<div id="target" role="slider" tabindex="0"></div>'],
  ])('accepts a supported setting target: %s', (_label, markup) => {
    render(markup);
    expect(isSettingChangeTarget(element('#target'))).toBe(true);
  });

  it.each([
    ['button input', '<input id="target" type="button">'],
    ['submit input', '<input id="target" type="submit">'],
    ['hidden input', '<input id="target" type="hidden">'],
    ['ordinary button', '<button id="target">Continue</button>'],
    ['generic div', '<div id="target"></div>'],
  ])('rejects a non-setting target: %s', (_label, markup) => {
    render(markup);
    expect(isSettingChangeTarget(element('#target'))).toBe(false);
  });
});
