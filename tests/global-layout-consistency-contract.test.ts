import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('global layout and card surface consistency', () => {
  it('lets every top-level subtitle use its full available width', () => {
    const css = source('entrypoints/sidepanel/global-layout-consistency.css');

    expect(css).toContain('.section-heading > div,');
    expect(css).toContain('.replay-heading > div,');
    expect(css).toContain('.trace-hero-copy,');
    expect(css).toContain('.trace-first-report > .report-hero > div:first-child');
    expect(css).toContain('.section-heading p,');
    expect(css).toContain('width: 100%;');
    expect(css).toContain('max-width: none;');
  });

  it('uses a two-column language selector and removes the standards notice', () => {
    const settings = source('entrypoints/sidepanel/views/SettingsView.tsx');
    const css = source('entrypoints/sidepanel/global-layout-consistency.css');

    expect(settings).toContain('className="settings-group settings-language-group"');
    expect(settings).not.toContain('Standards stay canonical');
    expect(settings).not.toContain('Los estándares mantienen su nomenclatura oficial');
    expect(css).toContain('.settings-language-group {');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(css).toContain('.settings-language-group > .settings-help');
  });

  it('keeps cards and every accordion family on the shared theme surface', () => {
    const entry = source('entrypoints/sidepanel/index.css');
    const css = source('entrypoints/sidepanel/global-layout-consistency.css');

    expect(entry).toContain("@import url('./global-layout-consistency.css') layer(policy);");
    expect(css).toContain('.settings-group,');
    expect(css).toContain('.scan-rule-group,');
    expect(css).toContain('.report-rule-group,');
    expect(css).toContain('.report-section,');
    expect(css).toContain('.trace-accordion,');
    expect(css).toContain('.instructions-card,');
    expect(css).toContain('background: var(--ft-surface, #fff);');
    expect(css).not.toContain('!important');
  });
});
