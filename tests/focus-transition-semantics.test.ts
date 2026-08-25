import { describe, expect, it } from 'vitest';
import { groupRuntimeInteractions } from '../lib/runtime/causality';
import { buildFocusJourney } from '../lib/runtime/focus-journey';
import { buildFocusTransitionSemantics } from '../lib/runtime/focus-transition-semantics';
import type { RuntimeEvent } from '../shared/types';

function event(
  overrides: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'kind'>,
): RuntimeEvent {
  return {
    timestamp: 1,
    severity: 'info',
    title: overrides.kind,
    ...overrides,
  };
}

function focus(
  id: string,
  selector: string,
  tabOrderIndex: number,
  overrides: Partial<RuntimeEvent> = {},
): RuntimeEvent {
  return event({
    id,
    kind: 'focus',
    focusIntent: 'forward',
    element: {
      tag: 'button',
      selector,
      name: selector.replace('#', ''),
      tabOrderIndex,
      tabOrderSize: 6,
    },
    ...overrides,
  });
}

function semantics(events: RuntimeEvent[]) {
  const interactions = groupRuntimeInteractions(events);
  const journey = buildFocusJourney(events);
  return buildFocusTransitionSemantics(events, interactions, journey);
}

describe('focus transition semantics', () => {
  it('distinguishes intentional backward navigation from an unexpected forward jump', () => {
    const events = [
      focus('f1', '#one', 1, { timestamp: 10 }),
      focus('f2', '#four', 4, { timestamp: 20, interactionId: 'ix-jump' }),
      focus('f3', '#three', 3, {
        timestamp: 30,
        interactionId: 'ix-back',
        focusIntent: 'backward',
      }),
    ];

    const result = semantics(events);

    expect(result.find((item) => item.kind === 'unexpected-jump')?.eventIds).toContain('f2');
    expect(result.find((item) => item.kind === 'unexpected-jump')?.tone).toBe('review');
    expect(result.find((item) => item.kind === 'backward-navigation')?.eventIds).toContain('f3');
    expect(result.find((item) => item.kind === 'backward-navigation')?.tone).toBe('neutral');
  });

  it('recognizes focus restoration to the control that opened a dialog', () => {
    const events: RuntimeEvent[] = [
      event({
        id: 'open-key',
        kind: 'keydown',
        timestamp: 10,
        interactionId: 'ix-open',
        title: 'Key: Enter',
        element: { tag: 'button', selector: '#settings', name: 'Settings' },
      }),
      focus('inside', '#dialog-close', 2, {
        timestamp: 20,
        interactionId: 'ix-open',
        focusIntent: 'programmatic',
      }),
      event({
        id: 'dialog-open',
        kind: 'dialog-open',
        timestamp: 25,
        interactionId: 'ix-open',
        element: { tag: 'div', selector: '#dialog', role: 'dialog', name: 'Settings dialog' },
      }),
      event({
        id: 'escape',
        kind: 'keydown',
        timestamp: 100,
        interactionId: 'ix-close',
        title: 'Key: Escape',
        element: { tag: 'button', selector: '#dialog-close', name: 'Close' },
      }),
      event({
        id: 'dialog-close',
        kind: 'dialog-close',
        timestamp: 110,
        interactionId: 'ix-close',
        element: { tag: 'div', selector: '#dialog', role: 'dialog', name: 'Settings dialog' },
      }),
      focus('restored', '#settings', 1, {
        timestamp: 120,
        interactionId: 'ix-close',
        focusIntent: 'programmatic',
      }),
    ];

    const result = semantics(events);
    const restored = result.find((item) => item.kind === 'focus-restored');
    const entered = result.find((item) => item.kind === 'entered-dialog');

    expect(restored?.tone).toBe('positive');
    expect(restored?.eventIds).toEqual(expect.arrayContaining(['dialog-close', 'restored']));
    expect(restored?.trigger?.selector).toBe('#settings');
    expect(entered?.eventIds).toEqual(expect.arrayContaining(['dialog-open', 'inside']));
  });

  it('marks a dialog close that ends somewhere else as focus not restored', () => {
    const events: RuntimeEvent[] = [
      event({
        id: 'open-click',
        kind: 'click',
        timestamp: 10,
        interactionId: 'ix-open',
        element: { tag: 'button', selector: '#open', name: 'Open' },
      }),
      event({
        id: 'dialog-open',
        kind: 'dialog-open',
        timestamp: 20,
        interactionId: 'ix-open',
        element: { tag: 'div', selector: '#dialog', role: 'dialog' },
      }),
      event({
        id: 'dialog-close',
        kind: 'dialog-close',
        timestamp: 100,
        interactionId: 'ix-close',
        element: { tag: 'div', selector: '#dialog', role: 'dialog' },
      }),
      focus('wrong-focus', '#toolbar', 3, {
        timestamp: 120,
        interactionId: 'ix-close',
        focusIntent: 'programmatic',
      }),
      event({
        id: 'restore-review',
        kind: 'dialog-close',
        timestamp: 150,
        interactionId: 'ix-close',
        outcome: 'review',
        element: { tag: 'button', selector: '#toolbar', name: 'Toolbar' },
      }),
    ];

    const result = semantics(events);
    const notRestored = result.find((item) => item.kind === 'focus-not-restored');

    expect(notRestored?.tone).toBe('review');
    expect(notRestored?.eventIds).toEqual(
      expect.arrayContaining(['dialog-close', 'restore-review', 'wrong-focus']),
    );
    expect(notRestored?.to?.selector).toBe('#toolbar');
  });

  it('labels handled and unhandled SPA focus transitions', () => {
    const handled: RuntimeEvent[] = [
      event({
        id: 'route-a',
        kind: 'route',
        timestamp: 10,
        interactionId: 'ix-route',
        fromUrl: '/a',
        toUrl: '/b',
      }),
      focus('route-focus', '#page-title', 1, {
        timestamp: 120,
        interactionId: 'ix-route',
        focusIntent: 'programmatic',
      }),
    ];

    const unhandled: RuntimeEvent[] = [
      focus('old-focus', '#old-link', 2, { timestamp: 1 }),
      event({
        id: 'route-b',
        kind: 'route',
        timestamp: 10,
        interactionId: 'ix-route',
        fromUrl: '/a',
        toUrl: '/b',
      }),
      event({
        id: 'route-review',
        kind: 'route',
        timestamp: 360,
        interactionId: 'ix-route',
        fromUrl: '/a',
        toUrl: '/b',
        outcome: 'review',
        element: { tag: 'a', selector: '#old-link', name: 'Old link' },
        causes: [{
          type: 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE',
          confidence: 'deterministic',
          summary: 'No focus move.',
        }],
      }),
    ];

    expect(semantics(handled).find((item) => item.kind === 'spa-focus-handled')?.tone).toBe('positive');
    expect(semantics(unhandled).find((item) => item.kind === 'spa-focus-left-behind')?.tone).toBe('review');
  });

  it('detects a repeated focus cycle without treating it as a failure', () => {
    const events = [
      focus('a1', '#a', 1, { timestamp: 10 }),
      focus('b1', '#b', 2, { timestamp: 20 }),
      focus('a2', '#a', 1, { timestamp: 30, focusIntent: 'backward' }),
      focus('b2', '#b', 2, { timestamp: 40 }),
    ];

    const loop = semantics(events).find((item) => item.kind === 'loop-detected');

    expect(loop?.tone).toBe('neutral');
    expect(loop?.eventIds).toContain('b2');
    expect(loop?.cycle).toEqual(['a', 'b']);
  });

  it('links focus loss back to the last recorded focus point', () => {
    const events: RuntimeEvent[] = [
      focus('focused', '#remove-me', 2, { timestamp: 10 }),
      event({
        id: 'lost',
        kind: 'focus-lost',
        timestamp: 20,
        outcome: 'review',
        element: { tag: 'button', selector: '#remove-me', name: 'Remove me' },
      }),
    ];

    const lost = semantics(events).find((item) => item.kind === 'focus-lost');
    expect(lost?.eventIds).toEqual(expect.arrayContaining(['focused', 'lost']));
  });
});
