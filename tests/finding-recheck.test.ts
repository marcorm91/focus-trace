import { describe, expect, it } from 'vitest';
import {
  applyFindingRecheck,
  evaluateFindingRecheck,
  findingNodeSignature,
  type FindingTargetResolution,
  type RecheckableScanIssue,
} from '../lib/audit/finding-recheck';
import type { ScanIssue, ScanResult, ScanRuleResult } from '../shared/types';

function issue(overrides: Partial<ScanIssue> = {}): ScanIssue {
  return {
    id: 'finding-1',
    ruleId: 'FT-WCAG-001',
    title: 'Example finding',
    description: 'Example description',
    severity: 'serious',
    outcome: 'fail',
    targets: ['#target'],
    evidence: 'Original evidence',
    element: {
      tag: 'button',
      id: 'target',
      role: 'button',
      name: 'Save',
      selector: '#target',
    },
    references: [],
    ...overrides,
  };
}

function scan(
  findings: ScanIssue[] = [],
  ruleResult: Partial<ScanRuleResult> = {},
): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://example.test/page',
    title: 'Example',
    scannedAt: 10,
    scope: { type: 'page' },
    issues: findings.filter((finding) => finding.outcome === 'fail'),
    review: findings.filter((finding) => finding.outcome === 'review'),
    warnings: findings.filter((finding) => finding.outcome === 'warning'),
    ruleResults: [{
      ruleId: 'FT-WCAG-001',
      applicable: 1,
      passed: findings.length ? 0 : 1,
      failures: findings.filter((finding) => finding.outcome === 'fail').length,
      reviews: findings.filter((finding) => finding.outcome === 'review').length,
      warnings: findings.filter((finding) => finding.outcome === 'warning').length,
      ...ruleResult,
    }],
    passes: findings.length ? 0 : 1,
    rulesRun: 1,
  };
}

function matchedResolution(): FindingTargetResolution {
  return {
    status: 'matched',
    reason: 'Unique match',
    locator: '#target',
    element: {
      tag: 'button',
      id: 'target',
      role: 'button',
      name: 'Save',
      selector: '#target',
    },
  };
}

describe('finding recheck', () => {
  it('keeps a persistent finding when the same rule, target and evidence remain', () => {
    const original = issue();
    const current = issue({ id: 'current-finding' });

    const result = evaluateFindingRecheck(original, scan([current]), matchedResolution(), 20);

    expect(result.state).toBe('persistent');
    expect(result.original.evidence).toBe('Original evidence');
    expect(result.current?.evidence).toBe('Original evidence');
    expect(result.checkedAt).toBe(20);
  });

  it('reports changed when the target still matches but the current evidence changed', () => {
    const original = issue();
    const current = issue({ id: 'current-finding', evidence: 'Updated evidence' });

    const result = evaluateFindingRecheck(original, scan([current]), matchedResolution());

    expect(result.state).toBe('changed');
    expect(result.current?.evidence).toBe('Updated evidence');
    expect(result.original.evidence).toBe('Original evidence');
  });

  it('only reports resolved when the rerun has complete rule coverage', () => {
    const original = issue();

    const resolved = evaluateFindingRecheck(original, scan([]), matchedResolution());
    const inconclusive = evaluateFindingRecheck(
      original,
      scan([], { coverage: 'findings-only', passed: 0 }),
      matchedResolution(),
    );

    expect(resolved.state).toBe('resolved');
    expect(inconclusive.state).toBe('inconclusive');
  });

  it('does not silently choose missing or ambiguous targets', () => {
    const original = issue();

    const missing = evaluateFindingRecheck(original, scan([]), {
      status: 'missing',
      reason: 'No target',
    });
    const ambiguous = evaluateFindingRecheck(original, scan([]), {
      status: 'ambiguous',
      reason: 'Several candidates',
      candidateCount: 2,
    });

    expect(missing.state).toBe('missing');
    expect(ambiguous.state).toBe('inconclusive');
  });

  it('stores recheck evidence separately without replacing the original finding', () => {
    const original = issue();
    const originalScan = scan([original]);
    const signature = findingNodeSignature(original);
    const latest = evaluateFindingRecheck(original, scan([]), matchedResolution(), 30);

    const updated = applyFindingRecheck(originalScan, original.id, signature, latest);
    const updatedIssue = updated.issues[0] as RecheckableScanIssue;

    expect(updatedIssue.evidence).toBe('Original evidence');
    expect(updatedIssue.targets).toEqual(['#target']);
    expect(updatedIssue.recheck?.latest.state).toBe('resolved');
    expect(updatedIssue.recheck?.latest.original.evidence).toBe('Original evidence');
    expect(updatedIssue.recheck?.signature.locator).toBe('#target');
    expect(originalScan.issues[0]).not.toHaveProperty('recheck');
  });

  it('bounds stored recheck attempts while preserving the stable signature', () => {
    const original = issue();
    const signature = findingNodeSignature(original);
    let currentScan = scan([original]);

    for (let index = 0; index < 8; index += 1) {
      const currentIssue = currentScan.issues[0] as RecheckableScanIssue;
      const latest = evaluateFindingRecheck(
        currentIssue,
        scan([issue({ id: `rerun-${index}` })]),
        matchedResolution(),
        100 + index,
      );
      currentScan = applyFindingRecheck(currentScan, original.id, signature, latest);
    }

    const stored = currentScan.issues[0] as RecheckableScanIssue;
    expect(stored.recheck?.attempts).toHaveLength(5);
    expect(stored.recheck?.attempts.map((attempt) => attempt.checkedAt)).toEqual([103, 104, 105, 106, 107]);
    expect(stored.recheck?.signature.locator).toBe('#target');
  });
});
