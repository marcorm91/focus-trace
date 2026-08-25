// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { collectHeadingOutline } from '../lib/audit/scan';

function render(body: string): void {
  document.body.innerHTML = body;
}

describe('heading outline', () => {
  it('keeps the visible H1-H6 order and levels', () => {
    render('<main><h1>Store</h1><h2>Products</h2><h3>Featured</h3><h2>Help</h2></main>');
    expect(collectHeadingOutline().map(({ level, text }) => ({ level, text }))).toEqual([
      { level: 1, text: 'Store' },
      { level: 2, text: 'Products' },
      { level: 3, text: 'Featured' },
      { level: 2, text: 'Help' },
    ]);
  });

  it('marks multiple H1 elements for review without turning them into a scan failure', () => {
    render('<main><h1>Store</h1><section><h2>Products</h2></section><footer><h1>Help</h1></footer></main>');
    const outline = collectHeadingOutline();
    expect(outline.filter((heading) => heading.signals.includes('multiple-h1'))).toHaveLength(2);
  });

  it('marks empty headings and skipped levels', () => {
    render('<main><h1>Store</h1><h3>Featured</h3><h4>   </h4></main>');
    const outline = collectHeadingOutline();
    expect(outline[1]?.signals).toContain('level-jump');
    expect(outline[2]?.signals).toContain('empty');
  });

  it('ignores programmatically hidden headings', () => {
    render('<main><h1>Store</h1><h2 hidden>Hidden</h2><h2>Products</h2></main>');
    expect(collectHeadingOutline().map((heading) => heading.text)).toEqual(['Store', 'Products']);
  });
});
