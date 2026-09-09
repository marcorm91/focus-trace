import type { RuntimeEvent } from '../../shared/types';

export const RUNTIME_EVENT_BATCH_WINDOW_MS = 16;

type SendRuntimeEvents = (events: RuntimeEvent[]) => Promise<unknown>;

export interface RuntimeEventBatcher {
  enqueue: (event: RuntimeEvent) => void;
  flush: () => Promise<void>;
}

/**
 * Coalesces bursts of Trace evidence into one extension message while keeping
 * breakpoint delivery immediate. Delivery is serialized so event order is
 * stable even when a later batch is ready before the previous write finishes.
 */
export function createRuntimeEventBatcher(
  send: SendRuntimeEvents,
  delayMs = RUNTIME_EVENT_BATCH_WINDOW_MS,
): RuntimeEventBatcher {
  let events: RuntimeEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let delivery = Promise.resolve();

  const dispatch = (): Promise<void> => {
    if (timer != null) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (events.length === 0) return delivery;

    const batch = events;
    events = [];
    delivery = delivery
      .catch(() => undefined)
      .then(() => send(batch))
      .then(() => undefined, () => undefined);
    return delivery;
  };

  return {
    enqueue(event) {
      events.push(event);
      if (event.breakpointHits?.length) {
        void dispatch();
        return;
      }
      timer ??= setTimeout(() => {
        timer = undefined;
        void dispatch();
      }, delayMs);
    },
    flush: dispatch,
  };
}
