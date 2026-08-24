import type { RuntimeCause, RuntimeEvent, RuntimeInteraction } from '../../shared/types';

export const INTERACTION_WINDOW_MS = 1600;
export const MAX_INTERACTION_DURATION_MS = 5000;
export const ACTIVATION_CLICK_REUSE_MS = 700;

export type InteractionSource = 'keyboard' | 'pointer';

interface ActiveInteraction {
  id: string;
  source: InteractionSource;
  startedAt: number;
  lastActivityAt: number;
  triggerSelector?: string;
  activationKey?: string;
}

export function createRuntimeInteractionId(epoch: string, sequence: number): string {
  return `ix-${epoch}-${sequence.toString(36)}`;
}

export function shouldReuseClickInteraction(input: {
  source: InteractionSource;
  activationKey?: string;
  triggerSelector?: string;
  clickSelector: string;
  elapsedMs: number;
}): boolean {
  if (input.elapsedMs < 0) return false;
  if (input.triggerSelector !== input.clickSelector) return false;
  if (input.source === 'pointer') return input.elapsedMs <= ACTIVATION_CLICK_REUSE_MS;
  return ['Enter', ' '].includes(input.activationKey ?? '') && input.elapsedMs <= ACTIVATION_CLICK_REUSE_MS;
}

export class RuntimeInteractionTracker {
  private sequence = 0;
  private active: ActiveInteraction | null = null;

  constructor(
    private readonly epoch = Date.now().toString(36),
    private readonly now: () => number = () => Date.now(),
  ) {}

  begin(
    source: InteractionSource,
    triggerSelector?: string,
    activationKey?: string,
    timestamp = this.now(),
  ): string {
    this.sequence += 1;
    this.active = {
      id: createRuntimeInteractionId(this.epoch, this.sequence),
      source,
      startedAt: timestamp,
      lastActivityAt: timestamp,
      ...(triggerSelector ? { triggerSelector } : {}),
      ...(activationKey ? { activationKey } : {}),
    };
    return this.active.id;
  }

  current(timestamp = this.now()): string | undefined {
    if (!this.active) return undefined;
    if (
      timestamp - this.active.lastActivityAt > INTERACTION_WINDOW_MS ||
      timestamp - this.active.startedAt > MAX_INTERACTION_DURATION_MS
    ) {
      this.active = null;
      return undefined;
    }
    return this.active.id;
  }

  touch(interactionId: string, timestamp = this.now()): void {
    if (this.active?.id === interactionId) this.active.lastActivityAt = timestamp;
  }

  click(clickSelector: string, timestamp = this.now()): string {
    const activeId = this.current(timestamp);
    if (
      activeId &&
      this.active &&
      shouldReuseClickInteraction({
        source: this.active.source,
        ...(this.active.activationKey ? { activationKey: this.active.activationKey } : {}),
        ...(this.active.triggerSelector ? { triggerSelector: this.active.triggerSelector } : {}),
        clickSelector,
        elapsedMs: timestamp - this.active.lastActivityAt,
      })
    ) {
      this.active.lastActivityAt = timestamp;
      return activeId;
    }

    return this.begin('pointer', clickSelector, undefined, timestamp);
  }

  reset(): void {
    this.active = null;
    this.sequence = 0;
  }
}

function uniqueCauses(events: RuntimeEvent[]): RuntimeCause[] {
  const seen = new Set<string>();
  const causes: RuntimeCause[] = [];

  for (const event of events) {
    for (const cause of event.causes ?? []) {
      const key = `${cause.type}:${cause.summary}`;
      if (seen.has(key)) continue;
      seen.add(key);
      causes.push(cause);
    }
  }

  return causes;
}

function interactionFromEvents(id: string, correlated: boolean, events: RuntimeEvent[]): RuntimeInteraction {
  const first = events[0];
  const last = events.at(-1);
  if (!first || !last) throw new Error('Runtime interaction requires at least one event.');

  return {
    id,
    correlated,
    startedAt: first.timestamp,
    endedAt: last.timestamp,
    trigger: events.find((event) => event.kind === 'keydown' || event.kind === 'click'),
    events,
    findings: events.filter((event) => event.outcome != null).length,
    causes: uniqueCauses(events),
  };
}

export function groupRuntimeInteractions(events: RuntimeEvent[]): RuntimeInteraction[] {
  const grouped = new Map<string, RuntimeEvent[]>();
  const order: string[] = [];

  for (const event of events) {
    const key = event.interactionId ?? `ambient:${event.id}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
      order.push(key);
    }
    grouped.get(key)?.push(event);
  }

  return order.map((key) => interactionFromEvents(key, !key.startsWith('ambient:'), grouped.get(key) ?? []));
}

export function runtimeInteractionTitle(interaction: RuntimeInteraction): string {
  const trigger = interaction.trigger;

  if (trigger?.kind === 'keydown') {
    const target = trigger.element?.name || trigger.element?.selector;
    return target ? `${trigger.title} · ${target}` : trigger.title;
  }

  if (trigger?.kind === 'click') return trigger.title;
  if (interaction.causes[0]) return interaction.causes[0].summary;

  const first = interaction.events[0];
  return first?.title ?? 'Runtime activity';
}
