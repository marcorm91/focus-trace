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

  it('uses a meaningful descendant accessible name instead of marking an image heading as empty', () => {
    render(`
      <main>
        <h1 title="elDiario.es - Noticias de actualidad - Periodismo a pesar de todo">
          <a href="/" aria-label="elDiario.es Noticias de actualidad - Periodismo a pesar de todo">
            <img src="logo.svg" alt="elDiario.es - Noticias de actualidad - Periodismo a pesar de todo">
          </a>
        </h1>
      </main>
    `);
    const [heading] = collectHeadingOutline();
    expect(heading?.signals).not.toContain('empty');
    expect(heading?.text).toBe('elDiario.es Noticias de actualidad - Periodismo a pesar de todo');
  });

  it('keeps an image-only heading empty when its descendant has no accessible name', () => {
    render('<main><h1><a href="/"><img src="logo.svg" alt=""></a></h1></main>');
    const [heading] = collectHeadingOutline();
    expect(heading?.signals).toContain('empty');
    expect(heading?.text).toBe('');
  });

  it('marks an outline that starts below H1 for review', () => {
    render('<main><h2>Section before title</h2><h1>Page title</h1><h2>Content</h2></main>');
    const outline = collectHeadingOutline();
    expect(outline[0]?.level).toBe(2);
    expect(outline[0]?.signals).toContain('level-jump');
    expect(outline[1]?.signals).not.toContain('level-jump');
  });

  it('ignores programmatically hidden headings', () => {
    render('<main><h1>Store</h1><h2 hidden>Hidden</h2><h2>Products</h2></main>');
    expect(collectHeadingOutline().map((heading) => heading.text)).toEqual(['Store', 'Products']);
  });
});
