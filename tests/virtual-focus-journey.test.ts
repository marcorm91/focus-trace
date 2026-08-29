import { describe, expect, it } from 'vitest';
import { buildFocusJourney } from '../lib/runtime/focus-journey';
import type { RuntimeEvent } from '../shared/types';

describe('virtual focus journey metrics', () => {
  it('keeps aria-activedescendant destinations in the journey without inflating Tab movement metrics', () => {
    const events: RuntimeEvent[] = [
      {
        id: 'dom',
        timestamp: 1,
        kind: 'focus',
        severity: 'info',
        title: 'Focus tree',
        element: { tag: 'div', role: 'tree', selector: '#tree', name: 'Files' },
      },
      {
        id: 'virtual-one',
        timestamp: 2,
        kind: 'virtual-focus',
        severity: 'info',
        title: 'Virtual focus moved',
        interactionId: 'ix-1',
        element: { tag: 'div', role: 'treeitem', selector: '#one', name: 'One' },
      },
      {
        id: 'virtual-two',
        timestamp: 3,
        kind: 'virtual-focus',
        severity: 'info',
        title: 'Virtual focus moved',
        interactionId: 'ix-2',
        element: { tag: 'div', role: 'treeitem', selector: '#two', name: 'Two' },
      },
    ];

    const journey = buildFocusJourney(events);

    expect(journey.steps).toHaveLength(3);
    expect(journey.virtual).toBe(2);
    expect(journey.forward).toBe(0);
    expect(journey.backward).toBe(0);
    expect(journey.repeated).toBe(0);
    expect(journey.wraps).toBe(0);
    expect(journey.jumps).toBe(0);
  });
});
