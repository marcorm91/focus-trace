export type ResponseLimitHandler = () => void;

async function cancelUnlockedBody(
  response: Response,
  onLimitExceeded: ResponseLimitHandler,
): Promise<undefined> {
  onLimitExceeded();
  await response.body?.cancel().catch(() => undefined);
  return undefined;
}

/**
 * Decodes a response incrementally and never retains content after the actual
 * received byte count crosses the limit. Content-Length is an early rejection
 * hint only; chunk bytes remain the source of truth for compressed, absent, or
 * inaccurate headers.
 */
export async function readBoundedResponseText(
  response: Response,
  maxBytes: number,
  onLimitExceeded: ResponseLimitHandler = () => undefined,
): Promise<string | undefined> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return cancelUnlockedBody(response, onLimitExceeded);
  }
  if (!response.body) return undefined;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        onLimitExceeded();
        await reader.cancel().catch(() => undefined);
        return undefined;
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join('');
  } finally {
    reader.releaseLock();
  }
}
