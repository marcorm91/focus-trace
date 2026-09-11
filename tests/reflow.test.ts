// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { evaluateReflow } from '../lib/audit/reflow';
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

function geometry(element: Element, value: DOMRect): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => value,
  });
}

function dimension(target: Element | Window, property: string, value: number): void {
  Object.defineProperty(target, property, { configurable: true, value });
}

function render(body: string): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Reflow</title></head><body><main><h1>Reflow</h1>${body}</main></body></html>`);
  document.close();
}

function viewport(width = 320, height = 800, scrollWidth = width, scrollHeight = height): void {
  dimension(window, 'innerWidth', width);
  dimension(window, 'innerHeight', height);
  dimension(document.documentElement, 'clientWidth', width);
  dimension(document.documentElement, 'clientHeight', height);
  dimension(document.documentElement, 'scrollWidth', scrollWidth);
  dimension(document.documentElement, 'scrollHeight', scrollHeight);
  dimension(document.body, 'scrollWidth', scrollWidth);
  dimension(document.body, 'scrollHeight', scrollHeight);
}

beforeEach(() => {
  render('');
  viewport();
});

afterEach(() => {
  document.documentElement.style.writingMode = '';
  viewport(1024, 768);
});

describe('WCAG 1.4.10 narrow-viewport evidence', () => {
  it('is inapplicable until the current CSS viewport reaches the reflow threshold', () => {
    viewport(800, 600, 900, 600);

    expect(evaluateReflow()).toMatchObject({ status: 'inapplicable', signals: [] });
  });

  it('passes the bounded observation when a 320 CSS px viewport has no loss or cross-axis overflow', () => {
    expect(evaluateReflow()).toMatchObject({
      status: 'pass',
      signals: [],
      evidence: { viewportWidth: 320, viewportHeight: 800, axis: 'horizontal' },
    });
  });

  it('reports non-exempt horizontal document overflow with measured evidence', () => {
    render('<nav id="wide"><a id="lost-link" href="/help">Help</a></nav>');
    viewport(320, 800, 540, 800);
    const link = document.querySelector('#lost-link')!;
    geometry(link, rect(420, 20, 100, 32));

    const evaluation = evaluateReflow();
    const signal = evaluation.signals.find((candidate) => candidate.kind === 'document-overflow');

    expect(evaluation.status).toBe('review');
    expect(signal?.targets).toEqual([link]);
    expect(signal?.evidence).toMatchObject({
      kind: 'document-overflow',
      axis: 'horizontal',
      viewportWidth: 320,
      scrollWidth: 540,
      overflowPixels: 220,
    });
    expect(signal?.detail).toContain('#lost-link');
  });

  it('reports rendered controls clipped by an unscrollable ancestor', () => {
    render('<div id="clip" style="overflow: hidden"><button id="cut">Continue</button></div>');
    const clip = document.querySelector('#clip')!;
    const button = document.querySelector('#cut')!;
    geometry(clip, rect(0, 20, 300, 60));
    geometry(button, rect(260, 30, 120, 32));

    const evaluation = evaluateReflow();
    const signal = evaluation.signals.find((candidate) => candidate.kind === 'clipped-content');

    expect(signal?.target).toBe(button);
    expect(signal?.evidence).toMatchObject({
      kind: 'clipped-content',
      axis: 'horizontal',
      clippedBy: '#clip',
      clippedPixels: 80,
      clipping: 'partial',
    });
  });

  it('does not treat CSS-hidden responsive alternatives as lost content', () => {
    render('<nav style="display: none"><a id="desktop-only" href="/desktop">Desktop navigation</a></nav>');
    const link = document.querySelector('#desktop-only')!;
    geometry(link, rect(400, 20, 120, 32));
    viewport(320, 800, 320, 800);

    const evaluation = evaluateReflow();

    expect(evaluation.status).toBe('pass');
    expect(evaluation.signals).toEqual([]);
  });

  it('excludes known two-dimensional content containers from automatic review', () => {
    render('<table><tbody><tr><td id="wide-cell">Quarterly data</td></tr></tbody></table>');
    const cell = document.querySelector('#wide-cell')!;
    geometry(cell, rect(400, 20, 180, 32));
    viewport(320, 800, 580, 800);

    expect(evaluateReflow()).toMatchObject({ status: 'pass', signals: [] });
  });

  it('uses the 256 CSS px cross-axis threshold for vertical writing', () => {
    render('<p id="vertical-overflow">Vertical content</p>');
    document.documentElement.style.writingMode = 'vertical-rl';
    viewport(800, 256, 800, 500);
    const content = document.querySelector('#vertical-overflow')!;
    geometry(content, rect(20, 400, 100, 40));

    const signal = evaluateReflow().signals.find((candidate) => candidate.kind === 'document-overflow');

    expect(signal?.evidence).toMatchObject({
      axis: 'vertical',
      viewportHeight: 256,
      scrollHeight: 500,
      overflowPixels: 244,
    });
  });

  it('distinguishes completely clipped content from partial clipping', () => {
    render('<div id="clip" style="overflow: hidden"><button id="gone"><span>Continue</span></button></div>');
    const clip = document.querySelector('#clip')!;
    const button = document.querySelector('#gone')!;
    const label = document.querySelector('#gone span')!;
    geometry(clip, rect(0, 20, 280, 60));
    geometry(button, rect(340, 30, 100, 32));
    geometry(label, rect(350, 34, 80, 20));

    const clipped = evaluateReflow().signals.filter((candidate) => candidate.kind === 'clipped-content');

    expect(clipped).toHaveLength(1);
    expect(clipped[0]?.target).toBe(button);
    expect(clipped[0]?.evidence.clipping).toBe('complete');
  });

  it('integrates measured clipping as REVIEW and keeps the structured evidence in exported scans', () => {
    render('<div id="clip" style="overflow: clip"><button id="cut">Continue</button></div>');
    const clip = document.querySelector('#clip')!;
    const button = document.querySelector('#cut')!;
    geometry(clip, rect(0, 20, 280, 60));
    geometry(button, rect(250, 30, 100, 32));

    const result = runFocusTraceScan();
    const issue = result.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-024');
    const rule = result.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-024');

    expect(issue?.targets).toEqual(['#cut']);
    expect(issue?.outcome).toBe('review');
    expect(issue?.reflow).toMatchObject({ kind: 'clipped-content', clippedBy: '#clip' });
    expect(JSON.parse(JSON.stringify(result)).review.find((candidate: { ruleId: string }) => candidate.ruleId === 'FT-REVIEW-024')?.reflow)
      .toMatchObject({ kind: 'clipped-content', clippedBy: '#clip', clippedPixels: 70 });
    expect(rule).toMatchObject({ applicable: 1, passed: 0, failures: 0, reviews: 1, warnings: 0 });
  });
});
