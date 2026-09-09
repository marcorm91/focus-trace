import { describe, expect, it, vi } from 'vitest';
import { readBoundedResponseText } from '../lib/site-audit/bounded-response';

function responseFromChunks(
  chunks: Uint8Array[],
  headers?: HeadersInit,
  onCancel: () => void = () => undefined,
): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
    cancel: onCancel,
  }), { headers });
}

describe('bounded streamed response text', () => {
  it('decodes multibyte text split across chunks at the exact byte limit', async () => {
    const encoded = new TextEncoder().encode('€€');
    const response = responseFromChunks([
      encoded.slice(0, 2),
      encoded.slice(2, 5),
      encoded.slice(5),
    ]);

    await expect(readBoundedResponseText(response, encoded.byteLength)).resolves.toBe('€€');
  });

  it('cancels a body that exceeds the real received-byte limit without a header', async () => {
    const onCancel = vi.fn();
    const onLimitExceeded = vi.fn();
    const response = new Response(new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode('1234'));
      },
      cancel: onCancel,
    }));

    await expect(readBoundedResponseText(response, 6, onLimitExceeded)).resolves.toBeUndefined();
    expect(onLimitExceeded).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not trust an understated Content-Length header', async () => {
    const onLimitExceeded = vi.fn();
    const response = responseFromChunks([
      new TextEncoder().encode('too-large'),
    ], { 'content-length': '2' });

    await expect(readBoundedResponseText(response, 4, onLimitExceeded)).resolves.toBeUndefined();
    expect(onLimitExceeded).toHaveBeenCalledOnce();
  });

  it('rejects an oversized declared length before consuming the stream', async () => {
    const onCancel = vi.fn();
    const onLimitExceeded = vi.fn();
    const response = responseFromChunks([
      new TextEncoder().encode('small body'),
    ], { 'content-length': '6000001' }, onCancel);

    await expect(readBoundedResponseText(response, 6_000_000, onLimitExceeded)).resolves.toBeUndefined();
    expect(onLimitExceeded).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('returns undefined when a response exposes no readable body', async () => {
    await expect(readBoundedResponseText(new Response(null), 10)).resolves.toBeUndefined();
  });
});
