// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateInlineLinkUseOfColor } from '../lib/audit/use-of-color';
import { runFocusTraceScan } from '../lib/audit/scan';

function rect(left = 20, top = 20, width = 120, height = 24): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

function geometry(element: Element, value = rect()): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => value,
  });
}

function render(body: string): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Use of color</title></head><body><main><h1>Use of color</h1>${body}</main></body></html>`);
  document.close();
  for (const link of document.querySelectorAll('a[href]')) geometry(link);
}

beforeEach(() => render(''));

describe('WCAG 1.4.1 inline-link use-of-color evidence', () => {
  it('reviews an inline link separated from adjacent text only by a sub-3:1 color difference', () => {
    render('<p id="copy" style="color: rgb(0, 0, 0)">Read the <a id="color-only" href="/guide" style="color: rgb(0, 0, 255); text-decoration-line: none">guide</a> before continuing.</p>');

    const evaluation = evaluateInlineLinkUseOfColor();

    expect(evaluation).toHaveLength(1);
    expect(evaluation[0]).toMatchObject({
      status: 'review',
      element: document.querySelector('#color-only'),
      context: document.querySelector('#copy'),
      evidence: {
        kind: 'inline-link',
        contextSelector: '#copy',
        surroundingTextSelector: '#copy',
        linkColor: 'rgb(0, 0, 255)',
        surroundingTextColor: 'rgb(0, 0, 0)',
        contrastRatio: 2.44,
        requiredRatio: 3,
        persistentVisualCue: 'none-observed',
      },
    });
  });

  it('records a bounded pass when an underline provides a persistent non-color cue', () => {
    render('<p style="color: rgb(0, 0, 0)">Read the <a href="/guide" style="color: rgb(0, 0, 255); text-decoration-line: underline">guide</a>.</p>');

    expect(evaluateInlineLinkUseOfColor()).toMatchObject([{ status: 'pass' }]);
  });

  it('does not treat a hover-only cue as persistent', () => {
    render('<style>#hover-only:hover { text-decoration-line: underline; }</style><p style="color: rgb(0, 0, 0)">Read the <a id="hover-only" href="/guide" style="color: rgb(0, 0, 255); text-decoration-line: none">guide</a>.</p>');

    expect(evaluateInlineLinkUseOfColor()).toMatchObject([{ status: 'review' }]);
  });

  it('does not mistake a decoration shared by all surrounding text for a link-specific cue', () => {
    render('<p style="color: rgb(0, 0, 0); text-decoration-line: underline">Read the <a href="/guide" style="color: rgb(0, 0, 255); text-decoration-line: none">guide</a>.</p>');

    expect(evaluateInlineLinkUseOfColor()).toMatchObject([{ status: 'review' }]);
  });

  it('records a bounded pass when typography distinguishes the link', () => {
    render('<p style="color: rgb(0, 0, 0); font-weight: 400">Read the <a href="/guide" style="color: rgb(0, 0, 255); text-decoration-line: none; font-weight: 700">guide</a>.</p>');

    expect(evaluateInlineLinkUseOfColor()).toMatchObject([{ status: 'pass' }]);
  });

  it('records a bounded pass when the link differs in lightness by at least 3:1', () => {
    render('<p style="color: rgb(0, 0, 0)">Read the <a href="/guide" style="color: rgb(118, 118, 118); text-decoration-line: none">guide</a>.</p>');

    expect(evaluateInlineLinkUseOfColor()).toMatchObject([{ status: 'pass' }]);
  });

  it('ignores links that are not distinguished from surrounding text by color', () => {
    render('<p style="color: rgb(0, 0, 0)">Read the <a href="/guide" style="color: rgb(0, 0, 0); text-decoration-line: none">guide</a>.</p>');

    expect(evaluateInlineLinkUseOfColor()).toEqual([]);
  });

  it('ignores standalone and navigation links whose purpose is visually evident from context', () => {
    render('<nav><a href="/home" style="color: blue; text-decoration-line: none">Home</a></nav><p><a href="/next" style="color: blue; text-decoration-line: none">Continue</a></p>');

    expect(evaluateInlineLinkUseOfColor()).toEqual([]);
  });

  it('does not report inline links with an observable graphic cue', () => {
    render('<p style="color: rgb(0, 0, 0)">Open the <a href="/external" style="color: rgb(0, 0, 255); text-decoration-line: none">external page <svg aria-hidden="true"></svg></a>.</p>');
    geometry(document.querySelector('svg')!, rect(130, 20, 12, 12));

    expect(evaluateInlineLinkUseOfColor()).toMatchObject([{ status: 'pass' }]);
  });

  it('does not report an inline link with a visible boundary on its text wrapper', () => {
    render('<p style="color: rgb(0, 0, 0)">Read the <a href="/guide" style="color: rgb(0, 0, 255); text-decoration-line: none"><span style="border-bottom: 1px solid rgb(0, 0, 255)">guide</span></a>.</p>');

    expect(evaluateInlineLinkUseOfColor()).toMatchObject([{ status: 'pass' }]);
  });

  it('omits comparisons with different or visually complex backgrounds', () => {
    render('<p style="color: rgb(0, 0, 0); background: rgb(255, 255, 255)">Read the <a href="/guide" style="color: rgb(0, 0, 255); background: rgb(240, 240, 240); text-decoration-line: none">guide</a>.</p>');

    expect(evaluateInlineLinkUseOfColor()).toEqual([]);
  });

  it('integrates the finding as REVIEW and preserves structured JSON evidence', () => {
    render('<p id="copy" style="color: rgb(0, 0, 0)">Read the <a id="color-only" href="/guide" style="color: rgb(0, 0, 255); text-decoration-line: none">guide</a> before continuing.</p>');

    const result = runFocusTraceScan();
    const issue = result.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-025');
    const rule = result.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-025');

    expect(issue).toMatchObject({
      outcome: 'review',
      targets: ['#color-only'],
      context: { selector: '#copy' },
      useOfColor: {
        kind: 'inline-link',
        contrastRatio: 2.44,
        requiredRatio: 3,
      },
    });
    expect(JSON.parse(JSON.stringify(issue))).toMatchObject({
      useOfColor: { linkColor: 'rgb(0, 0, 255)', surroundingTextColor: 'rgb(0, 0, 0)' },
    });
    expect(rule).toMatchObject({ applicable: 1, passed: 0, failures: 0, reviews: 1, warnings: 0 });
  });

  it('supports component analysis without reading prose outside the selected component', () => {
    render('<p style="color: rgb(0, 0, 0)">Outside <span id="component"><a href="/guide" style="color: rgb(0, 0, 255); text-decoration-line: none">guide</a></span> text.</p>');

    expect(evaluateInlineLinkUseOfColor(document.querySelector('#component')!)).toEqual([]);
    expect(evaluateInlineLinkUseOfColor(document.querySelector('p')!)).toMatchObject([{ status: 'review' }]);
  });

  it('bounds review output on link-heavy prose', () => {
    const links = Array.from({ length: 60 }, (_, index) =>
      `text <a id="link-${index}" href="/guide/${index}" style="color: rgb(0, 0, 255); text-decoration-line: none">guide ${index}</a>`).join(' ');
    render(`<p style="color: rgb(0, 0, 0)">${links} trailing text</p>`);

    const evaluations = evaluateInlineLinkUseOfColor();

    expect(evaluations).toHaveLength(50);
    expect(evaluations.every((evaluation) => evaluation.status === 'review')).toBe(true);
  });
});
