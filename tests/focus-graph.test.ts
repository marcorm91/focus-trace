import { describe, expect, it } from 'vitest';
import { buildFocusGraph, outgoingFocusEdges } from '../lib/runtime/focus-graph';
import type { RuntimeEvent } from '../shared/types';

function focus(id: string, timestamp: number, selector: string, name: string): RuntimeEvent {
  return {
    id,
    timestamp,
    kind: 'focus',
    severity: 'info',
    title: `Focus → ${name}`,
    interactionId: 'ix-a-1',
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
    expect(outgoingFocusEdges(graph, '#search')).toEqual([
      expect.objectContaining({ from: '#search', to: '#result', count: 2 }),
    ]);
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
