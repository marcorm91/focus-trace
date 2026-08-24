// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';

function loadFixture(name: 'pass' | 'fail') {
  const html = readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), 'utf8');
  document.open();
  document.write(html);
  document.close();
}

describe('FocusTrace WCAG rule fixtures', () => {
  it('produces no findings for the passing fixture', () => {
    loadFixture('pass');

    const result = runFocusTraceScan();

    expect(result.rulesRun).toBe(8);
    expect(result.issues).toEqual([]);
    expect(result.review).toEqual([]);
    expect(result.passes).toBe(8);
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
});
