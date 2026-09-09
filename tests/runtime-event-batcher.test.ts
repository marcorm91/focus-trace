import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRuntimeEventBatcher,
  RUNTIME_EVENT_BATCH_WINDOW_MS,
} from '../lib/runtime/event-batcher';
import type { RuntimeEvent } from '../shared/types';

function event(id: string, breakpoint = false): RuntimeEvent {
  return {
    id,
    timestamp: Number(id),
    kind: 'focus',
    severity: 'info',
    title: `Event ${id}`,
    ...(breakpoint ? {
      breakpointHits: [{
        breakpointId: 'focused-node-removed',
        causeType: 'FOCUSED_NODE_REMOVED',
        eventId: id,
        timestamp: Number(id),
        label: 'Focused node removed',
        summary: 'Focused node was removed.',
      }],
    } : {}),
  };
}

afterEach(() => vi.useRealTimers());

describe('runtime event batcher', () => {
  it('coalesces an ordinary burst into one ordered delivery window', async () => {
    vi.useFakeTimers();
    const send = vi.fn(async (_events: RuntimeEvent[]) => undefined);
    const batcher = createRuntimeEventBatcher(send);

    batcher.enqueue(event('1'));
    batcher.enqueue(event('2'));
    expect(send).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(RUNTIME_EVENT_BATCH_WINDOW_MS);
    await batcher.flush();
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0].map((item) => item.id)).toEqual(['1', '2']);
  });

  it('flushes a breakpoint immediately with earlier queued evidence', async () => {
    vi.useFakeTimers();
    const send = vi.fn(async (_events: RuntimeEvent[]) => undefined);
    const batcher = createRuntimeEventBatcher(send);

    batcher.enqueue(event('1'));
    batcher.enqueue(event('2', true));
    await batcher.flush();

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0].map((item) => item.id)).toEqual(['1', '2']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('serializes later batches and lets an explicit flush await all delivery', async () => {
    vi.useFakeTimers();
    let releaseFirst: (() => void) | undefined;
    const firstDelivery = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const delivered: string[][] = [];
    const send = vi.fn(async (events: RuntimeEvent[]) => {
      delivered.push(events.map((item) => item.id));
      if (delivered.length === 1) await firstDelivery;
    });
    const batcher = createRuntimeEventBatcher(send, 1);

    batcher.enqueue(event('1'));
    await vi.advanceTimersByTimeAsync(1);
    batcher.enqueue(event('2'));
    const flushed = batcher.flush();
    expect(delivered).toEqual([['1']]);
    releaseFirst?.();
    await flushed;

    expect(delivered).toEqual([['1'], ['2']]);
  });
});
