// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Contrast policy</title><style>html,body{margin:0;background:#fff;color:#000;font-size:16px}</style></head><body>${body}</body></html>`);
  document.close();
}

describe('unresolved contrast review policy', () => {
  it('does not surface text-contrast review findings without a resolved background', () => {
    render('<p id="gradient" style="color:#777;background-image:linear-gradient(#fff,#eee);font-size:16px">Gradient text</p>');

    const scan = runFocusTraceScan();
    const review = scan.review.find(
      (issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#gradient'),
    );

    expect(review).toBeUndefined();
    expect(scan.review.filter((issue) => issue.ruleId === 'FT-WCAG-010').every((issue) => Boolean(issue.contrast?.background))).toBe(true);
  });

  it('does not surface non-text contrast review findings without a resolved adjacent color', () => {
    render('<button id="css-icon" aria-label="Menu" style="border:0;background-image:url(menu.svg)"></button>');

    const scan = runFocusTraceScan();
    const review = scan.review.find(
      (issue) => issue.ruleId === 'FT-WCAG-011' && issue.targets.includes('#css-icon'),
    );

    expect(review).toBeUndefined();
    expect(scan.review.filter((issue) => issue.ruleId === 'FT-WCAG-011').every((issue) => Boolean(issue.contrast?.background))).toBe(true);
  });
});
