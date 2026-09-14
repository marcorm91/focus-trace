import type { RuntimeEvent } from '../../shared/types';
import type { GuidedEvidence } from './framework';

const MAX_RUNTIME_EVENTS = 120;
const MAX_FOCUS_SEQUENCE = 10;

function observed(label: string, value: string, event?: RuntimeEvent): GuidedEvidence {
  return {
    kind: 'runtime-observation',
    label,
    value,
    capturedAt: event?.timestamp ?? Date.now(),
    ...(event ? { sourceEventId: event.id, sourceEventKind: event.kind } : {}),
  };
}

function eventTarget(event: RuntimeEvent): string {
  return event.element?.name
    || event.element?.selector
    || event.element?.role
    || event.element?.tag
    || event.title;
}

function relevantEvents(events: RuntimeEvent[], startedAt: number): RuntimeEvent[] {
  return events
    .filter((event) => event.timestamp >= startedAt)
    .slice(-MAX_RUNTIME_EVENTS);
}

function latest(events: RuntimeEvent[], kinds: RuntimeEvent['kind'][]): RuntimeEvent | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event && kinds.includes(event.kind)) return event;
  }
  return undefined;
}

function focusSequence(events: RuntimeEvent[]): GuidedEvidence[] {
  const focus = events.filter((event) => event.kind === 'focus').slice(-MAX_FOCUS_SEQUENCE);
  if (!focus.length) return [];
  const sequence = focus.map(eventTarget).join(' → ');
  const last = focus[focus.length - 1];
  return [observed(
    'Observed focus sequence',
    `${focus.length} focus moves: ${sequence}`,
    last,
  )];
}

function keyboardActivation(events: RuntimeEvent[]): GuidedEvidence[] {
  const key = latest(events, ['keydown']);
  const click = latest(events, ['click']);
  const evidence: GuidedEvidence[] = [];
  if (key) evidence.push(observed('Observed keyboard input', `${key.title}${key.element ? ` on ${eventTarget(key)}` : ''}`, key));
  if (click) evidence.push(observed('Observed activation', `${click.title}${click.element ? ` on ${eventTarget(click)}` : ''}`, click));
  return evidence;
}

function dialogWindow(events: RuntimeEvent[]): { open: boolean; events: RuntimeEvent[] } {
  let lastOpen = -1;
  let open = false;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!event) continue;
    if (event.kind === 'dialog-open') {
      lastOpen = index;
      open = true;
    } else if (event.kind === 'dialog-close' && lastOpen >= 0) {
      open = false;
    }
  }
  return {
    open,
    events: lastOpen >= 0 ? events.slice(lastOpen) : [],
  };
}

function focusContainment(events: RuntimeEvent[]): GuidedEvidence[] {
  const dialog = dialogWindow(events);
  if (dialog.events.length) {
    const escape = latest(dialog.events, ['dialog-focus-escape']);
    if (escape) {
      return [observed(
        'Observed modal focus escape',
        escape.detail || 'Focus moved outside an open modal dialog.',
        escape,
      )];
    }
    const focus = dialog.events.filter((event) => event.kind === 'focus');
    if (focus.length >= 2) {
      const last = focus[focus.length - 1];
      return [observed(
        'Observed modal focus containment',
        `Focus stayed within the modal runtime window across ${focus.length} observed focus moves. Intentional modal containment is not classified as a keyboard trap automatically.`,
        last,
      )];
    }
  }

  const focus = events.filter((event) => event.kind === 'focus').slice(-6);
  if (focus.length < 4) return focusSequence(events);
  const targets = focus.map(eventTarget);
  const unique = new Set(targets);
  if (unique.size <= 3) {
    const last = focus[focus.length - 1];
    return [observed(
      'Repeated focus cycle observed',
      `Focus revisited ${unique.size} target${unique.size === 1 ? '' : 's'} across ${focus.length} moves. This is contextual evidence only; the auditor must decide whether keyboard focus can escape.`,
      last,
    )];
  }
  return focusSequence(events);
}

function dialogEntry(events: RuntimeEvent[]): GuidedEvidence[] {
  const opened = latest(events, ['dialog-open']);
  if (!opened) return [];
  return [observed(
    'Observed dialog entry',
    opened.detail || opened.title,
    opened,
  )];
}

function dialogEscapeClose(events: RuntimeEvent[]): GuidedEvidence[] {
  const escape = [...events].reverse().find((event) => event.kind === 'keydown' && event.title === 'Key: Escape');
  const close = latest(events, ['dialog-close']);
  const evidence: GuidedEvidence[] = [];
  if (escape) evidence.push(observed('Observed Escape key', `${escape.title}${escape.element ? ` on ${eventTarget(escape)}` : ''}`, escape));
  if (close && (!escape || close.timestamp >= escape.timestamp)) {
    evidence.push(observed('Observed dialog close', close.detail || close.title, close));
  }
  return evidence;
}

function dialogRestore(events: RuntimeEvent[]): GuidedEvidence[] {
  const closeIndex = [...events].map((event) => event.kind).lastIndexOf('dialog-close');
  if (closeIndex < 0) return [];
  const close = events[closeIndex];
  if (!close) return [];
  const after = events.slice(closeIndex + 1).find((event) => event.kind === 'focus');
  const evidence = [observed('Observed dialog close', close.detail || close.title, close)];
  if (after) {
    evidence.push(observed('Observed focus after dialog close', `Focus moved to ${eventTarget(after)}.`, after));
  }
  return evidence;
}

export function guidedRuntimeEvidence(
  testId: string,
  stepId: string,
  events: RuntimeEvent[],
  startedAt: number,
): GuidedEvidence[] {
  const runtime = relevantEvents(events, startedAt);
  const key = `${testId}:${stepId}`;
  switch (key) {
    case 'FT-GUIDED-002:keyboard-sequential-pass':
      return focusSequence(runtime);
    case 'FT-GUIDED-002:keyboard-activation':
      return keyboardActivation(runtime);
    case 'FT-GUIDED-003:focus-order-indicator': {
      const focus = focusSequence(runtime);
      const obscured = latest(runtime, ['focus-obscured', 'focus-hidden', 'focus-lost']);
      return obscured
        ? [...focus, observed('Observed focus finding', obscured.detail || obscured.title, obscured)]
        : focus;
    }
    case 'FT-GUIDED-003:focus-trap-review':
      return focusContainment(runtime);
    case 'FT-GUIDED-004:dialog-entry':
      return dialogEntry(runtime);
    case 'FT-GUIDED-004:dialog-containment':
      return focusContainment(runtime);
    case 'FT-GUIDED-004:dialog-escape-close':
      return dialogEscapeClose(runtime);
    case 'FT-GUIDED-004:dialog-restore-focus':
      return dialogRestore(runtime);
    default:
      return [];
  }
}
