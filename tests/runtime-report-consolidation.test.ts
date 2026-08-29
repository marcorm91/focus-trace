import { describe, expect, it } from 'vitest';
import { buildSessionReportModel } from '../lib/report/session-report';
import type { RuntimeCauseType, RuntimeEvent } from '../shared/types';

function runtimeFinding(
  id: string,
  timestamp: number,
  selector: string,
  causeType: RuntimeCauseType = 'FOCUSED_NODE_REMOVED',
): RuntimeEvent {
  return {
    id,
    timestamp,
    kind: 'focus-lost',
    severity: 'serious',
    title: 'Focus was lost after an element disappeared',
    detail: 'The focused element disappeared from the rendered page.',
    outcome: 'review',
    ruleId: 'FT-RUNTIME-001',
    element: {
      tag: 'button',
      role: 'button',
      name: 'Continue',
      selector,
    },
    causes: [{
      type: causeType,
      confidence: 'deterministic',
      summary: causeType,
    }],
    references: [],
  };
}

describe('runtime report consolidation', () => {
  it('counts repeated evidence without duplicating the same report finding', () => {
    const events = [
      runtimeFinding('event-1', 100, '#continue'),
      runtimeFinding('event-2', 300, '#continue'),
      runtimeFinding('event-3', 500, '#continue'),
    ];

    const model = buildSessionReportModel(undefined, events, 'en');

    expect(model.runtimeFindings).toBe(1);
    expect(model.runtimeOccurrences).toBe(3);
    expect(model.traceStories).toHaveLength(1);
    expect(model.traceStories[0]).toMatchObject({
      occurrenceCount: 3,
      firstDetectedAt: 100,
      lastDetectedAt: 500,
      selector: '#continue',
    });
    expect(model.traceStories[0]?.occurrences.map((occurrence) => occurrence.id)).toEqual([
      'event-1',
      'event-2',
      'event-3',
    ]);
  });

  it('keeps the same rule as separate findings when different components are affected', () => {
    const model = buildSessionReportModel(undefined, [
      runtimeFinding('event-1', 100, '#login-submit'),
      runtimeFinding('event-2', 200, '#checkout-submit'),
    ], 'en');

    expect(model.runtimeFindings).toBe(2);
    expect(model.runtimeOccurrences).toBe(2);
    expect(model.traceStories.map((story) => story.selector)).toEqual([
      '#login-submit',
      '#checkout-submit',
    ]);
  });

  it('does not collapse distinct deterministic causes on the same component', () => {
    const model = buildSessionReportModel(undefined, [
      runtimeFinding('event-1', 100, '#continue', 'FOCUSED_NODE_REMOVED'),
      runtimeFinding('event-2', 200, '#continue', 'FOCUSED_ELEMENT_BECAME_HIDDEN'),
    ], 'en');

    expect(model.runtimeFindings).toBe(2);
    expect(model.runtimeOccurrences).toBe(2);
    expect(model.traceStories).toHaveLength(2);
  });
});
