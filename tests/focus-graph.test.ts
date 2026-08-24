import { describe, expect, it } from 'vitest';
import {
  buildFocusGraph,
  buildObservedFocusPath,
  outgoingFocusEdges,
} from '../lib/runtime/focus-graph';
import type { RuntimeEvent } from '../shared/types';

function focus(id: string, timestamp: number, selector: string, name: string, interactionId = 'ix-a-1'): RuntimeEvent {
  return {
    id,
    timestamp,
    kind: 'focus',
    severity: 'info',
    title: `Focus → ${name}`,
    interactionId,
    element: { tag: 'button', selector, name },
  };
}

describe('focus graph', () => {
  it('builds unique focus nodes and directed observed transitions', () => {
    const graph = buildFocusGraph([
      focus('1', 10, '#search', 'Search'),
      focus('2', 20, '#result', 'Result'),
      focus('3', 30, '#search', 'Search'),
      focus('4', 40, '#result', 'Result'),
    ]);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.transitions).toBe(3);
    expect(graph.repeatedTransitions).toBe(1);
    expect(graph.nodes.find((node) => node.id === '#search')?.visits).toBe(2);
    expect(graph.nodes.find((node) => node.id === '#search')?.focusOrders).toEqual([1, 3]);
    expect(graph.nodes.find((node) => node.id === '#result')?.focusOrders).toEqual([2, 4]);
    expect(outgoingFocusEdges(graph, '#search')).toEqual([
      expect.objectContaining({ from: '#search', to: '#result', count: 2 }),
    ]);
  });

  it('keeps chronological page-overlay positions when a focus destination is revisited', () => {
    const path = buildObservedFocusPath([
      focus('1', 10, '#search', 'Search'),
      focus('2', 20, '#result', 'Result'),
      { id: 'click', timestamp: 25, kind: 'click', severity: 'info', title: 'Click' },
      focus('3', 30, '#search', 'Search'),
      focus('4', 40, '#submit', 'Submit'),
    ]);

    expect(path.map((target) => target.id)).toEqual(['#search', '#result', '#submit']);
    expect(path.find((target) => target.id === '#search')?.orders).toEqual([1, 3]);
    expect(path.find((target) => target.id === '#result')?.orders).toEqual([2]);
    expect(path.find((target) => target.id === '#submit')?.orders).toEqual([4]);
  });

  it('keeps source focus-event and interaction ids for audit traceability', () => {
    const graph = buildFocusGraph([
      focus('1', 10, '#search', 'Search', 'ix-a-1'),
      focus('2', 20, '#result', 'Result', 'ix-a-1'),
      focus('3', 30, '#result', 'Result', 'ix-a-2'),
    ]);

    const result = graph.nodes.find((node) => node.id === '#result');
    expect(result?.focusEventIds).toEqual(['2', '3']);
    expect(result?.interactionIds).toEqual(['ix-a-1', 'ix-a-2']);
  });

  it('attaches runtime causes to affected focus nodes without inventing unreachable controls', () => {
    const graph = buildFocusGraph([
      focus('1', 10, '#edit', 'Edit profile'),
      {
        id: '2',
        timestamp: 20,
        kind: 'focus-lost',
        severity: 'serious',
        title: 'Focused element removed',
        interactionId: 'ix-a-1',
        outcome: 'review',
        ruleId: 'FT-RUNTIME-001',
        element: { tag: 'button', selector: '#edit', name: 'Edit profile' },
        causes: [{
          type: 'FOCUSED_NODE_REMOVED',
          confidence: 'deterministic',
          summary: 'Focused node was removed.',
        }],
      },
    ]);

    expect(graph.observations).toEqual([
      expect.objectContaining({ causeType: 'FOCUSED_NODE_REMOVED', nodeId: '#edit' }),
    ]);
    expect(graph.affectedNodes).toBe(1);
    expect(graph.nodes[0]?.issueCount).toBe(1);
  });

  it('ignores non-focus activity when building transitions', () => {
    const graph = buildFocusGraph([
      { id: '1', timestamp: 10, kind: 'click', severity: 'info', title: 'Click' },
      { id: '2', timestamp: 20, kind: 'live-region', severity: 'info', title: 'Live region updated' },
    ]);

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.focusEvents).toBe(0);
  });
});
