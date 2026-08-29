import type { RuntimeEvent, RuntimeInteraction } from '../../shared/types';

export interface FocusWalkInterval {
  startedAt: number;
  endedAt: number;
}

export function focusWalkIntervals(events: RuntimeEvent[]): FocusWalkInterval[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const intervals: FocusWalkInterval[] = [];
  let startedAt: number | undefined;

  for (const event of sorted) {
    if (event.kind === 'focus-walk-start') {
      startedAt = event.timestamp;
      continue;
    }
    if (event.kind === 'focus-walk-end' && startedAt != null) {
      intervals.push({ startedAt, endedAt: event.timestamp });
      startedAt = undefined;
      continue;
    }
    if (startedAt != null && event.breakpointHits?.length) {
      // A breakpoint stops runtime instrumentation immediately, so the normal
      // focus-walk-end event cannot be persisted. Treat the breakpoint event
      // as the effective end of the automatic interval. Otherwise a manual
      // Trace resumed afterwards would be incorrectly classified as automatic
      // and its interactions could not be removed by the user.
      intervals.push({ startedAt, endedAt: event.timestamp });
      startedAt = undefined;
    }
  }

  if (startedAt != null) intervals.push({ startedAt, endedAt: Number.POSITIVE_INFINITY });
  return intervals;
}

export function timestampInsideAutomaticFocusWalk(timestamp: number, events: RuntimeEvent[]): boolean {
  return focusWalkIntervals(events).some(
    (interval) => timestamp >= interval.startedAt && timestamp <= interval.endedAt,
  );
}

export function isManualTraceInteractionId(events: RuntimeEvent[], interactionId: string): boolean {
  if (!interactionId) return false;
  const matching = events.filter((event) => event.interactionId === interactionId);
  if (!matching.length) return false;
  const startedAt = Math.min(...matching.map((event) => event.timestamp));
  return !timestampInsideAutomaticFocusWalk(startedAt, events);
}

export function isManualTraceInteraction(
  interaction: RuntimeInteraction,
  events: RuntimeEvent[],
): boolean {
  if (!interaction.correlated) return false;
  return isManualTraceInteractionId(events, interaction.id);
}

export function deletableManualInteractionIds(
  interactions: RuntimeInteraction[],
  events: RuntimeEvent[],
): Set<string> {
  return new Set(
    interactions
      .filter((interaction) => isManualTraceInteraction(interaction, events))
      .map((interaction) => interaction.id),
  );
}
