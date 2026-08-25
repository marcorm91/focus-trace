import { describe, expect, it } from 'vitest';
import { buildRuntimeReplay, replayTarget, runtimeReplayKinds } from '../lib/runtime/replay';
import type { RuntimeEvent, RuntimeInteraction } from '../shared/types';

function event(overrides: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'kind'>): RuntimeEvent {
  return {
    timestamp: 1,
    severity: 'info',
    title: overrides.kind,
    ...overrides,
  };
}

describe('runtime replay', () => {
  it('keeps event order and maps correlated interaction numbers', () => {
    const events: RuntimeEvent[] = [
      event({ id: 'e1', kind: 'keydown', interactionId: 'ix-a' }),
      event({
        id: 'e2',
        kind: 'focus',
        interactionId: 'ix-a',
        element: { tag: 'button', selector: '#save', name: 'Save' },
      }),
      event({ id: 'e3', kind: 'route', interactionId: 'ix-b', fromUrl: '/a', toUrl: '/b' }),
    ];
    const interactions = [
      { id: 'ambient:1', correlated: false, startedAt: 0, endedAt: 0, events: [], findings: 0, causes: [], breakpointHits: [] },
      { id: 'ix-a', correlated: true, startedAt: 0, endedAt: 1, events: events.slice(0, 2), findings: 0, causes: [], breakpointHits: [] },
      { id: 'ix-b', correlated: true, startedAt: 2, endedAt: 3, events: events.slice(2), findings: 0, causes: [], breakpointHits: [] },
    ] satisfies RuntimeInteraction[];

    const replay = buildRuntimeReplay(events, interactions);

    expect(replay.map((step) => step.order)).toEqual([1, 2, 3]);
    expect(replay.map((step) => step.interactionNumber)).toEqual([1, 1, 2]);
    expect(replay[0]?.phase).toBe('trigger');
    expect(replay[1]?.phase).toBe('focus');
    expect(replay[2]?.phase).toBe('change');
  });

  it('prioritizes findings as signal steps and exposes mutation targets', () => {
    const mutationTarget = { tag: 'div', selector: '#dialog', role: 'dialog', name: 'Settings' };
    const finding = event({
      id: 'e1',
      kind: 'dialog-open',
      outcome: 'review',
      mutation: { kind: 'node-added', target: mutationTarget },
      causes: [{ type: 'DIALOG_OPENED_WITHOUT_FOCUS', confidence: 'deterministic', summary: 'Dialog opened without focus.' }],
    });

    const [step] = buildRuntimeReplay([finding], []);

    expect(step?.phase).toBe('signal');
    expect(step?.cause?.type).toBe('DIALOG_OPENED_WITHOUT_FOCUS');
    expect(step?.target).toEqual(mutationTarget);
    expect(replayTarget(finding)).toEqual(mutationTarget);
  });

  it('reports the runtime event kinds represented in the replay', () => {
    const replay = buildRuntimeReplay([
      event({ id: 'e1', kind: 'focus' }),
      event({ id: 'e2', kind: 'focus' }),
      event({ id: 'e3', kind: 'route' }),
    ], []);

    expect(runtimeReplayKinds(replay)).toEqual(['focus', 'route']);
  });
});
