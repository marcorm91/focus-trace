import type { RuntimeEvent, RuntimeInteraction } from '../../shared/types';

interface FocusWalkInterval {
  startedAt: number;
  endedAt: number;
}

function focusWalkIntervals(events: RuntimeEvent[]): FocusWalkInterval[] {
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
    }
  }

  if (startedAt != null) intervals.push({ startedAt, endedAt: Number.POSITIVE_INFINITY });
  return intervals;
}

export function isManualTraceInteraction(
  interaction: RuntimeInteraction,
  events: RuntimeEvent[],
): boolean {
  if (!interaction.correlated) return false;
  return !focusWalkIntervals(events).some(
    (interval) => interaction.startedAt >= interval.startedAt && interaction.startedAt <= interval.endedAt,
  );
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
