import type { ElementSnapshot, RuntimeEvent } from '../../shared/types';

export type FocusJourneyDirection =
  | 'start'
  | 'forward'
  | 'backward'
  | 'repeat'
  | 'wrap'
  | 'jump';

export interface FocusJourneyStep {
  id: string;
  order: number;
  event: RuntimeEvent;
  element: ElementSnapshot;
  mode: 'dom' | 'virtual';
  direction: FocusJourneyDirection;
  distance?: number;
}

export interface FocusJourney {
  steps: FocusJourneyStep[];
  forward: number;
  backward: number;
  repeated: number;
  wraps: number;
  jumps: number;
  virtual: number;
}

function movementDirection(
  previous: ElementSnapshot,
  current: ElementSnapshot,
  intent: RuntimeEvent['focusIntent'],
): { direction: FocusJourneyDirection; distance?: number } {
  if (previous.selector === current.selector) return { direction: 'repeat', distance: 0 };

  const previousIndex = previous.tabOrderIndex;
  const currentIndex = current.tabOrderIndex;
  const comparable = previousIndex != null && currentIndex != null;
  const wrapForward = comparable &&
    previous.tabOrderSize != null &&
    previousIndex === previous.tabOrderSize &&
    currentIndex === 1;

  if (intent === 'backward') {
    return {
      direction: 'backward',
      ...(comparable ? { distance: currentIndex - previousIndex } : {}),
    };
  }

  if (intent === 'forward' && wrapForward) {
    return { direction: 'wrap', distance: 1 };
  }

  if (!comparable) {
    return { direction: 'forward' };
  }

  const distance = currentIndex - previousIndex;
  if (distance < 0) return { direction: 'backward', distance };
  if (distance === 0) return { direction: 'repeat', distance };
  if (distance === 1) return { direction: 'forward', distance };
  return { direction: 'jump', distance };
}

export function buildFocusJourney(events: RuntimeEvent[]): FocusJourney {
  const focusEvents = events.filter(
    (event): event is RuntimeEvent & { element: ElementSnapshot } =>
      (event.kind === 'focus' || event.kind === 'virtual-focus') && event.element != null,
  );
  const steps: FocusJourneyStep[] = [];

  for (const [index, event] of focusEvents.entries()) {
    const previous = steps.at(-1);
    const movement = previous
      ? movementDirection(previous.element, event.element, event.focusIntent)
      : { direction: 'start' as const };

    steps.push({
      id: event.id,
      order: index + 1,
      event,
      element: event.element,
      mode: event.kind === 'virtual-focus' ? 'virtual' : 'dom',
      direction: movement.direction,
      ...(movement.distance != null ? { distance: movement.distance } : {}),
    });
  }

  const domSteps = steps.filter((step) => step.mode === 'dom');
  return {
    steps,
    forward: domSteps.filter((step) => step.direction === 'forward').length,
    backward: domSteps.filter((step) => step.direction === 'backward').length,
    repeated: domSteps.filter((step) => step.direction === 'repeat').length,
    wraps: domSteps.filter((step) => step.direction === 'wrap').length,
    jumps: domSteps.filter((step) => step.direction === 'jump').length,
    virtual: steps.filter((step) => step.mode === 'virtual').length,
  };
}
