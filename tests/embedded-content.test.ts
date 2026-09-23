// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateEmbeddedContent } from '../lib/audit/embedded-content';
import { runFocusTraceScan } from '../lib/audit/scan';
import { withScanElementQueryCache } from '../lib/audit/scan-elements';

function mount(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Embedded fixture</title></head><body><main><h1>Embedded</h1>${body}</main></body></html>`);
  document.close();
}

function evaluationsFor(ruleId: string) {
  return evaluateEmbeddedContent(document).filter((evaluation) => evaluation.rule.id === ruleId);
}

describe('embedded content accessibility', () => {
  beforeEach(() => mount(''));

  it('fails an exposed unnamed frame and accepts title or ARIA naming', () => {
    mount(`
      <iframe id="untitled"></iframe>
      <iframe id="title" title="Map"></iframe>
      <iframe id="aria" aria-label="Payment"></iframe>
    `);

    const frames = evaluationsFor('FT-WCAG-019');
    expect(frames).toHaveLength(3);
    expect(frames.find((entry) => entry.element.id === 'untitled')?.outcome).toBe('fail');
    expect(frames.find((entry) => entry.element.id === 'title')?.outcome).toBe('pass');
    expect(frames.find((entry) => entry.element.id === 'aria')?.outcome).toBe('pass');
  });

  it('keeps duplicate frame names as REVIEW rather than automatic WCAG failure', () => {
    mount(`
      <iframe id="one" title="Product preview"></iframe>
      <iframe id="two" aria-label="Product preview"></iframe>
      <iframe id="three" title="Support"></iframe>
    `);

    const uniqueness = evaluationsFor('FT-REVIEW-038');
    expect(uniqueness.filter((entry) => entry.outcome === 'review').map((entry) => entry.element.id).sort()).toEqual(['one', 'two']);
    expect(uniqueness.find((entry) => entry.element.id === 'three')?.outcome).toBe('pass');
  });

  it('states explicitly when cross-origin embedded content was not evaluated', () => {
    mount('<iframe id="remote" title="Remote help" src="https://example.org/help"></iframe>');

    const coverage = evaluationsFor('FT-REVIEW-039');
    expect(coverage).toHaveLength(1);
    expect(coverage[0]?.outcome).toBe('review');
    expect(coverage[0]?.detail).toContain('embedded descendants were not inspected');
    expect(coverage[0]?.detail).not.toContain('/help');
  });

  it('fails a negative-tabindex same-origin frame when its document contains sequential focus', () => {
    mount('<iframe id="editor" title="Editor" tabindex="-1"></iframe>');
    const frame = document.getElementById('editor') as HTMLIFrameElement;
    const embedded = frame.contentDocument;
    expect(embedded).not.toBeNull();
    embedded!.open();
    embedded!.write('<!doctype html><html><body><button type="button">Save</button></body></html>');
    embedded!.close();

    const focusability = evaluationsFor('FT-WCAG-020');
    expect(focusability).toHaveLength(1);
    expect(focusability[0]?.outcome).toBe('fail');
    expect(focusability[0]?.detail).toContain('(button)');
    expect(focusability[0]?.detail).not.toContain('Save');
  });

  it('keeps iframe host checks while suppressing embedded descendant inspection when configured', () => {
    mount('<iframe id="editor" title="Editor" tabindex="-1"></iframe>');
    const frame = document.getElementById('editor') as HTMLIFrameElement;
    frame.contentDocument!.open();
    frame.contentDocument!.write('<!doctype html><html><body><button id="nested">Save</button></body></html>');
    frame.contentDocument!.close();

    const evaluations = withScanElementQueryCache(
      () => evaluateEmbeddedContent(document),
      undefined,
      { includeFrameContents: false },
    );

    expect(evaluations.some((entry) => entry.rule.id === 'FT-WCAG-019' && entry.element === frame)).toBe(true);
    expect(evaluations.some((entry) => entry.rule.id === 'FT-WCAG-020' && entry.element === frame)).toBe(false);
    expect(evaluations.some((entry) => entry.rule.id === 'FT-REVIEW-039' && entry.element === frame)).toBe(false);

    const scan = runFocusTraceScan(undefined, undefined, { ignoreIframeContents: true });
    expect(scan.issues.some((entry) => entry.targets.some((target) => target.includes('|frame|')))).toBe(false);
    expect(scan.review.some((entry) => entry.targets.some((target) => target.includes('|frame|')))).toBe(false);
    expect(scan.warnings.some((entry) => entry.targets.some((target) => target.includes('|frame|')))).toBe(false);
  });

  it('passes a negative-tabindex same-origin frame when no embedded descendant is sequentially focusable', () => {
    mount('<iframe id="preview" title="Preview" tabindex="-1"></iframe>');
    const frame = document.getElementById('preview') as HTMLIFrameElement;
    const embedded = frame.contentDocument;
    expect(embedded).not.toBeNull();
    embedded!.open();
    embedded!.write('<!doctype html><html><body><p>Read-only preview</p></body></html>');
    embedded!.close();

    expect(evaluationsFor('FT-WCAG-020')).toMatchObject([{ outcome: 'pass' }]);
  });

  it('uses the shared accessible-name computation for object alternatives', () => {
    mount(`
      <object id="named" data="/chart.svg" aria-label="Quarterly revenue"></object>
      <object id="title" data="/diagram.svg" title="Architecture diagram"></object>
      <object id="missing" data="/photo.jpg"></object>
    `);

    const objects = evaluationsFor('FT-WCAG-018');
    expect(objects).toHaveLength(3);
    expect(objects.find((entry) => entry.element.id === 'named')?.outcome).toBe('pass');
    expect(objects.find((entry) => entry.element.id === 'title')?.outcome).toBe('pass');
    expect(objects.find((entry) => entry.element.id === 'missing')?.outcome).toBe('fail');
    expect(objects.find((entry) => entry.element.id === 'named')?.accessibleName?.source).toBe('aria-label');
  });

  it('accepts a direct SVG title for an exposed role=img without duplicating FT-WCAG-002', () => {
    mount('<svg id="chart" role="img"><title>Quarterly revenue</title><path d="M0 0h10v10z"></path></svg>');

    const result = runFocusTraceScan();
    const imageFindings = result.issues.filter((issue) => issue.ruleId === 'FT-WCAG-002' && issue.targets.includes('#chart'));
    expect(imageFindings).toEqual([]);
    expect(result.ruleResults?.find((entry) => entry.ruleId === 'FT-WCAG-002')?.passed).toBeGreaterThan(0);
  });

  it('keeps active image-map areas under the existing link-name rule instead of producing duplicate image findings', () => {
    mount(`
      <img src="floor.png" alt="Office floor" usemap="#floor-map">
      <map name="floor-map">
        <area id="meeting" href="/meeting" aria-label="Meeting room" shape="rect" coords="0,0,10,10">
        <area id="quiet" href="/quiet" alt="Quiet room" shape="rect" coords="10,0,20,10">
      </map>
    `);

    const result = runFocusTraceScan();
    expect(result.issues.some((issue) => issue.targets.includes('#meeting') || issue.targets.includes('#quiet'))).toBe(false);
  });
});