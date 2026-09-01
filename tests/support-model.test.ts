import { describe, expect, it } from 'vitest';
import { SUPPORT_URL } from '../shared/project-links';

describe('voluntary support configuration', () => {
  it('keeps support disabled until a real destination is configured', () => {
    if (SUPPORT_URL === null) {
      expect(SUPPORT_URL).toBeNull();
      return;
    }

    const url = new URL(SUPPORT_URL);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).not.toBe('localhost');
  });
});
