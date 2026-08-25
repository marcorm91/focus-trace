import type {
  ElementSnapshot,
  RuntimeCause,
  RuntimeEvent,
  RuntimeEventKind,
  RuntimeInteraction,
} from '../../shared/types';

export type RuntimeReplayPhase = 'trigger' | 'focus' | 'change' | 'signal' | 'context';

export interface RuntimeReplayStep {
  id: string;
  order: number;
  total: number;
  event: RuntimeEvent;
  phase: RuntimeReplayPhase;
  target?: ElementSnapshot;
  interactionNumber?: number;
  cause?: RuntimeCause;
}

function replayPhase(event: RuntimeEvent): RuntimeReplayPhase {
  if (event.causes?.length || event.outcome) return 'signal';
  if (event.kind === 'keydown' || event.kind === 'click') return 'trigger';
  if (event.kind === 'focus' || event.kind === 'focus-lost' || event.kind === 'focus-hidden' || event.kind === 'focus-obscured') {
    return 'focus';
  }
  if (
    event.kind === 'route' ||
    event.kind === 'dom-mutation' ||
    event.kind === 'dialog-open' ||
    event.kind === 'dialog-close' ||
    event.kind === 'dialog-focus-escape' ||
    event.kind === 'live-region'
  ) {
    return 'change';
  }
  return 'context';
}

export function replayTarget(event: RuntimeEvent): ElementSnapshot | undefined {
  return event.element ?? event.mutation?.target;
}

export function buildRuntimeReplay(
  events: RuntimeEvent[],
  interactions: RuntimeInteraction[],
): RuntimeReplayStep[] {
  const interactionNumbers = new Map<string, number>();
  let correlatedIndex = 0;

  for (const interaction of interactions) {
    if (!interaction.correlated) continue;
    correlatedIndex += 1;
    interactionNumbers.set(interaction.id, correlatedIndex);
  }

  const total = events.length;
  return events.map((event, index) => ({
    id: event.id,
    order: index + 1,
    total,
    event,
    phase: replayPhase(event),
    ...(replayTarget(event) ? { target: replayTarget(event) } : {}),
    ...(event.interactionId && interactionNumbers.has(event.interactionId)
      ? { interactionNumber: interactionNumbers.get(event.interactionId) }
      : {}),
    ...(event.causes?.[0] ? { cause: event.causes[0] } : {}),
  }));
}

export function runtimeReplayKinds(steps: RuntimeReplayStep[]): RuntimeEventKind[] {
  return [...new Set(steps.map((step) => step.event.kind))];
}
