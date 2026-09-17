// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { evaluateBypassBlocks } from '../lib/audit/bypass-blocks';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Bypass test</title></head><body>${body}</body></html>`);
  document.close();
}

function nav(items = 3): string {
  return `<nav aria-label="Primary">${Array.from({ length: items }, (_, index) => `<a href="/page-${index + 1}">Item ${index + 1}</a>`).join('')}</nav>`;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('WCAG 2.4.1 bypass blocks review', () => {
  it('passes a keyboard-focusable fragment link before navigation when its target is inside main', () => {
    render(`
      <a id="jump" href="#article-start">Continue directly</a>
      ${nav()}
      <main id="main"><h1 id="article-start">Article</h1></main>
    `);

    expect(evaluateBypassBlocks()).toMatchObject({ status: 'pass', target: document.querySelector('#jump') });
  });

  it('does not depend on literal skip-link wording', () => {
    render(`
      <a id="jump" href="#primary">Weiter</a>
      ${nav()}
      <main id="primary"><h1>Article</h1></main>
    `);

    expect(evaluateBypassBlocks().status).toBe('pass');
  });

  it('reviews substantial navigation before main when no keyboard bypass link is validated', () => {
    render(`${nav()}<main id="main"><h1>Article</h1></main>`);

    const evaluation = evaluateBypassBlocks();
    expect(evaluation.status).toBe('review');
    expect(evaluation.target).toBe(document.querySelector('nav'));
    expect(evaluation.evidence).toContain('3 sequential keyboard stops');
  });

  it('reviews substantial navigation when the page has no exposed main landmark', () => {
    render(`${nav()}<div class="content"><h1>Article</h1></div>`);

    const evaluation = evaluateBypassBlocks();
    expect(evaluation.status).toBe('review');
    expect(evaluation.target).toBe(document.querySelector('nav'));
    expect(evaluation.evidence).toContain('No exposed main landmark');
  });

  it('reviews an early likely bypass link whose fragment target is missing', () => {
    render(`
      <a id="jump" href="#main-content">Skip to main content</a>
      ${nav()}
      <main><h1>Article</h1></main>
    `);

    const evaluation = evaluateBypassBlocks();
    expect(evaluation).toMatchObject({ status: 'review', target: document.querySelector('#jump') });
    expect(evaluation.evidence).toContain('missing fragment target #main-content');
  });

  it('reviews an early likely bypass link with a missing target even when main is absent', () => {
    render(`
      <a id="jump" href="#main-content">Skip to main content</a>
      ${nav()}
      <div class="content"><h1>Article</h1></div>
    `);

    const evaluation = evaluateBypassBlocks();
    expect(evaluation).toMatchObject({ status: 'review', target: document.querySelector('#jump') });
    expect(evaluation.evidence).toContain('missing fragment target #main-content');
  });

  it('does not treat a fragment target outside main as a validated bypass', () => {
    render(`
      <a id="jump" href="#utility">Jump</a>
      <div id="utility">Utility</div>
      ${nav()}
      <main id="main"><h1>Article</h1></main>
    `);

    expect(evaluateBypassBlocks().status).toBe('review');
  });

  it('does not require a bypass review for a short navigation block', () => {
    render(`${nav(2)}<main id="main"><h1>Article</h1></main>`);
    expect(evaluateBypassBlocks().status).toBe('inapplicable');
  });

  it('remains inapplicable without main when navigation is too short to require review', () => {
    render(`${nav(2)}<div class="content"><h1>Article</h1></div>`);
    expect(evaluateBypassBlocks().status).toBe('inapplicable');
  });

  it('runs only for full-page scans and exposes WCAG 2.4.1 as REVIEW', () => {
    render(`${nav()}<main id="main"><section id="component"><button aria-label="Continue">Continue</button></section></main>`);

    const fullPage = runFocusTraceScan();
    const component = runFocusTraceScan({
      type: 'component',
      selector: '#component',
      tag: 'section',
      label: 'Component',
    });

    expect(fullPage.review.some((issue) => issue.ruleId === 'FT-REVIEW-012')).toBe(true);
    expect(fullPage.ruleResults?.find((entry) => entry.ruleId === 'FT-REVIEW-012')).toMatchObject({
      applicable: 1,
      passed: 0,
      failures: 0,
      reviews: 1,
      warnings: 0,
    });
    expect(fullPage.review.find((issue) => issue.ruleId === 'FT-REVIEW-012')?.references)
      .toEqual(expect.arrayContaining([expect.objectContaining({ type: 'WCAG', id: '2.4.1', level: 'A' })]));
    expect(component.ruleResults?.some((entry) => entry.ruleId === 'FT-REVIEW-012')).toBe(false);
    expect(component.review.some((issue) => issue.ruleId === 'FT-REVIEW-012')).toBe(false);
  });

  it('surfaces missing main as a full-page WCAG 2.4.1 review', () => {
    render(`${nav()}<div class="content"><h1>Article</h1></div>`);

    const fullPage = runFocusTraceScan();
    const issue = fullPage.review.find((entry) => entry.ruleId === 'FT-REVIEW-012');

    expect(issue).toBeDefined();
    expect(issue?.evidence).toContain('No exposed main landmark');
    expect(fullPage.ruleResults?.find((entry) => entry.ruleId === 'FT-REVIEW-012')).toMatchObject({
      applicable: 1,
      passed: 0,
      failures: 0,
      reviews: 1,
      warnings: 0,
    });
  });
});
