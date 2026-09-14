import { describe, expect, it } from 'vitest';
import { assertFocusTrace, summarizeFocusTraceThresholds } from '../integrations/playwright';
import type { CliBrowserRunOutput } from '../cli/protocol';

function result(findings: Array<{ outcome: 'fail' | 'review' | 'warning'; lifecycleState?: 'new' | 'persistent' | 'changed' }>): CliBrowserRunOutput {
  const failures = findings.filter((finding) => finding.outcome === 'fail').length;
  const reviews = findings.filter((finding) => finding.outcome === 'review').length;
  const warnings = findings.filter((finding) => finding.outcome === 'warning').length;
  return {
    rendered: '',
    envelope: {
      $schema: 'https://focus-mode.app/schemas/focustrace-export-v1.schema.json',
      schemaVersion: '1.0.0',
      kind: 'session',
      generatedAt: 0,
      producer: { name: 'FocusTrace', standard: 'WCAG 2.2' },
      subject: { url: 'https://example.test/' },
      context: { scope: {}, coverage: {} },
      summary: { findings: findings.length, failures, reviews, warnings },
      findings: findings.map((finding, index) => ({
        id: `finding-${index}`,
        ruleId: `FT-TEST-${index}`,
        title: 'Test finding',
        description: 'Test finding',
        outcome: finding.outcome,
        severity: 'serious',
        source: 'scan',
        references: [],
        ...(finding.lifecycleState ? { lifecycleState: finding.lifecycleState } : {}),
      })),
    },
    baseline: {
      version: 1,
      savedAt: 0,
      scan: {
        engine: 'FocusTrace Rules',
        standard: 'WCAG 2.2',
        url: 'https://example.test/',
        title: '',
        scannedAt: 0,
        issues: [],
        review: [],
        warnings: [],
        passes: 0,
        rulesRun: 0,
      },
    },
    baselineCompatible: false,
  };
}

describe('Playwright integration thresholds', () => {
  it('fails by default only on deterministic FAIL findings', () => {
    expect(() => assertFocusTrace(result([{ outcome: 'review' }, { outcome: 'warning' }]))).not.toThrow();
    expect(() => assertFocusTrace(result([{ outcome: 'fail' }]))).toThrow(/FAIL 1 exceeds maxFailures 0/);
  });

  it('keeps REVIEW and WARNING thresholds separate from FAIL semantics', () => {
    expect(() => assertFocusTrace(result([{ outcome: 'review' }]), { maxReviews: 0 })).toThrow(/REVIEW 1 exceeds maxReviews 0/);
    expect(() => assertFocusTrace(result([{ outcome: 'warning' }]), { maxWarnings: 0 })).toThrow(/WARNING 1 exceeds maxWarnings 0/);
  });

  it('can gate only new deterministic failures for baseline regression workflows', () => {
    const scan = result([
      { outcome: 'fail', lifecycleState: 'persistent' },
      { outcome: 'fail', lifecycleState: 'new' },
    ]);
    expect(summarizeFocusTraceThresholds(scan)).toEqual({ failures: 2, newFailures: 1, reviews: 0, warnings: 0 });
    expect(() => assertFocusTrace(scan, { maxNewFailures: 0 })).toThrow(/new FAIL 1 exceeds maxNewFailures 0/);
    expect(() => assertFocusTrace(scan, { maxNewFailures: 1 })).not.toThrow();
  });

  it('rejects invalid thresholds instead of silently coercing them', () => {
    expect(() => assertFocusTrace(result([]), { maxFailures: -1 })).toThrow(/non-negative integer/);
    expect(() => assertFocusTrace(result([]), { maxReviews: 0.5 })).toThrow(/non-negative integer/);
  });
});
