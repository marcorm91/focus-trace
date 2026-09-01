import { describe, expect, it } from 'vitest';
import { SUPPORT_URL } from '../shared/project-links';
import { mountSupportFooter } from '../shared/support-footer';

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

  it('mounts one accessible global footer when support is enabled', () => {
    document.documentElement.lang = 'es';
    const cleanup = mountSupportFooter('https://example.com/support');

    const footer = document.querySelector('[data-focustrace-support-footer]');
    const link = footer?.querySelector('a');
    expect(footer).not.toBeNull();
    expect(link?.textContent).toContain('Apoyar FocusTrace');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');

    mountSupportFooter('https://example.com/support');
    expect(document.querySelectorAll('[data-focustrace-support-footer]')).toHaveLength(1);

    cleanup();
    expect(document.querySelector('[data-focustrace-support-footer]')).toBeNull();
  });
});
