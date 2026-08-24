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

describe('FocusTrace WCAG rule fixtures', () => {
  it('produces no findings for the passing fixture', () => {
    loadFixture('pass');

    const result = runFocusTraceScan();

    expect(result.rulesRun).toBe(10);
    expect(result.issues).toEqual([]);
    expect(result.review).toEqual([]);
    expect(result.passes).toBe(10);
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
  });

  it('treats placeholder as an accessible-name fallback but requests label review', () => {
    document.open();
    document.write(`<!doctype html><html><head><title>Search</title></head><body><main><h1>Search</h1><input id="query" type="search" placeholder="Search products"></main></body></html>`);
    document.close();

    const result = runFocusTraceScan();

    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-004')).toBe(false);
    expect(result.review.map((issue) => issue.ruleId)).toContain('FT-REVIEW-003');
  });
});
