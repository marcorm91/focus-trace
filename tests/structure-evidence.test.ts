// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { collectStructureEvidenceInPage } from '../lib/runtime/structure-evidence';

describe('Structure evidence collector', () => {
  beforeEach(() => {
    document.title = 'Structure fixture';
    document.body.innerHTML = '';
  });

  it('collects accessibility-oriented structural metrics in one lightweight snapshot', () => {
    document.body.innerHTML = `
      <header><nav aria-label="Primary"><a href="/">Home</a></nav></header>
      <main>
        <h1>Title</h1>
        <h2>Section</h2>
        <ul><li>One</li><li>Two</li></ul>
        <form aria-label="Search"><input aria-label="Query"><button>Go</button></form>
        <table><tr><th>Column</th></tr></table>
        <img alt="Example">
      </main>
      <footer>Footer</footer>
    `;

    const snapshot = collectStructureEvidenceInPage();
    const metrics = snapshot.metrics;

    expect(metrics.headingCount).toBe(2);
    expect(metrics.landmarkCount).toBeGreaterThanOrEqual(4);
    expect(metrics.listCount).toBe(1);
    expect(metrics.formCount).toBe(1);
    expect(metrics.buttonCount).toBe(1);
    expect(metrics.linkCount).toBe(1);
    expect(metrics.formControlCount).toBe(1);
    expect(metrics.tableCount).toBe(1);
    expect(metrics.imageCount).toBe(1);
    expect(snapshot.metricTargets.find((metric) => metric.id === 'lists')).toMatchObject({ count: 1 });
    expect(snapshot.metricTargets.find((metric) => metric.id === 'buttons')?.selector).toContain('[role="button"]');
  });

  it('keeps Semantics focused on concrete native-HTML opportunities with element evidence', () => {
    document.body.innerHTML = `
      <main>
        <div id="fake-button" role="button" tabindex="0">Save</div>
        <span id="fake-link" role="link">Open account</span>
        <div id="fake-heading" role="heading" aria-level="2">Section title</div>
        <div id="clickable" onclick="void 0">Open menu</div>
        <span id="focusable" tabindex="0">Custom control</span>
      </main>
    `;

    const snapshot = collectStructureEvidenceInPage();
    const titles = snapshot.hints.map((hint) => hint.title);

    expect(titles).toEqual(expect.arrayContaining([
      'Generic element used as a button',
      'Generic element used as a link',
      'Generic element used as a heading',
      'Generic element with click handler',
      'Generic element in the tab order',
    ]));

    const buttonHint = snapshot.hints.find((hint) => hint.title === 'Generic element used as a button');
    expect(buttonHint?.selector).toBe('#fake-button');
    expect(buttonHint?.element).toMatchObject({
      tag: 'div',
      role: 'button',
      id: 'fake-button',
      tabindex: '0',
      trigger: 'role="button"',
    });
  });

  it('does not run the removed repeated-sibling and wrapper-chain heuristics', () => {
    document.body.innerHTML = `
      <main>
        <div><div><div><div><div>Deep content</div></div></div></div></div>
        <div class="items">
          <div class="item">One</div>
          <div class="item">Two</div>
          <div class="item">Three</div>
        </div>
      </main>
    `;

    const snapshot = collectStructureEvidenceInPage();
    const titles = snapshot.hints.map((hint) => hint.title);

    expect(titles).not.toContain('Repeated sibling structure');
    expect(titles).not.toContain('Deep generic wrapper chain');
    expect(titles).not.toContain('High <div> density');
  });

  it('stops sampling when the configured safety limit is reached', () => {
    const container = document.createElement('main');
    container.innerHTML = '<span></span>'.repeat(150);
    document.body.append(container);

    const snapshot = collectStructureEvidenceInPage({
      maxElements: 100,
      maxHints: 20,
    });

    expect(snapshot.sampledElements).toBe(100);
    expect(snapshot.truncated).toBe(true);
  });
});
