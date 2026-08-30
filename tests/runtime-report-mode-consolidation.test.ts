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
    element: { tag: 'button', role: 'button', name: 'Continue', selector },
    causes: [{ type: causeType, confidence: 'deterministic', summary: causeType }],
    references: [],
  };
}

function interactionFinding(
  interactionId: string,
  triggerId: string,
  findingId: string,
  timestamp: number,
  selector = '#continue',
): RuntimeEvent[] {
  return [
    {
      id: triggerId,
      timestamp,
      kind: 'keydown',
      severity: 'info',
      title: 'Tab key pressed',
      interactionId,
      element: { tag: 'button', selector, name: 'Continue' },
    },
    {
      ...runtimeFinding(findingId, timestamp + 10, selector),
      interactionId,
    },
  ];
}

describe('runtime report execution-mode consolidation', () => {
  it('consolidates the same rule and cause even when the runtime event kind differs', () => {
    const first = runtimeFinding('event-1', 100, '#continue');
    const second: RuntimeEvent = {
      ...runtimeFinding('event-2', 200, '#continue'),
      kind: 'focus-hidden',
    };

    const model = buildSessionReportModel(undefined, [first, second], 'en');

    expect(model.runtimeFindings).toBe(1);
    expect(model.runtimeOccurrences).toBe(2);
    expect(model.traceStories).toHaveLength(1);
  });

  it('collapses repeated manual and automatic encounters into one report story', () => {
    const events: RuntimeEvent[] = [
      ...interactionFinding('manual-1', 'manual-trigger', 'manual-finding', 100),
      {
        id: 'walk-start',
        timestamp: 200,
        kind: 'focus-walk-start',
        severity: 'info',
        title: 'Automatic focus walk started',
      },
      ...interactionFinding('automatic-1', 'automatic-trigger', 'automatic-finding', 210),
      {
        id: 'walk-end',
        timestamp: 240,
        kind: 'focus-walk-end',
        severity: 'info',
        title: 'Automatic focus walk ended',
      },
    ];

    const model = buildSessionReportModel(undefined, events, 'en');

    expect(model.runtimeFindings).toBe(1);
    expect(model.runtimeOccurrences).toBe(2);
    expect(model.manualTraceInteractions).toBe(1);
    expect(model.automaticTraceInteractions).toBe(1);
    expect(model.traceStories).toHaveLength(1);
    expect(model.traceStories[0]).toMatchObject({
      occurrenceCount: 2,
      modes: ['manual', 'automatic'],
    });
    expect(model.traceStories[0]?.trigger.startsWith('Manual + Automatic · ')).toBe(true);
    expect(model.traceStories[0]?.occurrences.map((occurrence) => occurrence.mode)).toEqual([
      'manual',
      'automatic',
    ]);
    expect(model.traceStories[0]?.occurrences[0]?.trigger.startsWith('Manual · ')).toBe(true);
    expect(model.traceStories[0]?.occurrences[1]?.trigger.startsWith('Automatic · ')).toBe(true);
  });

  it('marks uncorrelated findings as session signals instead of pretending they are manual actions', () => {
    const model = buildSessionReportModel(undefined, [
      runtimeFinding('event-1', 100, '#continue'),
    ], 'en');

    expect(model.traceStories[0]?.modes).toEqual(['ambient']);
    expect(model.traceStories[0]?.trigger.startsWith('Session signal · ')).toBe(true);
  });

  it('treats virtual focus as focus coverage for report suggestions', () => {
    const virtualFocus: RuntimeEvent = {
      id: 'virtual-focus',
      timestamp: 100,
      kind: 'virtual-focus',
      severity: 'info',
      title: 'Virtual focus moved',
    };

    const model = buildSessionReportModel(undefined, [virtualFocus], 'en');

    expect(model.suggestions.some((suggestion) => suggestion.id === 'coverage-focus')).toBe(false);
  });
});
