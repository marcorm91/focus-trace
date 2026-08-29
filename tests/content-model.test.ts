// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { evaluateStructuralHtml } from '../lib/audit/content-model';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body = '<main><h1>Test</h1></main>') {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Test</title></head><body>${body}</body></html>`);
  document.close();
}

function append<K extends keyof HTMLElementTagNameMap>(tag: K, parent: Element = document.body): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  parent.appendChild(element);
  return element;
}

function kinds() {
  return evaluateStructuralHtml(document).map((signal) => signal.kind);
}

describe('structural HTML semantics', () => {
  it('warns for li outside a native list and accepts ul/ol/menu parents', () => {
    render();
    const orphan = append('li');
    orphan.id = 'orphan';
    const ul = append('ul'); append('li', ul);
    const ol = append('ol'); append('li', ol);
    const menu = append('menu'); append('li', menu);

    const signals = evaluateStructuralHtml(document).filter((signal) => signal.kind === 'parent-context');
    expect(signals.map((signal) => signal.element)).toContain(orphan);
    expect(signals.filter((signal) => signal.element.tagName === 'LI')).toHaveLength(1);
  });

  it('does not invent an article-to-section parent requirement', () => {
    render('<main><article id="story"><h1>Independent story</h1><p>Body</p></article></main>');
    const result = runFocusTraceScan();
    expect(result.warnings.flatMap((issue) => issue.targets)).not.toContain('#story');
    expect(result.review.flatMap((issue) => issue.targets)).not.toContain('#story');
  });

  it('reviews unnamed sectioning content but accepts a heading or accessible name', () => {
    render(`<main><h1>Page</h1>
      <section id="unnamed"><p>Loose group</p></section>
      <section id="headed"><h2>Features</h2></section>
      <article id="named" aria-label="Release notes"><p>Update</p></article>
    </main>`);
    const result = runFocusTraceScan();
    const reviews = result.review.filter((issue) => issue.ruleId === 'FT-REVIEW-009');
    expect(reviews.map((issue) => issue.targets[0])).toContain('#unnamed');
    expect(reviews.map((issue) => issue.targets[0])).not.toContain('#headed');
    expect(reviews.map((issue) => issue.targets[0])).not.toContain('#named');
  });

  it('validates description-list ownership and dt/dd grouping', () => {
    render();
    const orphan = append('dt');
    const valid = append('dl');
    append('dt', valid).textContent = 'Term';
    append('dd', valid).textContent = 'Definition';
    const grouped = append('dl');
    const wrapper = append('div', grouped);
    append('dt', wrapper).textContent = 'Term';
    append('dd', wrapper).textContent = 'Definition';

    const signals = evaluateStructuralHtml(document);
    expect(signals.some((signal) => signal.kind === 'parent-context' && signal.element === orphan)).toBe(true);
    expect(signals.some((signal) => signal.kind === 'content-model' && (signal.element === valid || signal.element === grouped))).toBe(false);
  });

  it('validates details, figure and legend placement', () => {
    render();
    const details = append('details');
    append('div', details).textContent = 'Content before summary';
    const summary = append('summary', details);
    summary.textContent = 'Summary';

    const figure = append('figure');
    append('div', figure);
    const caption = append('figcaption', figure);
    append('div', figure);

    const fieldset = append('fieldset');
    append('input', fieldset);
    const legend = append('legend', fieldset);
    legend.textContent = 'Profile';

    const signals = evaluateStructuralHtml(document).filter((signal) => signal.kind === 'content-model');
    expect(signals.some((signal) => signal.element === details)).toBe(true);
    expect(signals.some((signal) => signal.element === caption)).toBe(true);
    expect(signals.some((signal) => signal.element === legend)).toBe(true);
  });

  it('catches table parent and child model violations created dynamically', () => {
    render();
    const table = append('table');
    const badDirect = append('div', table);
    const row = append('tr', table);
    const badRowChild = append('div', row);
    const orphanCell = append('td');

    const signals = evaluateStructuralHtml(document);
    expect(signals.some((signal) => signal.kind === 'content-model' && signal.element === badDirect)).toBe(true);
    expect(signals.some((signal) => signal.kind === 'content-model' && signal.element === badRowChild)).toBe(true);
    expect(signals.some((signal) => signal.kind === 'parent-context' && signal.element === orphanCell)).toBe(true);
  });

  it('validates picture and media source ordering without rejecting valid fallbacks', () => {
    render();
    const picture = append('picture');
    const img = append('img', picture);
    img.alt = 'Preview';
    const lateSource = append('source', picture);

    const video = append('video');
    video.setAttribute('src', 'movie.mp4');
    const source = append('source', video);
    source.setAttribute('src', 'movie.webm');

    const signals = evaluateStructuralHtml(document).filter((signal) => signal.kind === 'content-model');
    expect(signals.some((signal) => signal.element === lateSource)).toBe(true);
    expect(signals.some((signal) => signal.element === source)).toBe(true);
  });

  it('detects conflicting nested interactive content', () => {
    render();
    const anchor = append('a');
    anchor.setAttribute('href', '/account');
    const nestedButton = append('button', anchor);
    nestedButton.textContent = 'Open';

    const button = append('button');
    button.textContent = 'Action';
    const nestedLink = append('a', button);
    nestedLink.setAttribute('href', '/help');

    const signals = evaluateStructuralHtml(document).filter((signal) => signal.kind === 'nested-interactive');
    expect(signals.some((signal) => signal.element === nestedButton)).toBe(true);
    expect(signals.some((signal) => signal.element === nestedLink)).toBe(true);
  });

  it('validates label relationships without rejecting its own labeled control', () => {
    render();
    const label = append('label');
    const input = append('input', label);
    const extra = append('button', label);
    extra.textContent = 'Extra';

    const good = append('label');
    good.htmlFor = 'email';
    const email = append('input');
    email.id = 'email';

    const signals = evaluateStructuralHtml(document).filter((signal) => signal.kind === 'nested-interactive');
    expect(signals.some((signal) => signal.element === input)).toBe(false);
    expect(signals.some((signal) => signal.element === extra)).toBe(true);
    expect(signals.some((signal) => signal.element === good)).toBe(false);
  });

  it('warns when native main is nested under a disallowed ancestor', () => {
    render('<section id="shell"><main id="primary"><h1>Page</h1></main></section>');
    const result = runFocusTraceScan();
    const warning = result.warnings.find((issue) => issue.ruleId === 'FT-WARN-011');
    expect(warning?.targets).toEqual(['#primary']);
    expect(warning?.evidence).toContain('<section>');
  });

  it('reviews repeated landmarks only when their names are missing or indistinguishable', () => {
    render(`<main><h1>Page</h1></main>
      <nav id="one"><a href="/">Home</a></nav>
      <nav id="two"><a href="/help">Help</a></nav>`);
    let result = runFocusTraceScan();
    expect(result.review.filter((issue) => issue.ruleId === 'FT-REVIEW-010')).toHaveLength(2);

    render(`<main><h1>Page</h1></main>
      <nav id="one" aria-label="Primary"><a href="/">Home</a></nav>
      <nav id="two" aria-label="Support"><a href="/help">Help</a></nav>`);
    result = runFocusTraceScan();
    expect(result.review.some((issue) => issue.ruleId === 'FT-REVIEW-010')).toBe(false);
  });

  it('keeps structural authoring problems as warnings rather than WCAG failures', () => {
    render();
    append('li').id = 'orphan';
    const result = runFocusTraceScan();
    expect(result.warnings.some((issue) => issue.ruleId === 'FT-WARN-008')).toBe(true);
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WARN-008')).toBe(false);
    expect(kinds()).toContain('parent-context');
  });
});
