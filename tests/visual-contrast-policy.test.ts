// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import { downgradeUncertainStackingContrast } from '../lib/audit/visual-contrast-policy';
import { localizedScanIssue } from '../shared/i18n';
import type { ScanIssue, ScanResult } from '../shared/types';

function issue(id: string, ruleId = 'FT-WCAG-010'): ScanIssue {
  return { id, ruleId, title: 'Contrast', description: 'Contrast evidence', outcome: 'fail', severity: 'serious', targets: ['#target'], evidence: 'foreground=rgb(119,119,119)', references: [] };
}
function scan(issues: ScanIssue[]): ScanResult {
  return { engine: 'FocusTrace Rules', standard: 'WCAG 2.2', url: 'https://example.test/', title: 'Test', scannedAt: 1, issues, review: [], warnings: [], passes: 0, rulesRun: 1 };
}
function renderCards(count: number, backdrop = 'inset:0;background:#000'): void {
  const cards = Array.from({ length: count }, (_, i) => `<div style="position:relative"><div style="position:absolute;${backdrop};z-index:0"></div><p id="target${i}" style="position:relative;z-index:1;color:rgb(119,119,119);background:transparent;font-size:16px;font-weight:400">Contrast text</p></div>`).join('');
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Test</title></head><body><main style="background:#fff;color:#000;font-size:16px"><h1>Test</h1>${cards}</main></body></html>`);
  document.close();
}

describe('contrast backdrop verification', () => {
  it.each(['rgb(0, 0, 0)', 'rgb(255, 0, 0)', 'rgb(0, 0, 255)', 'rgba(0, 0, 0, 0.5)'])(
    'recognizes the painted backdrop %s without treating the blue channel as alpha', (color) => {
      document.body.innerHTML = `<main style="position:relative"><div style="position:absolute;left:0;top:0;width:100px;height:100px;z-index:0;background-color:${color}"></div><p id="target" style="position:relative;z-index:1">Text</p></main>`;
      const result = scan([issue('contrast')]);
      downgradeUncertainStackingContrast(result, document);
      expect(result.review).toHaveLength(1);
      expect(result.issues).toHaveLength(0);
    },
  );

  it('detects a painted descendant inside a static sibling background branch', () => {
    document.body.innerHTML = '<div class="fullwidth-block" style="position:relative"><div class="container-background"><figure><img alt="" src="hero.jpg" style="position:absolute;inset:0"></figure><div class="bg-overlay" style="position:absolute;inset:0;background:rgba(0,20,60,.65)"></div></div><div class="container"><div class="row"><div class="col"><article><div class="article__body"><header><h2><a id="target" href="#" style="color:#fff;background:transparent;font-size:16px;font-weight:600">White title</a></h2></header></div></article></div></div></div></div>';
    const result = scan([{
      ...issue('contrast'),
      contrast: { kind: 'text', subject: 'text', requiredRatio: 4.5, ratio: 1, foreground: 'rgb(255, 255, 255)', background: 'rgb(255, 255, 255)' },
    }]);

    downgradeUncertainStackingContrast(result, document);

    expect(result.issues).toHaveLength(0);
    expect(result.review).toHaveLength(1);
    expect(result.review[0]?.contrast?.ratio).toBeUndefined();
    expect(result.review[0]?.contrast?.background).toBeUndefined();
    expect(result.review[0]?.contrast?.reason).toContain('sibling branch');
  });

  it('detects a painted backdrop attached to an ancestor-level sibling', () => {
    document.body.innerHTML = '<section style="position:relative"><picture style="position:absolute;inset:0;z-index:0"><img alt="" src="hero.jpg"></picture><div style="position:relative;z-index:1"><article><header><h2><a id="target" href="#" style="color:#fff;background:transparent;font-size:16px;font-weight:400">White text</a></h2></header></article></div></section>';
    const result = scan([{
      ...issue('contrast'),
      contrast: { kind: 'text', subject: 'text', requiredRatio: 4.5, ratio: 1, foreground: 'rgb(255, 255, 255)', background: 'rgb(255, 255, 255)' },
    }]);

    downgradeUncertainStackingContrast(result, document);

    expect(result.issues).toHaveLength(0);
    expect(result.review).toHaveLength(1);
    expect(result.review[0]?.contrast?.ratio).toBeUndefined();
    expect(result.review[0]?.contrast?.background).toBeUndefined();
    expect(result.review[0]?.contrast?.reason).toContain('ancestor-level');
  });

  it('detects a full-inset painted pseudo-element on an ancestor', () => {
    document.body.innerHTML = '<section id="hero" style="position:relative"><div><p id="target">Text</p></div></section>';
    const nativeGetComputedStyle = globalThis.getComputedStyle;
    globalThis.getComputedStyle = ((element: Element, pseudo?: string | null) => {
      if (element.id === 'hero' && pseudo === '::before') {
        return {
          display: 'block',
          visibility: 'visible',
          opacity: '1',
          backgroundImage: 'linear-gradient(rgb(0,0,0), rgb(0,0,0))',
          backgroundColor: 'rgba(0, 0, 0, 0)',
          position: 'absolute',
          content: '""',
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
          getPropertyValue: (property: string) => property === 'inset' ? '0px' : '',
        } as unknown as CSSStyleDeclaration;
      }
      return nativeGetComputedStyle(element, pseudo);
    }) as typeof getComputedStyle;

    try {
      const result = scan([issue('contrast')]);
      downgradeUncertainStackingContrast(result, document);
      expect(result.issues).toHaveLength(0);
      expect(result.review).toHaveLength(1);
      expect(result.review[0]?.contrast?.reason ?? result.review[0]?.evidence).toContain('pseudo-element');
    } finally {
      globalThis.getComputedStyle = nativeGetComputedStyle;
    }
  });

  it('treats an absolute image sibling as an unresolved painted backdrop', () => {
    document.body.innerHTML = '<main style="position:relative"><img alt="" src="hero.jpg" style="position:absolute;inset:0;z-index:0"><p id="target" style="position:relative;z-index:1">Text</p></main>';
    const result = scan([{
      ...issue('contrast'),
      contrast: { kind: 'text', subject: 'text', requiredRatio: 4.5, ratio: 1, foreground: 'rgb(255, 255, 255)', background: 'rgb(255, 255, 255)' },
    }]);
    downgradeUncertainStackingContrast(result, document);

    expect(result.issues).toHaveLength(0);
    expect(result.review).toHaveLength(1);
    expect(result.review[0]?.contrast?.ratio).toBeUndefined();
    expect(result.review[0]?.contrast?.background).toBeUndefined();
    expect(result.review[0]?.contrast?.reason).toContain('painted');
  });

  it('reviews a contrast failure when the bounded sibling search is truncated', () => {
    const siblings = Array.from({ length: 13 }, (_, index) => `<span data-sibling="${index}"></span>`).join('');
    document.body.innerHTML = `<main>${siblings}<p id="target">Text</p></main>`;
    const result = scan([issue('contrast')]);

    downgradeUncertainStackingContrast(result, document);

    expect(result.issues).toHaveLength(0);
    expect(result.review).toHaveLength(1);
    expect(result.review[0]?.contrast?.reason).toContain('bounded visual-backdrop search');
  });

  it('does not downgrade because of a fully transparent backdrop', () => {
    document.body.innerHTML = '<main style="position:relative"><div style="position:absolute;left:0;top:0;width:100px;height:100px;z-index:0;background:rgba(0,0,0,0)"></div><p id="target" style="position:relative;z-index:1">Text</p></main>';
    const result = scan([issue('contrast')]);
    downgradeUncertainStackingContrast(result, document);
    expect(result.issues).toHaveLength(1);
    expect(result.review).toHaveLength(0);
  });

  it('downgrades white-on-white fallback when the visual image backdrop is nested outside the target parent', () => {
    document.open();
    document.write('<!doctype html><html lang="en"><head><title>Test</title></head><body style="background:#fff"><section style="position:relative"><picture style="position:absolute;inset:0;z-index:0"><img alt="" src="hero.jpg"></picture><div style="position:relative;z-index:1"><article><header><h2><a id="target" href="#" style="color:#fff;background:transparent;font-size:16px;font-weight:400">White link text</a></h2></header></article></div></section></body></html>');
    document.close();

    const result = runFocusTraceScan();
    const finding = result.review.find((entry) => entry.ruleId === 'FT-WCAG-010' && entry.targets.includes('#target'));

    expect(result.issues.some((entry) => entry.ruleId === 'FT-WCAG-010' && entry.targets.includes('#target'))).toBe(false);
    expect(finding).toBeDefined();
    expect(finding?.contrast?.background).toBeUndefined();
    expect(finding?.contrast?.ratio).toBeUndefined();
  });

  it('downgrades a false white-on-white failure when an absolute image is the visual backdrop', () => {
    document.open();
    document.write('<!doctype html><html lang="en"><head><title>Test</title></head><body style="background:#fff"><main style="position:relative"><img alt="" src="hero.jpg" style="position:absolute;inset:0;z-index:0"><h1>Test</h1><p id="image-target" style="position:relative;z-index:1;color:#fff;background:transparent;font-size:16px;font-weight:400">White text</p></main></body></html>');
    document.close();

    const result = runFocusTraceScan();
    const finding = result.review.find((entry) => entry.ruleId === 'FT-WCAG-010' && entry.targets.includes('#image-target'));

    expect(result.issues.some((entry) => entry.ruleId === 'FT-WCAG-010' && entry.targets.includes('#image-target'))).toBe(false);
    expect(finding).toBeDefined();
    expect(finding?.contrast?.background).toBeUndefined();
    expect(finding?.contrast?.ratio).toBeUndefined();
  });

  it('uses the nested iframe document when verifying a same-origin contrast backdrop', () => {
    document.body.innerHTML = '<iframe id="frame" title="Preview"></iframe>';
    const frame = document.getElementById('frame') as HTMLIFrameElement;
    const nested = frame.contentDocument!;
    nested.open();
    nested.write('<!doctype html><html lang="en"><head><title>Frame</title></head><body style="background:#fff"><main style="position:relative"><img alt="" src="hero.jpg" style="position:absolute;inset:0;z-index:0"><p id="target" style="position:relative;z-index:1;color:#fff;background:transparent;font-size:16px;font-weight:400">White text</p></main></body></html>');
    nested.close();

    const result = runFocusTraceScan();
    const selector = '#frame |frame| #target';
    const finding = result.review.find((entry) => entry.ruleId === 'FT-WCAG-010' && entry.targets.includes(selector));

    expect(result.issues.some((entry) => entry.ruleId === 'FT-WCAG-010' && entry.targets.includes(selector))).toBe(false);
    expect(finding).toBeDefined();
    expect(finding?.contrast?.background).toBeUndefined();
    expect(finding?.contrast?.ratio).toBeUndefined();
  });

  it('applies opaque-backdrop handling through the full scanner', () => {
    renderCards(1, 'left:0;top:0;width:100px;height:100px;background:#000');
    const result = runFocusTraceScan();
    expect(result.issues.filter((finding) => finding.ruleId === 'FT-WCAG-010')).toHaveLength(0);
    expect(result.review.some((finding) => finding.ruleId === 'FT-WCAG-010' && finding.targets.includes('#target0'))).toBe(true);
  });

  it('reviews the 101st ambiguous target and preserves aggregate counters', () => {
    renderCards(101);
    const result = runFocusTraceScan();
    expect(result.issues.filter((finding) => finding.ruleId === 'FT-WCAG-010')).toHaveLength(0);
    const reviews = result.review.filter((finding) => finding.ruleId === 'FT-WCAG-010');
    expect(reviews).toHaveLength(101);
    expect(reviews[99]?.evidence).not.toContain('limit of 100');
    expect(reviews[100]?.evidence).toContain('limit of 100');
    expect(result.ruleResults?.find((rule) => rule.ruleId === 'FT-WCAG-010')).toMatchObject({ failures: 0, reviews: 101 });
    const spanish = localizedScanIssue(reviews[100]!, 'es');
    expect(spanish.description).toContain('límite');
    expect(spanish.evidence).toContain('100');
    expect(spanish.evidence).not.toContain('per-scan limit');
  });

  it('shares the verification budget across contrast rules without downgrading unrelated failures', () => {
    document.body.innerHTML = '<p id="target">Text</p>';
    const result = scan([
      ...Array.from({ length: 100 }, (_, index) => issue(String(index))),
      issue('non-text', 'FT-WCAG-011'), issue('name', 'FT-WCAG-002'),
    ]);
    downgradeUncertainStackingContrast(result, document);
    expect(result.review.map((finding) => finding.id)).toEqual(['non-text']);
    expect(result.issues).toHaveLength(101);
    expect(result.issues.some((finding) => finding.id === 'name')).toBe(true);
  });
});
