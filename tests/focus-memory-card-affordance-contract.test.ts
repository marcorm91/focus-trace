import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('FocusTrace Memory finding affordance', () => {
  it('makes current findings whole-card locate actions without wrapping table semantics', () => {
    const history = source('entrypoints/sidepanel/components/FocusMemoryHistory.tsx');
    const css = source('entrypoints/sidepanel/memory-interactions.css');

    expect(history).toContain("item.state !== 'resolved'");
    expect(history).toContain("' is-locatable'");
    expect(history).toContain('className="focus-memory-finding-link"');
    expect(history).toContain('className="focus-memory-finding-card-chevron"');
    expect(history).toContain('<table');

    expect(css).toContain('.focus-memory-finding.is-locatable:hover');
    expect(css).toContain('.focus-memory-finding-link {');
    expect(css).toContain('position: absolute;');
    expect(css).toContain('inset: 0;');
    expect(css).toContain('cursor: pointer;');
    expect(css).toContain('.focus-memory-finding-link:focus-visible');
    expect(css).toContain('outline: 2px solid var(--ft-focus);');
  });

  it('uses drawn, centered chevrons and adapts the pager on narrow panels', () => {
    const history = source('entrypoints/sidepanel/components/FocusMemoryHistory.tsx');
    const css = source('entrypoints/sidepanel/memory-interactions.css');

    expect(history).toContain('focus-memory-pager-chevron is-previous');
    expect(history).toContain('focus-memory-pager-chevron is-next');
    expect(history).not.toContain('‹');
    expect(history).not.toContain('›');

    expect(css).toContain('.focus-memory-pager-chevron {');
    expect(css).toContain('border-inline-end: 2px solid currentColor;');
    expect(css).toContain('border-block-end: 2px solid currentColor;');
    expect(css).toContain('place-items: center;');
    expect(css).toContain('width: 38px;');
    expect(css).toContain('min-height: 38px;');
    expect(css).toContain('grid-template-columns: 38px minmax(0, 1fr) 38px;');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
