import { describe, expect, it } from 'vitest';
import {
  buildAuditEvidenceBundle,
  focusArrivalTraces,
  renderAuditEvidenceJson,
  renderAuditEvidenceMarkdown,
} from '../lib/runtime/audit-evidence';
import { groupRuntimeInteractions } from '../lib/runtime/causality';
import { buildFocusGraph } from '../lib/runtime/focus-graph';
import type { RuntimeEvent } from '../shared/types';

const events: RuntimeEvent[] = [
  {
    id: '1',
    timestamp: 10,
    kind: 'keydown',
    severity: 'info',
    title: 'Key: Enter',
    interactionId: 'ix-a-1',
    element: { tag: 'button', selector: '#edit', name: 'Edit profile' },
  },
  {
    id: '2',
    timestamp: 15,
    kind: 'focus',
    severity: 'info',
    title: 'Focus → Edit profile',
    interactionId: 'ix-a-1',
    element: { tag: 'button', selector: '#edit', name: 'Edit profile' },
  },
  {
    id: '3',
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
];

describe('audit evidence', () => {
  it('reconstructs the exact recorded chain that reached a focus point', () => {
    const graph = buildFocusGraph(events);
    const interactions = groupRuntimeInteractions(events);
    const node = graph.nodes[0];
    expect(node).toBeDefined();

    const traces = focusArrivalTraces(node!, interactions);
    expect(traces).toHaveLength(1);
    expect(traces[0]?.interactionId).toBe('ix-a-1');
    expect(traces[0]?.arrivalEventId).toBe('2');
    expect(traces[0]?.events.map((event) => event.id)).toEqual(['1', '2']);
    expect(traces[0]?.title).toContain('Edit profile');
  });

  it('creates deterministic JSON and readable Markdown evidence', () => {
    const graph = buildFocusGraph(events);
    const interactions = groupRuntimeInteractions(events);
    const bundle = buildAuditEvidenceBundle({
      graph,
      interactions,
      page: { title: 'Profile', url: 'https://example.test/profile' },
      generatedAt: '2026-08-24T19:30:00.000Z',
    });

    expect(bundle.summary).toMatchObject({
      focusPoints: 1,
      affectedPoints: 1,
      runtimeSignals: 1,
      interactions: 1,
    });
    expect(bundle.signals[0]).toMatchObject({
      causeType: 'FOCUSED_NODE_REMOVED',
      ruleId: 'FT-RUNTIME-001',
    });

    const markdown = renderAuditEvidenceMarkdown(bundle);
    expect(markdown).toContain('# FocusTrace accessibility evidence');
    expect(markdown).toContain('Focus was lost after an element disappeared');
    expect(markdown).toContain('not a WCAG conformance claim');

    const json = JSON.parse(renderAuditEvidenceJson(bundle)) as typeof bundle;
    expect(json.generatedAt).toBe('2026-08-24T19:30:00.000Z');
    expect(json.focusPoints[0]?.selector).toBe('#edit');
  });
});
