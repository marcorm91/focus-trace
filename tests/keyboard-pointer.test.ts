// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  createKeyboardTrapReviewEvent,
  createPointerCancellationReviewEvent,
  KeyboardTrapTracker,
  keyboardOperabilityReviewForPointerAction,
  observedPointerActionTarget,
  PointerCancellationTracker,
} from '../lib/runtime/keyboard-pointer';
import type { ElementSnapshot } from '../shared/types';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html><body>${body}</body></html>`);
  document.close();
}

function snap(selector: string): ElementSnapshot {
  return { tag: 'button', selector, name: selector };
}

describe('keyboard and pointer runtime reviews', () => {
  it('reviews a trusted-pointer custom action only when the observed target is not keyboard reachable', () => {
    render('<div id="action" role="button">Action</div><div id="reachable" role="button" tabindex="0">Reachable</div><button id="native">Native</button>');
    const action = document.querySelector('#action')!;
    const reachable = document.querySelector('#reachable')!;
    const native = document.querySelector('#native')!;

    expect(observedPointerActionTarget(action)).toBe(action);
    expect(keyboardOperabilityReviewForPointerAction(action, snap('#action'))).toMatchObject({
      ruleId: 'FT-RUNTIME-011',
      outcome: 'review',
    });
    expect(keyboardOperabilityReviewForPointerAction(reachable, snap('#reachable'))).toBeUndefined();
    expect(keyboardOperabilityReviewForPointerAction(native, snap('#native'))).toBeUndefined();
  });

  it('detects a repeated two-target Tab cycle only when more focus targets exist outside the cycle', () => {
    const tracker = new KeyboardTrapTracker();
    const inputs = ['#a', '#b', '#a', '#b'].map((selector) => ({
      selector,
      element: snap(selector),
      direction: 'forward' as const,
      tabOrderSize: 5,
      inModal: false,
    }));

    const observations = inputs.map((input) => tracker.recordFocus(input)).filter(Boolean);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      kind: 'cycle',
      selectors: ['#a', '#b'],
      tabOrderSize: 5,
    });
    expect(createKeyboardTrapReviewEvent(observations[0]!)).toMatchObject({
      ruleId: 'FT-RUNTIME-012',
      outcome: 'review',
    });
  });

  it('does not report normal full-order wrapping or modal focus containment as a keyboard trap', () => {
    const fullOrder = new KeyboardTrapTracker();
    for (const selector of ['#a', '#b', '#a', '#b']) {
      expect(fullOrder.recordFocus({
        selector,
        element: snap(selector),
        direction: 'forward',
        tabOrderSize: 2,
        inModal: false,
      })).toBeUndefined();
    }

    const modal = new KeyboardTrapTracker();
    for (const selector of ['#a', '#b', '#a', '#b']) {
      expect(modal.recordFocus({
        selector,
        element: snap(selector),
        direction: 'forward',
        tabOrderSize: 5,
        inModal: true,
      })).toBeUndefined();
    }
  });

  it('reviews repeated Tab attempts that leave focus unchanged when other targets exist', () => {
    const tracker = new KeyboardTrapTracker();
    const input = {
      selector: '#stuck',
      element: snap('#stuck'),
      direction: 'forward' as const,
      tabOrderSize: 4,
      inModal: false,
    };
    expect(tracker.recordNoMove(input)).toBeUndefined();
    expect(tracker.recordNoMove(input)).toMatchObject({ kind: 'no-move', selectors: ['#stuck'] });
  });

  it('reports activation-like state that changes between pointer-down and pointer-up', () => {
    render('<button id="toggle" aria-expanded="false">Toggle</button>');
    const button = document.querySelector<HTMLButtonElement>('#toggle')!;
    const tracker = new PointerCancellationTracker();
    tracker.start(1, button, snap('#toggle'), 'https://example.test/start');
    button.setAttribute('aria-expanded', 'true');

    const observation = tracker.finish(1, 'up', 'https://example.test/start');
    expect(observation?.changes).toContain('aria-expanded changed before pointer release');
    expect(createPointerCancellationReviewEvent(observation!)).toMatchObject({
      ruleId: 'FT-RUNTIME-013',
      outcome: 'review',
    });
  });

  it('does not report pointer cancellation when no activation-like evidence changed before release', () => {
    render('<button id="safe" aria-expanded="false">Safe</button>');
    const button = document.querySelector<HTMLButtonElement>('#safe')!;
    const tracker = new PointerCancellationTracker();
    tracker.start(7, button, snap('#safe'), 'https://example.test/start');
    expect(tracker.finish(7, 'up', 'https://example.test/start')).toBeUndefined();
  });

  it('captures changes that already happened before a pointercancel event', () => {
    render('<div id="custom" role="button" aria-pressed="false"></div>');
    const custom = document.querySelector('#custom')!;
    const tracker = new PointerCancellationTracker();
    tracker.start(9, custom, snap('#custom'), 'https://example.test/start');
    custom.setAttribute('aria-pressed', 'true');
    expect(tracker.finish(9, 'cancel', 'https://example.test/start')).toMatchObject({
      phase: 'cancel',
      changes: ['aria-pressed changed before pointer cancellation'],
    });
  });
});
