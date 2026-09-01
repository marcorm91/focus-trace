// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SUPPORT_URL } from '../shared/project-links';
import { mountSupportFooter } from '../shared/support-footer';

describe('voluntary support configuration', () => {
  it('uses only a public HTTPS support destination when enabled', () => {
    if (SUPPORT_URL === null) {
      expect(SUPPORT_URL).toBeNull();
      return;
    }

    const url = new URL(SUPPORT_URL);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).not.toBe('localhost');
  });

  it('uses the reviewed GitHub Sponsors destination for this release', () => {
    expect(SUPPORT_URL).toBe('https://github.com/sponsors/marcorm91');
  });

  it('mounts one accessible global footer when support is enabled', () => {
    document.documentElement.lang = 'es';
    const cleanup = mountSupportFooter('https://example.com/support');

    const footer = document.querySelector('[data-focustrace-support-footer]');
    const link = footer?.querySelector('a');
    const icon = footer?.querySelector('svg.ft-support-footer-icon');
    expect(footer).not.toBeNull();
    expect(document.body.classList.contains('ft-support-footer-host')).toBe(true);
    expect(link?.textContent).toContain('Apoyar FocusTrace');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.querySelector('path')).not.toBeNull();

    mountSupportFooter('https://example.com/support');
    expect(document.querySelectorAll('[data-focustrace-support-footer]')).toHaveLength(1);

    cleanup();
    expect(document.querySelector('[data-focustrace-support-footer]')).toBeNull();
    expect(document.body.classList.contains('ft-support-footer-host')).toBe(false);
  });

  it('keeps the support heart filled and outlined in red outside forced-colors mode', () => {
    const supportCss = readFileSync(resolve(process.cwd(), 'shared/support-footer.css'), 'utf8');
    expect(supportCss).toContain('color: #d93025');
    expect(supportCss).toContain('fill: currentColor');
    expect(supportCss).toContain('stroke: currentColor');
  });

  it('includes support in interactive surfaces but not printable reports', () => {
    const siteAuditHtml = readFileSync(
      resolve(process.cwd(), 'entrypoints/site-audit/index.html'),
      'utf8',
    );
    const printHtml = readFileSync(
      resolve(process.cwd(), 'entrypoints/report-print/index.html'),
      'utf8',
    );
    const printMain = readFileSync(
      resolve(process.cwd(), 'entrypoints/report-print/main.tsx'),
      'utf8',
    );

    expect(siteAuditHtml).toContain('./support-footer.ts');
    expect(printHtml).not.toContain('support-footer');
    expect(printMain).not.toContain('support-footer');
    expect(printMain).not.toContain('SUPPORT_URL');
  });
});
