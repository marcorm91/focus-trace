import { describe, expect, it } from 'vitest';
import { createRuntimeCause, createRuntimeEventId } from '../lib/runtime/events';

describe('runtime event helpers', () => {
  it('creates deterministic runtime causes', () => {
    expect(createRuntimeCause('FOCUSED_NODE_REMOVED', 'Focused node was removed.')).toEqual({
      type: 'FOCUSED_NODE_REMOVED',
      confidence: 'deterministic',
      summary: 'Focused node was removed.',
    });
  });

  it('creates compact event ids from timestamp and random suffix', () => {
    expect(createRuntimeEventId(123456789, 0.123456)).toMatch(/^[a-z0-9]+-[a-z0-9]{6}$/);
    expect(createRuntimeEventId(123456789, 0.123456)).toBe('21i3v9-4fzyo8');
  });
});
