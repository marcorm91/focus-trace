import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('UX polish contract', () => {
  it('keeps the representative-template Site Audit copy concise in both languages', () => {
    const copy = source('entrypoints/site-audit/hero-copy.ts');
    expect(copy).toContain('Analyze representative site templates');
    expect(copy).toContain('Analiza plantillas representativas del sitio');
    expect(copy).not.toContain('thousands of duplicates');
    expect(source('entrypoints/site-audit/index.html')).toContain('./hero-copy.ts');
  });

  it('draws all H1-H6 depths with explicit visual tree connectors', () => {
    const css = source('entrypoints/sidepanel/heading-tree-visual.css');
    for (let level = 1; level <= 6; level += 1) {
      expect(css).toContain(`.heading-tree-row.level-${level}`);
    }
    expect(css).toContain('.heading-tree-row:not(.level-1)::before');
    expect(css).toContain('border-bottom-left-radius');
  });

  it('uses the same modern SVG-mask icon language for primary navigation and actions', () => {
    const css = source('entrypoints/sidepanel/modern-icons.css');
    expect(css).toContain('--ft-i-review');
    expect(css).toContain('--ft-i-trace');
    expect(css).toContain('--ft-i-headings');
    expect(css).toContain('--ft-i-report');
    expect(css).toContain('--ft-i-page-scan');
    expect(css).toContain('--ft-i-site');
    expect(css).toContain('--ft-i-code');
    expect(css).toContain('-webkit-mask: var(--ft-mask)');

    const entry = source('entrypoints/sidepanel/main.tsx');
    expect(entry).toContain("import './heading-tree-visual.css';");
    expect(entry).toContain("import './modern-icons.css';");
  });
});
