import type { ElementSnapshot, RuntimeEvent } from '../../shared/types';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

export function keyLabel(key: string): string {
  return key === ' ' ? 'Space' : key;
}

interface KeydownEventInput {
  key: string;
  element?: ElementSnapshot;
}

export function createKeydownEvent({ key, element }: KeydownEventInput): PendingRuntimeEvent {
  return {
    kind: 'keydown',
    severity: 'info',
    title: `Key: ${keyLabel(key)}`,
    ...(element ? { element } : {}),
  };
}

interface ClickEventInput {
  label: string;
  element: ElementSnapshot;
}

export function createClickEvent({ label, element }: ClickEventInput): PendingRuntimeEvent {
  return {
    kind: 'click',
    severity: 'info',
    title: `Click → ${label}`,
    element,
  };
}
