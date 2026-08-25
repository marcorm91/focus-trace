import { tr, type AppLanguage } from '../../shared/i18n';
import type { ElementSnapshot, RuntimeEvent, RuntimeInteraction } from '../../shared/types';
import type { FocusJourney } from './focus-journey';

export type FocusTransitionSemanticKind =
  | 'focus-restored'
  | 'focus-not-restored'
  | 'focus-lost'
  | 'backward-navigation'
  | 'unexpected-jump'
  | 'loop-detected'
  | 'entered-dialog'
  | 'modal-focus-escape'
  | 'spa-focus-handled'
  | 'spa-focus-left-behind';

export type FocusTransitionSemanticTone = 'positive' | 'neutral' | 'review';

export interface FocusTransitionSemantic {
  id: string;
  kind: FocusTransitionSemanticKind;
  tone: FocusTransitionSemanticTone;
  eventIds: string[];
  interactionId?: string;
  from?: ElementSnapshot;
  to?: ElementSnapshot;
  trigger?: ElementSnapshot;
  dialog?: ElementSnapshot;
  distance?: number;
  cycle?: string[];
}

export interface FocusTransitionSemanticCopy {
  label: string;
  detail: string;
}

function elementLabel(element: ElementSnapshot | undefined, language: AppLanguage): string {
  if (!element) return tr(language, 'the recorded element', 'el elemento registrado');
  return element.name?.trim() || element.role || element.tag || element.selector;
}

function quote(value: string): string {
  return `“${value}”`;
}

export function focusTransitionSemanticCopy(
  semantic: FocusTransitionSemantic,
  language: AppLanguage,
): FocusTransitionSemanticCopy {
  const from = quote(elementLabel(semantic.from, language));
  const to = quote(elementLabel(semantic.to, language));
  const trigger = quote(elementLabel(semantic.trigger, language));

  switch (semantic.kind) {
    case 'focus-restored':
      return {
        label: tr(language, 'Focus restored', 'Foco restaurado'),
        detail: tr(
          language,
          `Focus returned to ${trigger}, the control that opened the dialog.`,
          `El foco volvió a ${trigger}, el control que abrió el diálogo.`,
        ),
      };
    case 'focus-not-restored':
      return {
        label: tr(language, 'Focus not restored', 'Foco no restaurado'),
        detail: tr(
          language,
          `The dialog closed, but focus ended on ${to} instead of returning to ${trigger}.`,
          `El diálogo se cerró, pero el foco terminó en ${to} en lugar de volver a ${trigger}.`,
        ),
      };
    case 'focus-lost':
      return {
        label: tr(language, 'Focus lost', 'Foco perdido'),
        detail: tr(
          language,
          `Focus was associated with ${from} when that element disappeared or no longer had a useful destination.`,
          `El foco estaba asociado a ${from} cuando ese elemento desapareció o dejó de tener un destino útil.`,
        ),
      };
    case 'backward-navigation':
      return {
        label: tr(language, 'Backward navigation', 'Navegación hacia atrás'),
        detail: tr(
          language,
          `Shift+Tab intentionally moved focus from ${from} to ${to}.`,
          `Shift+Tab movió intencionadamente el foco de ${from} a ${to}.`,
        ),
      };
    case 'unexpected-jump': {
      const amount = Math.abs(semantic.distance ?? 0);
      return {
        label: tr(language, 'Unexpected focus jump', 'Salto de foco inesperado'),
        detail: tr(
          language,
          amount > 1
            ? `Tab moved focus ${amount} positions from ${from} to ${to} instead of reaching the next sequential stop.`
            : `Tab moved focus from ${from} to ${to} in a non-sequential way.`,
          amount > 1
            ? `Tab movió el foco ${amount} posiciones de ${from} a ${to} en lugar de alcanzar la siguiente parada secuencial.`
            : `Tab movió el foco de ${from} a ${to} de forma no secuencial.`,
        ),
      };
    }
    case 'loop-detected': {
      const cycle = semantic.cycle?.map((item) => quote(item)).join(' → ') || tr(language, 'the same focus sequence', 'la misma secuencia de foco');
      return {
        label: tr(language, 'Focus loop observed', 'Bucle de foco observado'),
        detail: tr(
          language,
          `The sequence ${cycle} repeated. This can be intentional, for example inside a modal, so it is not a failure by itself.`,
          `La secuencia ${cycle} se repitió. Puede ser intencionado, por ejemplo dentro de un modal, por lo que no es un fallo por sí mismo.`,
        ),
      };
    }
    case 'entered-dialog':
      return {
        label: tr(language, 'Focus entered dialog', 'El foco entró en el diálogo'),
        detail: tr(
          language,
          'The dialog opened with keyboard focus already established inside it.',
          'El diálogo se abrió con el foco de teclado ya establecido en su interior.',
        ),
      };
    case 'modal-focus-escape':
      return {
        label: tr(language, 'Focus escaped modal', 'El foco salió del modal'),
        detail: tr(
          language,
          `Focus moved to ${to} while the modal remained open.`,
          `El foco se movió a ${to} mientras el modal seguía abierto.`,
        ),
      };
    case 'spa-focus-handled':
      return {
        label: tr(language, 'SPA focus handled', 'Foco SPA gestionado'),
        detail: tr(
          language,
          `The route changed and focus moved to ${to} in the new view.`,
          `La ruta cambió y el foco se movió a ${to} en la nueva vista.`,
        ),
      };
    case 'spa-focus-left-behind':
      return {
        label: tr(language, 'SPA left focus behind', 'La SPA dejó el foco atrás'),
        detail: tr(
          language,
          `The route changed while focus remained on ${to} instead of moving to a meaningful location in the new view.`,
          `La ruta cambió mientras el foco permanecía en ${to} en lugar de moverse a una ubicación significativa de la nueva vista.`,
        ),
      };
  }
}

export function focusTransitionSemanticIcon(semantic: FocusTransitionSemantic): string {
  if (semantic.kind === 'backward-navigation') return '↩';
  if (semantic.kind === 'loop-detected') return '↻';
  if (semantic.tone === 'positive') return '✓';
  if (semantic.tone === 'review') return '⚠';
  return '•';
}

export function focusTransitionSemanticsForEvent(
  semantics: FocusTransitionSemantic[],
  eventId: string,
): FocusTransitionSemantic[] {
  return semantics.filter((semantic) => semantic.eventIds.includes(eventId));
}

export function primaryFocusTransitionSemantic(
  semantics: FocusTransitionSemantic[],
): FocusTransitionSemantic | undefined {
  return [...semantics].sort((left, right) => {
    const priority = { review: 0, positive: 1, neutral: 2 } satisfies Record<FocusTransitionSemanticTone, number>;
    return priority[left.tone] - priority[right.tone];
  })[0];
}

function sameRoute(left: RuntimeEvent, right: RuntimeEvent): boolean {
  return Boolean(
    left.fromUrl &&
    left.toUrl &&
    left.fromUrl === right.fromUrl &&
    left.toUrl === right.toUrl,
  );
}

function latestMatchingFocusEvent(
  events: RuntimeEvent[],
  beforeIndex: number,
  selector: string | undefined,
): RuntimeEvent | undefined {
  if (!selector) return undefined;
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.kind === 'focus' && event.element?.selector === selector) return event;
  }
  return undefined;
}

function nearbyFocusEvent(
  events: RuntimeEvent[],
  anchorIndex: number,
  predicate: (event: RuntimeEvent) => boolean,
): RuntimeEvent | undefined {
  const anchor = events[anchorIndex];
  if (!anchor) return undefined;

  for (let index = anchorIndex + 1; index < events.length; index += 1) {
    const event = events[index];
    if (!event || event.timestamp - anchor.timestamp > 300) break;
    if (event.kind === 'focus' && predicate(event)) return event;
  }

  for (let index = anchorIndex - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event || anchor.timestamp - event.timestamp > 100) break;
    if (event.kind === 'focus' && predicate(event)) return event;
  }

  return undefined;
}

function interactionTrigger(
  interactionById: Map<string, RuntimeInteraction>,
  interactionId: string | undefined,
): ElementSnapshot | undefined {
  return interactionId ? interactionById.get(interactionId)?.trigger?.element : undefined;
}

export function buildFocusTransitionSemantics(
  events: RuntimeEvent[],
  interactions: RuntimeInteraction[],
  journey: FocusJourney,
): FocusTransitionSemantic[] {
  const semantics: FocusTransitionSemantic[] = [];
  const interactionById = new Map(interactions.map((interaction) => [interaction.id, interaction]));
  const focusStepByEventId = new Map(journey.steps.map((step) => [step.event.id, step]));

  const add = (semantic: FocusTransitionSemantic) => {
    if (!semantics.some((item) => item.id === semantic.id)) semantics.push(semantic);
  };

  for (const [index, event] of events.entries()) {
    if (event.kind === 'focus-lost') {
      const previousFocus = latestMatchingFocusEvent(events, index, event.element?.selector);
      add({
        id: `semantic:focus-lost:${event.id}`,
        kind: 'focus-lost',
        tone: 'review',
        eventIds: [event.id, ...(previousFocus ? [previousFocus.id] : [])],
        ...(event.interactionId ? { interactionId: event.interactionId } : {}),
        ...(event.element ? { from: event.element } : {}),
      });
    }

    if (event.kind === 'dialog-open' && !event.outcome) {
      const nearbyFocus = nearbyFocusEvent(
        events,
        index,
        (candidate) => candidate.interactionId === event.interactionId,
      );
      add({
        id: `semantic:entered-dialog:${event.id}`,
        kind: 'entered-dialog',
        tone: 'positive',
        eventIds: [event.id, ...(nearbyFocus ? [nearbyFocus.id] : [])],
        ...(event.interactionId ? { interactionId: event.interactionId } : {}),
        ...(event.element ? { dialog: event.element } : {}),
        ...(nearbyFocus?.element ? { to: nearbyFocus.element } : {}),
      });
    }

    if (event.kind === 'dialog-focus-escape') {
      const nearbyFocus = nearbyFocusEvent(
        events,
        index,
        (candidate) => candidate.element?.selector === event.element?.selector,
      );
      add({
        id: `semantic:modal-focus-escape:${event.id}`,
        kind: 'modal-focus-escape',
        tone: 'review',
        eventIds: [event.id, ...(nearbyFocus ? [nearbyFocus.id] : [])],
        ...(event.interactionId ? { interactionId: event.interactionId } : {}),
        ...(event.element ? { to: event.element } : {}),
      });
    }
  }

  const dialogOpenEvents = events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.kind === 'dialog-open' && event.element?.selector);

  for (const { event: opened, index: openIndex } of dialogOpenEvents) {
    const dialogSelector = opened.element?.selector;
    const trigger = interactionTrigger(interactionById, opened.interactionId);
    if (!dialogSelector || !trigger?.selector) continue;

    const closeIndex = events.findIndex(
      (event, index) =>
        index > openIndex &&
        event.kind === 'dialog-close' &&
        !event.outcome &&
        event.element?.selector === dialogSelector,
    );
    if (closeIndex < 0) continue;

    const closed = events[closeIndex]!;
    const mismatch = events.slice(closeIndex + 1).find(
      (event) =>
        event.kind === 'dialog-close' &&
        event.outcome === 'review' &&
        event.interactionId === closed.interactionId &&
        event.timestamp - closed.timestamp <= 250,
    );

    if (mismatch) {
      const activeFocus = mismatch.element
        ? nearbyFocusEvent(
            events,
            events.indexOf(mismatch),
            (candidate) => candidate.element?.selector === mismatch.element?.selector,
          )
        : undefined;
      add({
        id: `semantic:focus-not-restored:${closed.id}`,
        kind: 'focus-not-restored',
        tone: 'review',
        eventIds: [closed.id, mismatch.id, ...(activeFocus ? [activeFocus.id] : [])],
        ...(closed.interactionId ? { interactionId: closed.interactionId } : {}),
        trigger,
        dialog: opened.element,
        ...(mismatch.element ? { to: mismatch.element } : {}),
      });
      continue;
    }

    const restoredFocus = nearbyFocusEvent(
      events,
      closeIndex,
      (candidate) => candidate.element?.selector === trigger.selector,
    );
    if (!restoredFocus?.element) continue;

    add({
      id: `semantic:focus-restored:${closed.id}`,
      kind: 'focus-restored',
      tone: 'positive',
      eventIds: [closed.id, restoredFocus.id],
      ...(closed.interactionId ? { interactionId: closed.interactionId } : {}),
      trigger,
      dialog: opened.element,
      to: restoredFocus.element,
    });
  }

  for (const [index, event] of events.entries()) {
    if (event.kind !== 'route' || event.outcome || !event.fromUrl || !event.toUrl) continue;

    const routeFinding = events.slice(index + 1).find(
      (candidate) =>
        candidate.kind === 'route' &&
        sameRoute(event, candidate) &&
        candidate.causes?.some((cause) => cause.type === 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE') &&
        candidate.timestamp - event.timestamp <= 700,
    );

    if (routeFinding) {
      const linkedFocus = routeFinding.element
        ? latestMatchingFocusEvent(events, events.indexOf(routeFinding), routeFinding.element.selector)
        : undefined;
      add({
        id: `semantic:spa-focus-left-behind:${event.id}`,
        kind: 'spa-focus-left-behind',
        tone: 'review',
        eventIds: [event.id, routeFinding.id, ...(linkedFocus ? [linkedFocus.id] : [])],
        ...(event.interactionId ? { interactionId: event.interactionId } : {}),
        ...(routeFinding.element ? { to: routeFinding.element } : {}),
      });
      continue;
    }

    const focusAfterRoute = events.slice(index + 1).find(
      (candidate) =>
        candidate.kind === 'focus' &&
        candidate.timestamp - event.timestamp <= 500,
    );
    if (!focusAfterRoute?.element) continue;

    add({
      id: `semantic:spa-focus-handled:${event.id}`,
      kind: 'spa-focus-handled',
      tone: 'positive',
      eventIds: [event.id, focusAfterRoute.id],
      ...(event.interactionId ? { interactionId: event.interactionId } : {}),
      to: focusAfterRoute.element,
    });
  }

  const restoredEventIds = new Set(
    semantics
      .filter((semantic) => semantic.kind === 'focus-restored')
      .flatMap((semantic) => semantic.eventIds),
  );

  for (const [index, step] of journey.steps.entries()) {
    const previous = journey.steps[index - 1];
    if (!previous) continue;

    if (step.direction === 'backward' && step.event.focusIntent === 'backward') {
      add({
        id: `semantic:backward:${step.id}`,
        kind: 'backward-navigation',
        tone: 'neutral',
        eventIds: [step.id],
        ...(step.event.interactionId ? { interactionId: step.event.interactionId } : {}),
        from: previous.element,
        to: step.element,
        ...(step.distance != null ? { distance: step.distance } : {}),
      });
    }

    if (
      step.direction === 'jump' &&
      step.event.focusIntent === 'forward' &&
      !restoredEventIds.has(step.id)
    ) {
      add({
        id: `semantic:unexpected-jump:${step.id}`,
        kind: 'unexpected-jump',
        tone: 'review',
        eventIds: [step.id],
        ...(step.event.interactionId ? { interactionId: step.event.interactionId } : {}),
        from: previous.element,
        to: step.element,
        ...(step.distance != null ? { distance: step.distance } : {}),
      });
    }
  }

  const seenCycles = new Set<string>();
  for (let end = 0; end < journey.steps.length; end += 1) {
    for (let length = 2; length <= 4; length += 1) {
      if (end + 1 < length * 2) continue;
      const firstStart = end + 1 - length * 2;
      const secondStart = end + 1 - length;
      const first = journey.steps.slice(firstStart, secondStart).map((step) => step.element.selector);
      const second = journey.steps.slice(secondStart, end + 1).map((step) => step.element.selector);
      if (!first.every((selector, index) => selector === second[index])) continue;

      const signature = second.join('→');
      if (seenCycles.has(signature)) break;
      seenCycles.add(signature);
      const endStep = journey.steps[end];
      if (!endStep) break;
      add({
        id: `semantic:loop:${endStep.id}:${length}`,
        kind: 'loop-detected',
        tone: 'neutral',
        eventIds: [endStep.id],
        ...(endStep.event.interactionId ? { interactionId: endStep.event.interactionId } : {}),
        cycle: journey.steps
          .slice(secondStart, end + 1)
          .map((step) => step.element.name?.trim() || step.element.role || step.element.tag),
      });
      break;
    }
  }

  // Keep event-linked semantics deterministic even when a focus event is not
  // represented in the current journey for any reason.
  for (const semantic of semantics) {
    semantic.eventIds = [...new Set(semantic.eventIds.filter((eventId) =>
      events.some((event) => event.id === eventId) || focusStepByEventId.has(eventId),
    ))];
  }

  return semantics;
}
