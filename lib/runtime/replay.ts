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

function findingLinkedToSameTarget(
  event: RuntimeEvent,
  interactions: RuntimeInteraction[],
): RuntimeEvent | undefined {
  if (event.outcome || !event.interactionId) return undefined;
  const selector = replayTarget(event)?.selector;
  if (!selector) return undefined;
  const interaction = interactions.find((candidate) => candidate.id === event.interactionId);
  return interaction?.events.find((candidate) =>
    candidate.outcome != null && replayTarget(candidate)?.selector === selector,
  );
}

function replayEventWithLinkedFinding(
  event: RuntimeEvent,
  interactions: RuntimeInteraction[],
): RuntimeEvent {
  const finding = findingLinkedToSameTarget(event, interactions);
  if (!finding) return event;

  // Replay describes the state of the target at this step, not only the raw
  // event object. If the same interaction produced a finding for the same
  // selector, surface that finding instead of incorrectly saying "no signal".
  return {
    ...event,
    outcome: finding.outcome,
    severity: finding.severity,
    ...(finding.ruleId ? { ruleId: finding.ruleId } : {}),
    title: finding.title,
    ...(finding.detail ? { detail: finding.detail } : {}),
    ...(finding.references?.length ? { references: finding.references } : {}),
  };
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
  return events.map((event, index) => {
    const replayEvent = replayEventWithLinkedFinding(event, interactions);
    return {
      id: event.id,
      order: index + 1,
      total,
      event: replayEvent,
      phase: replayPhase(replayEvent),
      ...(replayTarget(replayEvent) ? { target: replayTarget(replayEvent) } : {}),
      ...(event.interactionId && interactionNumbers.has(event.interactionId)
        ? { interactionNumber: interactionNumbers.get(event.interactionId) }
        : {}),
      ...(replayEvent.causes?.[0] ? { cause: replayEvent.causes[0] } : {}),
    };
  });
}

export function runtimeReplayKinds(steps: RuntimeReplayStep[]): RuntimeEventKind[] {
  return [...new Set(steps.map((step) => step.event.kind))];
}
