// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';

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
    expect(result.rulesRun).toBe(16);
    expect(result.issues).toEqual([]);
    expect(result.review).toEqual([]);
    expect(result.warnings).toEqual([]);
    // passes counts successful rule/target evaluations, not only rule definitions.
    expect(result.passes).toBeGreaterThanOrEqual(result.rulesRun);
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
