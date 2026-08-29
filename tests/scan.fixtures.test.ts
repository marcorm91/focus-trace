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
    expect(result.rulesRun).toBe(23);
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
    const issue = result.issues.find((candidate) => candidate.ruleId === 'FT-WCAG-003');
    expect(issue?.accessibleName).toMatchObject({
      name: '',
      source: 'none',
      role: 'button',
    });
  });

  it('fails FT-WCAG-008 when html lang is missing and leaves FT-WCAG-009 inapplicable', () => {
    render('');
    const result = runFocusTraceScan();
    expect(result.issues.map((issue) => issue.ruleId)).toContain('FT-WCAG-008');
    expect(result.issues.map((issue) => issue.ruleId)).not.toContain('FT-WCAG-009');
  });

  it('fails FT-WCAG-009 when the primary language subtag is unknown', () => {
    render('lang="em-US"');
    const result = runFocusTraceScan();
    expect(result.issues.map((issue) => issue.ruleId)).toContain('FT-WCAG-009');
  });

  it('accepts a known primary subtag even when later subtags are non-standard', () => {
    render('lang="en-US-GB"');
    const result = runFocusTraceScan();
    expect(result.issues.map((issue) => issue.ruleId)).not.toContain('FT-WCAG-009');
  });

  it('reports deprecated ARIA roles as warnings rather than WCAG failures', () => {
    render('lang="en"', '<main><h1>Test</h1><div id="directory" role="directory"><a href="#x">Item</a></div></main>');
    const result = runFocusTraceScan();
    expect(result.warnings.map((issue) => issue.ruleId)).toContain('FT-WARN-001');
    expect(result.issues.map((issue) => issue.ruleId)).not.toContain('FT-WARN-001');
  });

  it('reports role-specific deprecated ARIA properties as warnings', () => {
    render('lang="en"', '<main><h1>Test</h1><div id="alert" role="alert" aria-disabled="true">Notice</div></main>');
    const result = runFocusTraceScan();
    expect(result.warnings.map((issue) => issue.ruleId)).toContain('FT-WARN-002');
  });

  it('reports every occurrence of a duplicate non-empty HTML id as an authoring warning', () => {
    render(
      'lang="en"',
      '<main><h1>Test</h1><section id="account">First</section><section id="account">Second</section></main>',
    );
    const result = runFocusTraceScan();
    const duplicates = result.warnings.filter((issue) => issue.ruleId === 'FT-WARN-004');

    expect(duplicates).toHaveLength(2);
    expect(duplicates.every((issue) => issue.outcome === 'warning')).toBe(true);
    expect(duplicates.every((issue) => issue.evidence?.includes('id="account" is used by 2 elements'))).toBe(true);
    expect(duplicates[0]?.references[0]).toMatchObject({ type: 'HTML', id: 'id' });
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WARN-004')).toBe(false);

    const spanish = localizedScanIssue(duplicates[0]!, 'es');
    expect(spanish.title).toBe('Se utiliza un id HTML duplicado');
    expect(spanish.description).toContain('más de un elemento');
  });

  it('does not warn for unique or empty id attributes', () => {
    render(
      'lang="en"',
      '<main><h1>Test</h1><section id="account">Account</section><section id="">Anonymous</section></main>',
    );
    const result = runFocusTraceScan();
    expect(result.warnings.some((issue) => issue.ruleId === 'FT-WARN-004')).toBe(false);
  });

  it('adds low text contrast to the same full-page scan with structured evidence', () => {
    render(
      'lang="en"',
      '<main><h1>Contrast</h1><p id="low">Secondary description</p></main>',
      'html,body{background:rgb(255,255,255);color:rgb(0,0,0);font-size:16px} #low{color:rgb(119,119,119);background:rgb(255,255,255);font-size:16px;font-weight:400}',
    );
    const result = runFocusTraceScan();
    const contrast = result.issues.find((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#low'));
    expect(contrast?.contrast).toMatchObject({
      ratio: 4.48,
      requiredRatio: 4.5,
      foreground: 'rgb(119, 119, 119)',
      background: 'rgb(255, 255, 255)',
      largeText: false,
    });
  });

  it('reports every repeated low-contrast text element as a separate finding', () => {
    render(
      'lang="en"',
      '<main><h1>Contrast</h1><section id="stats"><p>32 warehouses</p><p>36 provinces</p><p>650 routes</p></section></main>',
      'html,body{background:#fff;color:#000;font-size:16px} #stats p{color:rgb(245,166,35);background:#fff;font-size:16px;font-weight:400}',
    );
    const result = runFocusTraceScan();
    const contrast = result.issues.filter((issue) => issue.ruleId === 'FT-WCAG-010');

    expect(contrast).toHaveLength(3);
    expect(new Set(contrast.flatMap((issue) => issue.targets)).size).toBe(3);
  });

  it('includes visible form values, textarea content, selected options and placeholders in contrast coverage', () => {
    render(
      'lang="en"',
      `<main><h1>Form contrast</h1>
        <label>Search <input id="query" value="Warehouses"></label>
        <label>Notes <textarea id="notes">Routes</textarea></label>
        <label>Province <select id="province"><option selected>Sevilla</option></select></label>
        <label>Filter <input id="filter" placeholder="Type a value"></label>
      </main>`,
      'html,body{background:#fff;color:#000;font-size:16px} input,textarea,select{color:rgb(190,190,190);background:#fff;font-size:16px;font-weight:400} input::placeholder{color:rgb(190,190,190)}',
    );
    const result = runFocusTraceScan();
    const formContrast = result.issues.filter((issue) => issue.ruleId === 'FT-WCAG-010');

    expect(formContrast.map((issue) => issue.targets[0])).toEqual(
      expect.arrayContaining(['#query', '#notes', '#province', '#filter']),
    );
    expect(formContrast.map((issue) => issue.contrast?.subject)).toEqual(
      expect.arrayContaining(['input value', 'textarea value', 'selected option', 'placeholder']),
    );
  });

  it('sends complex gradient contrast to review instead of fail', () => {
    render(
      'lang="en"',
      '<main><h1>Contrast</h1><p id="hero">Hero copy</p></main>',
      'html,body{background:#fff;color:#000;font-size:16px} #hero{color:rgb(119,119,119);background-image:linear-gradient(#fff,#ddd);font-size:16px}',
    );
    const result = runFocusTraceScan();
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#hero'))).toBe(false);
    const review = result.review.find((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#hero'));
    expect(review?.contrast?.reason).toContain('background image or gradient');
  });
});
