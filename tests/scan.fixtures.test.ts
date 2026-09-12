// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import { localizedScanIssue } from '../shared/i18n';

function loadFixture(name: 'pass' | 'fail') {
  const path = resolve(process.cwd(), 'tests', 'fixtures', `${name}.html`);
  const html = readFileSync(path, 'utf8');
  document.open();
  document.write(html);
  document.close();
}

function render(htmlAttributes: string, body = '<main><h1>Test</h1></main>', styles = '') {
  document.open();
  document.write(`<!doctype html><html ${htmlAttributes}><head><title>Test</title>${styles ? `<style>${styles}</style>` : ''}</head><body>${body}</body></html>`);
  document.close();
}

describe('FocusTrace WCAG rule fixtures', () => {
  it('produces no findings for the passing fixture', () => {
    loadFixture('pass');
    const result = runFocusTraceScan();
    expect(result.rulesRun).toBe(62);
    expect(result.issues).toEqual([]);
    expect(result.review).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.ruleResults).toHaveLength(result.rulesRun);
    expect(new Set(result.ruleResults?.map((rule) => rule.ruleId)).size).toBe(result.rulesRun);
    expect(result.passes).toBe(result.ruleResults?.reduce((sum, rule) => sum + rule.passed, 0));
    expect(result.ruleResults?.every((rule) =>
      rule.applicable === rule.passed + rule.failures + rule.reviews + rule.warnings)).toBe(true);
  });

  it('produces the expected deterministic failures and review signals', () => {
    loadFixture('fail');
    const result = runFocusTraceScan();
    expect(result.issues.map((issue) => issue.ruleId).sort()).toEqual([
      'FT-WCAG-001',
      'FT-WCAG-002',
      'FT-WCAG-003',
      'FT-WCAG-004',
      'FT-WCAG-005',
      'FT-WCAG-006',
    ]);
    expect(result.review.map((issue) => issue.ruleId).sort()).toEqual([
      'FT-REVIEW-001',
      'FT-REVIEW-002',
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('treats placeholder as an accessible-name fallback but requests label review', () => {
    render('lang="en"', '<main><h1>Search</h1><input id="query" type="search" placeholder="Search products"></main>');
    const result = runFocusTraceScan();
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-004')).toBe(false);
    expect(result.review.map((issue) => issue.ruleId)).toContain('FT-REVIEW-003');
  });

  it('reviews missing and repeated main landmarks without promoting them to WCAG failures', () => {
    render('lang="en"', '<h1>Page without main</h1>');
    let result = runFocusTraceScan();
    expect(result.review.map((issue) => issue.ruleId)).toContain('FT-REVIEW-004');
    expect(result.issues.map((issue) => issue.ruleId)).not.toContain('FT-REVIEW-004');

    render('lang="en"', '<main id="primary"><h1>One</h1></main><div id="secondary" role="main" aria-label="Secondary"></div>');
    result = runFocusTraceScan();
    const multiple = result.review.filter((issue) => issue.ruleId === 'FT-REVIEW-005');
    expect(multiple).toHaveLength(2);
    expect(multiple.map((issue) => issue.targets[0])).toEqual(expect.arrayContaining(['#primary', '#secondary']));
  });

  it('adds native-semantics recommendations to Review and keeps ambiguous interaction manual', () => {
    render(
      'lang="en"',
      `<main><h1>Actions</h1>
        <div id="open" role="button" tabindex="0">Open modal</div>
        <div id="products" onclick="window.location.href='/products'">Products</div>
        <div id="card" onclick="selectCard()">Select card</div>
      </main>`,
    );
    const result = runFocusTraceScan();

    const button = result.review.find((issue) => issue.ruleId === 'FT-REVIEW-006');
    const link = result.review.find((issue) => issue.ruleId === 'FT-REVIEW-007');
    const generic = result.review.find((issue) => issue.ruleId === 'FT-REVIEW-008');

    expect(button?.targets).toEqual(['#open']);
    expect(button?.evidence).toContain('Recommended native element: <button type="button">');
    expect(link?.targets).toEqual(['#products']);
    expect(link?.evidence).toContain('Recommended native element: <a href="…">');
    expect(generic?.targets).toEqual(['#card']);
    expect(generic?.evidence).toContain('recommendation withheld');
  });

  it('reviews a heading outline that starts below H1 instead of failing it', () => {
    render('lang="en"', '<main><h2 id="intro">Intro</h2><h1>Page title</h1><h2>Content</h2></main>');
    const result = runFocusTraceScan();
    const review = result.review.find((issue) => issue.ruleId === 'FT-REVIEW-002' && issue.targets.includes('#intro'));
    expect(review?.outcome).toBe('review');
    expect(review?.evidence).toContain('starts with H2 before any H1');
    expect(result.issues.some((issue) => issue.ruleId === 'FT-REVIEW-002')).toBe(false);
  });

  it('accepts an icon-only button named by its descendant SVG', () => {
    render(
      'lang="en"',
      '<main><h1>Store</h1><button id="home"><svg role="img" aria-label="Zara Pre-owned, go to home"><path></path></svg></button></main>',
    );
    const result = runFocusTraceScan();
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-003')).toBe(false);
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-002')).toBe(false);
  });

  it('attaches accessible-name calculation context to empty-name failures', () => {
    render('lang="en"', '<main><h1>Store</h1><button id="empty"><svg aria-hidden="true"></svg></button></main>');
    const result = runFocusTraceScan();
    const issue = result.issues.find((item) => item.ruleId === 'FT-WCAG-003');
    expect(issue?.accessibleName).toMatchObject({ name: '', role: 'button' });
  });
});
