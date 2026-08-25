import { describe, expect, it } from 'vitest';
import { buildFocusJourney } from '../lib/runtime/focus-journey';
import type { RuntimeEvent } from '../shared/types';

function focus(
  id: string,
  selector: string,
  index: number,
  size = 4,
  intent: RuntimeEvent['focusIntent'] = 'forward',
): RuntimeEvent {
  return {
    id,
    timestamp: Number(id.replace(/\D/g, '')) || 1,
    kind: 'focus',
    severity: 'info',
    title: `Focus ${selector}`,
    focusIntent: intent,
    element: {
      tag: 'button',
      name: selector,
      selector,
      tabOrderIndex: index,
      tabOrderSize: size,
    },
  };
}

describe('visual focus journey', () => {
  it('classifies forward, backward, repeated and wrap transitions', () => {
    const journey = buildFocusJourney([
      focus('e1', '#one', 1),
      focus('e2', '#two', 2),
      focus('e3', '#one', 1, 4, 'backward'),
      focus('e4', '#one', 1),
      focus('e5', '#four', 4, 4, 'backward'),
      focus('e6', '#one', 1, 4, 'forward'),
    ]);

    expect(journey.steps.map((step) => step.direction)).toEqual([
      'start',
      'forward',
      'backward',
      'repeat',
      'backward',
      'wrap',
    ]);
    expect(journey).toMatchObject({
      forward: 1,
      backward: 2,
      repeated: 1,
      wraps: 1,
    });
  });

  it('marks forward skips as jumps', () => {
    const journey = buildFocusJourney([
      focus('e1', '#one', 1),
      focus('e2', '#four', 4),
    ]);
    expect(journey.steps[1]).toMatchObject({ direction: 'jump', distance: 3 });
  });

  it('falls back safely when old events do not include tab-order positions', () => {
    const events: RuntimeEvent[] = [
      { id: 'a', timestamp: 1, kind: 'focus', severity: 'info', title: 'A', element: { tag: 'a', selector: '#a' } },
      { id: 'b', timestamp: 2, kind: 'focus', severity: 'info', title: 'B', element: { tag: 'a', selector: '#b' } },
    ];
    expect(buildFocusJourney(events).steps[1]?.direction).toBe('forward');
  });
});
