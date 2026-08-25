import type { RuntimeEvent, RuntimeMutationSnapshot } from '../../shared/types';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

export function mutationTitle(mutation: RuntimeMutationSnapshot): string {
  if (mutation.kind === 'node-added') return `DOM added → ${mutation.target.selector}`;
  if (mutation.kind === 'node-removed') return `DOM removed → ${mutation.target.selector}`;
  return `DOM attribute changed → ${mutation.target.selector}`;
}

export function createMutationEvent(
  mutation: RuntimeMutationSnapshot,
  detail: string,
): PendingRuntimeEvent {
  return {
    kind: 'dom-mutation',
    severity: 'info',
    title: mutationTitle(mutation),
    detail,
    element: mutation.target,
    mutation,
  };
}

export function liveRegionDetail(textContent: string | null | undefined): string | undefined {
  const detail = textContent?.trim().replace(/\s+/g, ' ').slice(0, 160);
  return detail || undefined;
}

export function createLiveRegionEvent(element: RuntimeEvent['element'], textContent: string | null | undefined): PendingRuntimeEvent {
  const detail = liveRegionDetail(textContent);
  return {
    kind: 'live-region',
    severity: 'info',
    title: 'Live region updated',
    ...(detail ? { detail } : {}),
    ...(element ? { element } : {}),
  };
}
