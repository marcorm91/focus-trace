// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import type { ComponentScanScope } from '../shared/types';

function rect(top = 10): DOMRect {
  return {
    x: 10,
    y: top,
    top,
    left: 10,
    right: 170,
    bottom: top + 20,
    width: 160,
    height: 20,
    toJSON: () => ({}),
  } as DOMRect;
}

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Text spacing</title></head><body><main><h1>Spacing</h1>${body}</main></body></html>`);
  document.close();
}

const originalGetClientRects = (Range.prototype as Range & { getClientRects?: () => DOMRectList }).getClientRects;

beforeEach(() => {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value(this: Range) {
      const node = this.startContainer;
      const parent = node instanceof Text ? node.parentElement : null;
      if (!parent) return [];
      if (parent.dataset.wrap === 'true') return [rect(10), rect(34)];
      return [rect(10)];
    },
  });
});

afterEach(() => {
  if (originalGetClientRects) {
    Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: originalGetClientRects });
  } else {
    delete (Range.prototype as Range & { getClientRects?: () => DOMRectList }).getClientRects;
  }
});

describe('FT-REVIEW-016 scan integration', () => {
  it('emits REVIEW with only the property-specific ACT reference', () => {
    render('<p id="target" style="font-size: 20px; letter-spacing: 2px !important">Readable text</p>');
    const result = runFocusTraceScan();
    const issue = result.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-016');
    const rule = result.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-016');

    expect(issue?.targets).toEqual(['#target']);
    expect(issue?.outcome).toBe('review');
    expect(issue?.evidence).toContain('letter-spacing');
    expect(issue?.references.filter((reference) => reference.type === 'ACT').map((reference) => reference.id)).toEqual(['24afc2']);
    expect(rule).toMatchObject({ applicable: 1, passed: 0, failures: 0, reviews: 1, warnings: 0 });
  });

  it('records PASS only for the tested spacing expectation', () => {
    render('<p style="font-size: 20px; word-spacing: 3.2px !important">Readable words</p>');
    const result = runFocusTraceScan();
    const rule = result.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-016');

    expect(result.review.some((candidate) => candidate.ruleId === 'FT-REVIEW-016')).toBe(false);
    expect(rule).toMatchObject({ applicable: 1, passed: 1, failures: 0, reviews: 0, warnings: 0 });
  });

  it('uses ACT 78fd32 for wrapped line-height review evidence', () => {
    render('<p id="wrapped" data-wrap="true" style="font-size: 20px; line-height: 20px !important">This sentence wraps onto another visual line.</p>');
    const issue = runFocusTraceScan().review.find((candidate) => candidate.ruleId === 'FT-REVIEW-016');

    expect(issue?.targets).toEqual(['#wrapped']);
    expect(issue?.references.filter((reference) => reference.type === 'ACT').map((reference) => reference.id)).toEqual(['78fd32']);
  });

  it('keeps component scans limited to styled text inside the selected subtree', () => {
    render(`
      <section id="inside"><p id="inside-text" style="font-size: 20px; letter-spacing: 2px !important">Inside text</p></section>
      <p id="outside-text" style="font-size: 20px; letter-spacing: 2px !important">Outside text</p>
    `);
    const scope: ComponentScanScope = { type: 'component', selector: '#inside', tag: 'section', label: 'Inside' };
    const issues = runFocusTraceScan(scope).review.filter((candidate) => candidate.ruleId === 'FT-REVIEW-016');

    expect(issues).toHaveLength(1);
    expect(issues[0]?.targets).toEqual(['#inside-text']);
  });
});
