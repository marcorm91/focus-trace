import { describe, expect, it } from 'vitest';
import {
  createRuntimeBreakpointHits,
  defaultRuntimeBreakpointSettings,
  enabledBreakpointsForCauses,
  normalizeRuntimeBreakpointSettings,
} from '../lib/runtime/breakpoints';
import { groupRuntimeInteractions } from '../lib/runtime/causality';
import type { RuntimeCause, RuntimeEvent } from '../shared/types';

const focusedRemoved: RuntimeCause = {
  type: 'FOCUSED_NODE_REMOVED',
  confidence: 'deterministic',
  summary: 'Focused node was removed.',
};

const bodyFallback: RuntimeCause = {
  type: 'FOCUS_FELL_BACK_TO_BODY',
  confidence: 'deterministic',
  summary: 'Focus fell back to body.',
};

describe('runtime accessibility breakpoints', () => {
  it('enables high-signal breakpoints by default and leaves SPA focus paused opt-in', () => {
    const settings = defaultRuntimeBreakpointSettings();
    expect(settings['focused-node-removed']).toBe(true);
    expect(settings['focus-fell-back-to-body']).toBe(true);
    expect(settings['dialog-opened-without-focus']).toBe(true);
    expect(settings['modal-focus-escape']).toBe(true);
    expect(settings['focused-element-became-hidden']).toBe(true);
    expect(settings['route-changed-without-focus-move']).toBe(false);
  });

  it('normalizes partial or legacy session settings against current defaults', () => {
    const settings = normalizeRuntimeBreakpointSettings({
      'focused-node-removed': false,
      'route-changed-without-focus-move': true,
    });
    expect(settings['focused-node-removed']).toBe(false);
    expect(settings['route-changed-without-focus-move']).toBe(true);
    expect(settings['modal-focus-escape']).toBe(true);
  });

  it('matches only enabled breakpoints for recorded deterministic causes', () => {
    const settings = defaultRuntimeBreakpointSettings();
    settings['focus-fell-back-to-body'] = false;
    const matches = enabledBreakpointsForCauses([focusedRemoved, bodyFallback], settings);
    expect(matches.map((match) => match.id)).toEqual(['focused-node-removed']);
  });

  it('creates hit metadata tied to the exact event and interaction', () => {
    const hits = createRuntimeBreakpointHits({
      causes: [focusedRemoved, bodyFallback],
      settings: defaultRuntimeBreakpointSettings(),
      eventId: 'event-1',
      timestamp: 1234,
      interactionId: 'ix-test-1',
    });

    expect(hits.map((hit) => hit.breakpointId)).toEqual([
      'focused-node-removed',
      'focus-fell-back-to-body',
    ]);
    expect(hits[0]).toEqual(expect.objectContaining({
      eventId: 'event-1',
      timestamp: 1234,
      interactionId: 'ix-test-1',
      causeType: 'FOCUSED_NODE_REMOVED',
    }));
  });

  it('keeps breakpoint hits attached when events are grouped into a causal interaction', () => {
    const hits = createRuntimeBreakpointHits({
      causes: [focusedRemoved],
      settings: defaultRuntimeBreakpointSettings(),
      eventId: 'event-2',
      timestamp: 200,
      interactionId: 'ix-test-2',
    });
    const event: RuntimeEvent = {
      id: 'event-2',
      timestamp: 200,
      kind: 'focus-lost',
      severity: 'serious',
      title: 'Focused element removed',
      interactionId: 'ix-test-2',
      causes: [focusedRemoved],
      breakpointHits: hits,
      outcome: 'review',
    };

    const [interaction] = groupRuntimeInteractions([event]);
    expect(interaction?.breakpointHits).toHaveLength(1);
    expect(interaction?.breakpointHits[0]?.breakpointId).toBe('focused-node-removed');
  });
});
