// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { captureTextResizeBaseline, evaluateResizeText } from '../lib/audit/resize-text';
import { runFocusTraceScan } from '../lib/audit/scan';

function rect(left: number, top: number, width: number, height: number): DOMRect {
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

function geometry(element: Element, initial: DOMRect): (next: DOMRect) => void {
  let current = initial;
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => current,
  });
  return (next) => {
    current = next;
  };
}

function dimension(element: Element, property: string, initial: number): (next: number) => void {
  let current = initial;
  Object.defineProperty(element, property, {
    configurable: true,
    get: () => current,
  });
  return (next) => {
    current = next;
  };
}

function render(body: string): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Resize text</title></head><body><main><h1>Resize text</h1>${body}</main></body></html>`);
  document.close();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
}

beforeEach(() => render(''));

describe('WCAG 1.4.4 guided 100% to 200% comparison', () => {
  it('captures a bounded baseline and guides the two required states', () => {
    render('<p id="copy" style="font-size: 20px">Readable text</p>');
    geometry(document.querySelector('#copy')!, rect(20, 80, 220, 32));
    const baseline = captureTextResizeBaseline(1);

    expect(baseline).toMatchObject({ zoomFactor: 1, viewportWidth: 1280, truncated: false });
    expect(baseline.subjects).toEqual(expect.arrayContaining([
      expect.objectContaining({ selector: '#copy', kind: 'text', fontSizePx: 20 }),
    ]));
    expect(evaluateResizeText({ zoomFactor: 1, baseline }).assessment).toMatchObject({
      phase: 'baseline-captured',
      subjectsCaptured: 1,
    });
    expect(evaluateResizeText({ zoomFactor: 1.5, baseline }).assessment.phase).toBe('target-zoom-required');
    expect(evaluateResizeText({ zoomFactor: 2 }).assessment.phase).toBe('baseline-required');
  });

  it('does not report text that reaches a two-times effective size', () => {
    render('<p id="copy" style="font-size: 20px">Readable text</p>');
    geometry(document.querySelector('#copy')!, rect(20, 80, 220, 32));
    const baseline = captureTextResizeBaseline(1);

    const evaluation = evaluateResizeText({ zoomFactor: 2, baseline });

    expect(evaluation.assessment).toMatchObject({ phase: 'comparison-complete', subjectsCompared: 1 });
    expect(evaluation.signals).toEqual([]);
  });

  it('reviews responsive CSS that prevents text from doubling effectively', () => {
    render('<p id="copy" style="font-size: 20px">Readable text</p>');
    const copy = document.querySelector<HTMLElement>('#copy')!;
    geometry(copy, rect(20, 80, 220, 32));
    const baseline = captureTextResizeBaseline(1);
    copy.style.fontSize = '12px';

    const issue = evaluateResizeText({ zoomFactor: 2, baseline }).signals[0];

    expect(issue?.evidence).toMatchObject({
      kind: 'insufficient-enlargement',
      observedScale: 1.2,
      requiredScale: 2,
    });
  });

  it('reviews content that becomes clipped by its fixed container', () => {
    render('<button id="action" style="font-size: 16px; overflow: hidden">Continue with checkout</button>');
    const action = document.querySelector('#action')!;
    geometry(action, rect(20, 80, 220, 40));
    dimension(action, 'clientWidth', 220);
    const setScrollWidth = dimension(action, 'scrollWidth', 220);
    dimension(action, 'clientHeight', 40);
    dimension(action, 'scrollHeight', 40);
    const baseline = captureTextResizeBaseline(1);
    setScrollWidth(360);

    const issue = evaluateResizeText({ zoomFactor: 2, baseline }).signals[0];

    expect(issue?.selector).toBe('#action');
    expect(issue?.evidence).toMatchObject({ kind: 'clipped-content', clippedBy: '#action' });
  });

  it('reviews baseline content that disappears without an observable equivalent', () => {
    render('<p id="important">Important account balance</p>');
    const content = document.querySelector<HTMLElement>('#important')!;
    geometry(content, rect(20, 80, 240, 32));
    const baseline = captureTextResizeBaseline(1);
    content.style.display = 'none';

    expect(evaluateResizeText({ zoomFactor: 2, baseline }).signals[0]?.evidence.kind)
      .toBe('content-unavailable');
  });

  it('accepts a rendered responsive replacement with the same text signature', () => {
    render('<p id="desktop">Account options</p><p id="mobile" style="display: none">Account options</p>');
    const desktop = document.querySelector<HTMLElement>('#desktop')!;
    const mobile = document.querySelector<HTMLElement>('#mobile')!;
    geometry(desktop, rect(20, 80, 180, 32));
    geometry(mobile, rect(20, 80, 180, 32));
    const baseline = captureTextResizeBaseline(1);
    desktop.style.display = 'none';
    mobile.style.display = 'block';

    expect(evaluateResizeText({ zoomFactor: 2, baseline }).signals).toEqual([]);
  });

  it('suppresses hidden disclosure content when a rendered named control exposes it', () => {
    render('<button id="menu-toggle" aria-controls="menu" style="display: none">Open menu</button><nav id="menu"><a id="account" href="/account">Account</a></nav>');
    const toggle = document.querySelector<HTMLElement>('#menu-toggle')!;
    const menu = document.querySelector<HTMLElement>('#menu')!;
    const account = document.querySelector<HTMLElement>('#account')!;
    geometry(toggle, rect(20, 40, 120, 40));
    geometry(menu, rect(20, 80, 240, 60));
    geometry(account, rect(20, 90, 100, 32));
    const baseline = captureTextResizeBaseline(1);
    menu.style.display = 'none';
    toggle.style.display = 'block';

    expect(evaluateResizeText({ zoomFactor: 2, baseline }).signals
      .some((candidate) => candidate.selector === '#account')).toBe(false);
  });

  it('reviews new overlap between unrelated text subjects', () => {
    render('<p id="first">First message</p><p id="second">Second message</p>');
    const first = document.querySelector('#first')!;
    const second = document.querySelector('#second')!;
    geometry(first, rect(20, 80, 180, 32));
    const moveSecond = geometry(second, rect(20, 140, 180, 32));
    const baseline = captureTextResizeBaseline(1);
    moveSecond(rect(100, 80, 180, 32));

    const overlap = evaluateResizeText({ zoomFactor: 2, baseline }).signals
      .find((candidate) => candidate.evidence.kind === 'overlapping-content');

    expect(overlap?.evidence.overlappingWith).toBe('#second');
  });

  it('integrates comparison evidence as REVIEW in the exported scan', () => {
    render('<p id="copy" style="font-size: 20px">Readable text</p>');
    const copy = document.querySelector<HTMLElement>('#copy')!;
    geometry(copy, rect(20, 80, 220, 32));
    const baseline = captureTextResizeBaseline(1);
    copy.style.fontSize = '12px';

    const result = runFocusTraceScan(undefined, { zoomFactor: 2, baseline });
    const issue = result.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-028');
    const rule = result.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-028');

    expect(issue?.outcome).toBe('review');
    expect(issue?.textResize).toMatchObject({ kind: 'insufficient-enlargement', observedScale: 1.2 });
    expect(result.textResize).toMatchObject({ phase: 'comparison-complete', subjectsCompared: 1 });
    expect(rule).toMatchObject({ applicable: 1, passed: 0, failures: 0, reviews: 1, warnings: 0 });
    expect(JSON.parse(JSON.stringify(result)).review.find((candidate: { ruleId: string }) => candidate.ruleId === 'FT-REVIEW-028')?.textResize)
      .toMatchObject({ baselineZoomFactor: 1, currentZoomFactor: 2, requiredScale: 2 });
  });
});
