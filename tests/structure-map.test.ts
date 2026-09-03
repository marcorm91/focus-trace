// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { collectStructureMapInPage, type StructureNode } from '../lib/runtime/structure-map';

function flatten(nodes: StructureNode[]): StructureNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

describe('Structure DOM collector', () => {
  beforeEach(() => {
    document.title = 'Structure fixture';
    document.body.innerHTML = '';
  });

  it('builds a simplified semantic tree and groups repeated structural siblings', () => {
    document.body.innerHTML = `
      <div class="page-shell">
        <header>
          <nav aria-label="Primary"><a href="/">Home</a></nav>
        </header>
        <main>
          <div class="layout-wrapper">
            <section aria-label="News">
              <article class="card"><h2>One</h2><a href="/one">Read</a></article>
              <article class="card"><h2>Two</h2><a href="/two">Read</a></article>
              <article class="card"><h2>Three</h2><a href="/three">Read</a></article>
            </section>
          </div>
        </main>
        <footer>Footer</footer>
      </div>
    `;

    const snapshot = collectStructureMapInPage();
    const nodes = flatten(snapshot.roots);

    expect(nodes.some((node) => node.tag === 'header')).toBe(true);
    expect(nodes.some((node) => node.tag === 'main')).toBe(true);
    expect(nodes.some((node) => node.tag === 'footer')).toBe(true);
    expect(nodes.find((node) => node.tag === 'nav')?.label).toBe('Primary');
    expect(nodes.find((node) => node.tag === 'article')?.count).toBe(3);
    expect(snapshot.metrics.landmarkCount).toBeGreaterThanOrEqual(4);
    expect(snapshot.metrics.semanticElements).toBeGreaterThan(0);
  });

  it('marks semantic opportunities as review hints instead of WCAG failures', () => {
    document.body.innerHTML = `
      <main>
        <div id="fake-button" role="button" tabindex="0" onclick="void 0">Save</div>
        <div id="items">
          <div class="item"><span>One</span></div>
          <div class="item"><span>Two</span></div>
          <div class="item"><span>Three</span></div>
        </div>
        <div id="link-group">
          <a href="/one">One</a>
          <a href="/two">Two</a>
          <a href="/three">Three</a>
        </div>
      </main>
    `;

    const snapshot = collectStructureMapInPage();
    const titles = snapshot.hints.map((hint) => hint.title);

    expect(titles).toContain('Generic element used as a control');
    expect(titles).toContain('Repeated sibling structure');
    expect(titles).toContain('Navigation-like link group');
    expect(snapshot.hints.every((hint) => hint.tone === 'review' || hint.tone === 'info')).toBe(true);
  });

  it('detects deep generic wrapper chains', () => {
    document.body.innerHTML = `
      <main>
        <div id="chain-start"><div><div><div><div><section aria-label="Target">Content</section></div></div></div></div></div>
      </main>
    `;

    const snapshot = collectStructureMapInPage();

    expect(snapshot.metrics.maxGenericChain).toBeGreaterThanOrEqual(4);
    expect(snapshot.metrics.deepGenericChains).toBeGreaterThanOrEqual(1);
    expect(snapshot.hints.some((hint) => hint.title === 'Deep generic wrapper chain')).toBe(true);
  });

  it('stops sampling very large DOMs at the safety limit', () => {
    const container = document.createElement('main');
    container.innerHTML = '<span></span>'.repeat(10_050);
    document.body.append(container);

    const snapshot = collectStructureMapInPage();

    expect(snapshot.metrics.totalElements).toBe(10_000);
    expect(snapshot.truncated).toBe(true);
  }, 15_000);
});
