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

  it('does not downgrade because of a fully transparent backdrop', () => {
    document.body.innerHTML = '<main style="position:relative"><div style="position:absolute;left:0;top:0;width:100px;height:100px;z-index:0;background:rgba(0,0,0,0)"></div><p id="target" style="position:relative;z-index:1">Text</p></main>';
    const result = scan([issue('contrast')]);
    downgradeUncertainStackingContrast(result, document);
    expect(result.issues).toHaveLength(1);
    expect(result.review).toHaveLength(0);
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
