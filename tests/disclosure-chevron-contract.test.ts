import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('scan disclosure chevron', () => {
  it('adds the shared SVG-mask chevron to accessible-name calculation disclosures', () => {
    const entry = source('entrypoints/sidepanel/index.css');
    const css = source('entrypoints/sidepanel/disclosure-chevron.css');

    expect(entry).toContain("url('./disclosure-chevron.css') layer(components)");
    expect(css).toContain('.name-computation > summary::after');
    expect(css).toContain('var(--ft-i-chevron-right)');
    expect(css).toContain('.name-computation[open] > summary::after');
    expect(css).toContain('var(--ft-i-chevron-down)');
    expect(css).not.toContain('!important');
  });
});
