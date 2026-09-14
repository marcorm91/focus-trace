// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import { evaluateOrientationLock, evaluateViewportZoom, parseViewportDirectives } from '../lib/audit/viewport-visual';

function render(head = '', body = '<main>Content</main>') {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Test</title>${head}</head><body>${body}</body></html>`);
  document.close();
}

describe('viewport and visual presentation checks', () => {
  it('parses viewport directives case-insensitively and preserves the last authored value', () => {
    expect(parseViewportDirectives('width=device-width, Maximum-Scale = 3 ; user-scalable = YES')).toEqual([
      { name: 'width', value: 'device-width' },
      { name: 'maximum-scale', value: '3' },
      { name: 'user-scalable', value: 'yes' },
    ]);
  });

  it('fails the bounded 200% expectation for user-scalable=no', () => {
    render('<meta name="viewport" content="width=device-width, user-scalable=no">');
    const result = evaluateViewportZoom(document);
    expect(result.find((entry) => entry.kind === '200-percent')).toMatchObject({ outcome: 'fail' });
    expect(result.some((entry) => entry.kind === 'large-scale')).toBe(false);
  });

  it('fails maximum-scale below two and treats maximum-scale=yes as one', () => {
    render('<meta name="viewport" content="maximum-scale=1.5"><meta name="viewport" content="maximum-scale=yes">');
    const result = evaluateViewportZoom(document).filter((entry) => entry.kind === '200-percent');
    expect(result).toHaveLength(2);
    expect(result.every((entry) => entry.outcome === 'fail')).toBe(true);
  });

  it('drops a negative maximum-scale and reviews a finite ceiling between two and five', () => {
    render('<meta id="dropped" name="viewport" content="maximum-scale=-1"><meta id="limited" name="viewport" content="maximum-scale=3">');
    const result = evaluateViewportZoom(document);
    expect(result.find((entry) => entry.element.id === 'dropped' && entry.kind === '200-percent')).toMatchObject({ outcome: 'pass' });
    expect(result.find((entry) => entry.element.id === 'limited' && entry.kind === 'large-scale')).toMatchObject({ outcome: 'review' });
  });

  it('records at least five-times zoom as a bounded large-scale pass', () => {
    render('<meta name="viewport" content="user-scalable=yes, maximum-scale=5">');
    const result = evaluateViewportZoom(document);
    expect(result.find((entry) => entry.kind === '200-percent')).toMatchObject({ outcome: 'pass' });
    expect(result.find((entry) => entry.kind === 'large-scale')).toMatchObject({ outcome: 'pass' });
  });

  it('surfaces a quarter-turn transform authored under an orientation media query', () => {
    render('<style>@media (orientation: portrait) { html { transform: rotate(90deg); } }</style>');
    const result = evaluateOrientationLock(document);
    expect(result[0]).toMatchObject({
      outcome: 'review',
      orientation: 'portrait',
      property: 'transform',
      angleDegrees: 90,
    });
  });

  it('ignores non-quarter-turn orientation transforms', () => {
    render('<style>@media (orientation: landscape) { body { transform: rotate(10deg); } }</style>');
    expect(evaluateOrientationLock(document)).toEqual([]);
  });

  it('downgrades low text contrast when a painted full-inset sibling defines an ambiguous backdrop', () => {
    render(
      '',
      `<main style="background:rgb(255,255,255);color:rgb(0,0,0);font-size:16px">
        <h1>Contrast</h1>
        <div class="stage" style="position:relative;min-height:80px">
          <div id="backdrop" aria-hidden="true" style="position:absolute;inset:0;z-index:0;background:rgb(0,0,0)"></div>
          <p id="stacked" style="position:relative;z-index:1;color:rgb(119,119,119);background:transparent;font-size:16px;font-weight:400">Stacked contrast text</p>
        </div>
      </main>`,
    );

    const result = runFocusTraceScan();
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#stacked'))).toBe(false);
    expect(result.review.some((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#stacked'))).toBe(true);
  });
});