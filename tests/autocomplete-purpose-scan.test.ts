// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import type { ComponentScanScope } from '../shared/types';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Input purpose</title></head><body><main><h1>Form</h1>${body}</main></body></html>`);
  document.close();
}

describe('FT-REVIEW-014 scan integration', () => {
  it('emits review evidence for malformed standard-like autocomplete syntax', () => {
    render('<label>Email <input id="email" autocomplete="shipping"></label>');
    const result = runFocusTraceScan();
    const issue = result.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-014');
    const rule = result.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-014');

    expect(issue?.targets).toEqual(['#email']);
    expect(issue?.evidence).toContain('autocomplete="shipping"');
    expect(issue?.outcome).toBe('review');
    expect(rule).toMatchObject({ applicable: 1, passed: 0, failures: 0, reviews: 1, warnings: 0 });
  });

  it('records a pass only for the tested valid standard token expectation', () => {
    render('<label>Email <input id="email" autocomplete="email"></label>');
    const result = runFocusTraceScan();
    const rule = result.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-014');

    expect(result.review.some((candidate) => candidate.ruleId === 'FT-REVIEW-014')).toBe(false);
    expect(rule).toMatchObject({ applicable: 1, passed: 1, failures: 0, reviews: 0, warnings: 0 });
  });

  it('keeps component analysis scoped to autocomplete controls inside the selected subtree', () => {
    render(`
      <section id="checkout"><label>Email <input id="inside" autocomplete="shipping"></label></section>
      <label>Other <input id="outside" autocomplete="billing"></label>
    `);
    const scope: ComponentScanScope = { type: 'component', selector: '#checkout', tag: 'section', label: 'Checkout' };
    const result = runFocusTraceScan(scope);
    const issues = result.review.filter((candidate) => candidate.ruleId === 'FT-REVIEW-014');

    expect(issues).toHaveLength(1);
    expect(issues[0]?.targets).toEqual(['#inside']);
  });
});
