import type { RuntimeEvent, RuntimeEventKind } from '../../shared/types';
import type { GuidedEvidence } from './framework';

const MAX_RUNTIME_EVIDENCE = 2;

const EVENT_KINDS_BY_TEST: Record<string, RuntimeEventKind[]> = {
  'FT-GUIDED-002': [
    'keydown',
    'click',
    'focus',
    'focus-lost',
    'focus-walk-start',
    'focus-walk-end',
  ],
  'FT-GUIDED-003': [
    'focus',
    'virtual-focus',
    'focus-hidden',
    'focus-obscured',
    'focus-lost',
    'dialog-open',
    'dialog-close',
    'dialog-focus-escape',
  ],
  'FT-GUIDED-004': [
    'keydown',
    'focus',
    'dialog-open',
    'dialog-close',
    'dialog-focus-escape',
  ],
};

function eventSummary(event: RuntimeEvent): string {
  const target = event.element?.selector ? ` @ ${event.element.selector}` : '';
  const outcome = event.outcome ? ` [${event.outcome}]` : '';
  return `${event.kind}: ${event.title}${target}${outcome}`;
}

export function hasGuidedRuntimeEvidence(testId: string): boolean {
  return Boolean(EVENT_KINDS_BY_TEST[testId]?.length);
}

export function guidedRuntimeEvidence(
  events: RuntimeEvent[],
  testId: string,
  startedAt: number,
  now = Date.now(),
): GuidedEvidence[] {
  const allowed = EVENT_KINDS_BY_TEST[testId];
  if (!allowed) return [];

  return events
    .filter((event) => event.timestamp >= startedAt && event.timestamp <= now && allowed.includes(event.kind))
    .slice(-MAX_RUNTIME_EVIDENCE)
    .map((event) => ({
      kind: 'runtime-observation' as const,
      label: 'Observed runtime event',
      value: eventSummary(event),
      capturedAt: event.timestamp,
    }));
}
