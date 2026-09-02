import { describe, expect, it } from 'vitest';
import { recordFocusMemoryObservation } from '../shared/focus-memory';
import type { ScanIssue, ScanResult } from '../shared/types';

function contrastFailure(): ScanIssue {
  return {
    id: 'FT-WCAG-010:#tit-estrenos',
    ruleId: 'FT-WCAG-010',
    title: 'Text color contrast',
    description: 'Rendered text contrast is below the required ratio.',
    severity: 'serious',
    outcome: 'fail',
    targets: ['#tit-estrenos'],
    contrast: {
      kind: 'text',
      ratio: 3.21,
      requiredRatio: 4.5,
      foreground: '#ffffff',
      background: '#ff541e',
      fontSizePx: 20,
      fontWeight: 600,
      largeText: false,
    },
    references: [],
  };
}

function scan(scannedAt: number, issues: ScanIssue[]): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://private.example.test/estrenos/customer/987654',
    title: 'Private page',
    scannedAt,
    scope: { type: 'page' },
    issues,
    review: [],
    warnings: [],
    headings: [],
    passes: 0,
    rulesRun: 1,
    ruleResults: [{
      ruleId: 'FT-WCAG-010',
      applicable: 1,
      passed: issues.length ? 0 : 1,
      failures: issues.length,
      reviews: 0,
      warnings: 0,
    }],
  };
}

describe('FocusTrace Memory resolved finding context', () => {
  it('keeps compact contrast evidence and the last detection without storing the raw target or URL', () => {
    const first = recordFocusMemoryObservation(
      undefined,
      scan(1_000, [contrastFailure()]),
      1_000,
    );
    const resolved = recordFocusMemoryObservation(
      first.store,
      scan(2_000, []),
      2_000,
    );

    const history = resolved.history.find((item) => item.ruleId === 'FT-WCAG-010');
    expect(history?.state).toBe('resolved');
    expect(history?.lastDetectedAt).toBe(1_000);
    expect(history?.lastKnownDetail?.contrast).toEqual({
      ratio: 3.21,
      requiredRatio: 4.5,
      foreground: '#ffffff',
      background: '#ff541e',
      fontSizePx: 20,
      fontWeight: 600,
      largeText: false,
    });

    const serialized = JSON.stringify(resolved.store);
    expect(serialized).not.toContain('#tit-estrenos');
    expect(serialized).not.toContain('private.example.test');
    expect(serialized).toContain('"ratio":3.21');
    expect(serialized).toContain('"requiredRatio":4.5');
  });
});
