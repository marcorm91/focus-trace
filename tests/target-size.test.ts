// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import { evaluateTargetSize, TARGET_SIZE_MINIMUM_CSS_PX } from '../lib/audit/target-size';
import { remediationForIssue } from '../lib/site-audit/remediation';
import { localizedScanIssue } from '../shared/i18n';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Target size</title></head><body>${body}</body></html>`);
  document.close();
}

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

function setRect(selector: string, left: number, top: number, width: number, height: number): Element {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing test element ${selector}`);
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect(left, top, width, height));
  return element;
}

describe('WCAG 2.5.8 target size', () => {
  it('uses the WCAG 2.2 minimum of 24 CSS pixels', () => {
    expect(TARGET_SIZE_MINIMUM_CSS_PX).toBe(24);
  });

  it('passes a rectangular target that contains a 24 by 24 CSS px area', () => {
    render('<button id="save" style="border-radius:0">Save</button>');
    setRect('#save', 0, 0, 24, 24);

    expect(evaluateTargetSize()).toEqual([
      expect.objectContaining({
        status: 'pass',
        method: 'size',
        width: 24,
        height: 24,
      }),
    ]);
  });

  it('does not treat a 24px circular bounding box as proof that a 24px square fits inside the target', () => {
    render('<button id="one" style="border-radius:50%">One</button><button id="two" style="border-radius:50%">Two</button>');
    setRect('#one', 0, 0, 24, 24);
    setRect('#two', 22, 0, 24, 24);

    const evaluations = evaluateTargetSize();
    expect(evaluations).toHaveLength(2);
    expect(evaluations.every((entry) => entry.status === 'review' && entry.method === 'review')).toBe(true);
  });

  it('can prove a sufficiently large circular target contains a 24px axis-aligned square', () => {
    render('<button id="round" style="border-radius:50%">Round</button>');
    setRect('#round', 0, 0, 34, 34);

    expect(evaluateTargetSize()).toEqual([
      expect.objectContaining({ status: 'pass', method: 'size' }),
    ]);
  });

  it('passes undersized targets when their 24px spacing circles only touch', () => {
    render('<button id="one">One</button><button id="two">Two</button>');
    setRect('#one', 0, 0, 20, 20);
    setRect('#two', 24, 0, 20, 20);

    const evaluations = evaluateTargetSize();
    expect(evaluations).toHaveLength(2);
    expect(evaluations.every((entry) => entry.status === 'pass' && entry.method === 'spacing')).toBe(true);
  });

  it('reviews undersized targets when their 24px spacing circles overlap', () => {
    render('<button id="one">One</button><button id="two">Two</button>');
    setRect('#one', 0, 0, 20, 20);
    setRect('#two', 22, 0, 20, 20);

    const evaluations = evaluateTargetSize();
    expect(evaluations).toHaveLength(2);
    expect(evaluations.every((entry) => entry.status === 'review')).toBe(true);
    expect(evaluations[0]?.detail).toContain('does not mark this as an automatic WCAG failure');
  });

  it('applies the inline exception when a target is embedded in surrounding text', () => {
    render('<p>Read <a id="help" href="/help" style="display:inline">help</a> before continuing.</p>');
    setRect('#help', 30, 0, 18, 16);

    expect(evaluateTargetSize()).toEqual([
      expect.objectContaining({
        status: 'pass',
        method: 'inline-exception',
      }),
    ]);
  });

  it('uses document-wide neighbors when evaluating a selected component', () => {
    render('<div id="component"><button id="inside">Inside</button></div><button id="outside">Outside</button>');
    setRect('#inside', 0, 0, 20, 20);
    setRect('#outside', 22, 0, 20, 20);
    const component = document.querySelector('#component') as HTMLElement;

    const evaluations = evaluateTargetSize(component);
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]).toMatchObject({ status: 'review', method: 'review' });
    expect(evaluations[0]?.neighbor?.id).toBe('outside');
  });

  it('does not treat disabled controls as active pointer targets', () => {
    render('<button id="disabled" disabled>Disabled</button><button id="active">Active</button>');
    setRect('#disabled', 0, 0, 10, 10);
    setRect('#active', 0, 30, 24, 24);

    const evaluations = evaluateTargetSize();
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]?.element.id).toBe('active');
  });

  it('integrates potential target-size problems into normal Analysis as REVIEW', () => {
    render('<button id="one">One</button><button id="two">Two</button>');
    setRect('#one', 0, 0, 20, 20);
    setRect('#two', 22, 0, 20, 20);

    const scan = runFocusTraceScan();
    const findings = scan.review.filter((issue) => issue.ruleId === 'FT-WCAG-012');
    expect(findings).toHaveLength(2);
    expect(findings[0]?.references).toContainEqual(expect.objectContaining({
      type: 'WCAG',
      id: '2.5.8',
      level: 'AA',
    }));
    const ruleResult = scan.ruleResults?.find((entry) => entry.ruleId === 'FT-WCAG-012');
    expect(ruleResult).toMatchObject({ applicable: 2, passed: 0, failures: 0, reviews: 2, warnings: 0 });
  });

  it('localizes target-size evidence and remediation in Spanish', () => {
    render('<button id="one">One</button><button id="two">Two</button>');
    setRect('#one', 0, 0, 20, 20);
    setRect('#two', 22, 0, 20, 20);

    const finding = runFocusTraceScan().review.find((issue) => issue.ruleId === 'FT-WCAG-012');
    expect(finding).toBeDefined();
    if (!finding) return;

    const localized = localizedScanIssue(finding, 'es');
    expect(localized.title).toBe('Tamaño y separación de objetivos de puntero');
    expect(localized.description).toContain('objetivo de puntero');
    expect(localized.evidence).toContain('El objetivo mide');
    expect(remediationForIssue(finding, 'es')).toContain('24 × 24 CSS px');
  });
});
