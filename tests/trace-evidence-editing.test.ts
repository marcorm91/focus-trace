import { describe, expect, it } from 'vitest';
import { isManualTraceInteractionId } from '../lib/runtime/trace-evidence-editing';
import type { RuntimeEvent } from '../shared/types';

function runtimeEvent(
  id: string,
  timestamp: number,
  overrides: Partial<RuntimeEvent> = {},
): RuntimeEvent {
  return {
    id,
    timestamp,
    kind: 'focus',
    severity: 'info',
    title: id,
    ...overrides,
  };
}

describe('Trace evidence editing', () => {
  it('protects automatic focus-walk interactions from deletion', () => {
    const events: RuntimeEvent[] = [
      runtimeEvent('walk-start', 1, { kind: 'focus-walk-start' }),
      runtimeEvent('auto-key', 2, { kind: 'keydown', interactionId: 'auto-1' }),
      runtimeEvent('auto-focus', 3, { interactionId: 'auto-1' }),
      runtimeEvent('walk-end', 4, { kind: 'focus-walk-end' }),
      runtimeEvent('manual-click', 10, { kind: 'click', interactionId: 'manual-1' }),
    ];

    expect(isManualTraceInteractionId(events, 'auto-1')).toBe(false);
    expect(isManualTraceInteractionId(events, 'manual-1')).toBe(true);
  });

  it('ends the automatic interval at a breakpoint so resumed manual Trace stays editable', () => {
    const events: RuntimeEvent[] = [
      runtimeEvent('walk-start', 1, { kind: 'focus-walk-start' }),
      runtimeEvent('auto-key', 2, { kind: 'keydown', interactionId: 'auto-1' }),
      runtimeEvent('breakpoint', 3, {
        kind: 'focus-lost',
        interactionId: 'auto-1',
        breakpointHits: [{
          breakpointId: 'focused-node-removed',
          causeType: 'FOCUSED_NODE_REMOVED',
          eventId: 'breakpoint',
          timestamp: 3,
          label: 'Focused node removed',
          summary: 'Focused node was removed.',
          interactionId: 'auto-1',
        }],
      }),
      runtimeEvent('manual-click', 10, { kind: 'click', interactionId: 'manual-after-breakpoint' }),
    ];

    expect(isManualTraceInteractionId(events, 'auto-1')).toBe(false);
    expect(isManualTraceInteractionId(events, 'manual-after-breakpoint')).toBe(true);
  });
});
