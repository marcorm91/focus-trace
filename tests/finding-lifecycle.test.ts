import { describe, expect, it } from 'vitest';
import {
  applyFindingLifecycle,
  compareFindingLifecycle,
  deduplicateFindings,
} from '../lib/audit/finding-lifecycle';
import type { ScanIssue, ScanResult } from '../shared/types';

function issue(id: string, overrides: Partial<ScanIssue> = {}): ScanIssue {
  return {
    id,
    ruleId: 'FT-TEST-001',
    title: 'Test finding',
    description: 'Test description',
    severity: 'serious',
    outcome: 'fail',
    targets: ['#target'],
    evidence: 'same evidence',
    references: [{ type: 'WCAG', id: '1.1.1', label: '1.1.1', url: 'https://www.w3.org/', level: 'A' }],
    ...overrides,
  };
}

function scan(scannedAt: number, issues: ScanIssue[]): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://example.test/',
    title: 'Example',
    scannedAt,
    issues: issues.filter((item) => item.outcome === 'fail'),
    review: issues.filter((item) => item.outcome === 'review'),
    warnings: issues.filter((item) => item.outcome === 'warning'),
    passes: 0,
    rulesRun: 1,
  };
}

describe('finding lifecycle', () => {
  it('deduplicates only exact rule, target and evidence matches', () => {
    const result = deduplicateFindings([
      issue('one'),
      issue('two'),
      issue('three', { evidence: 'different evidence' }),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.occurrenceCount).toBe(2);
    expect(result[1]?.occurrenceCount).toBe(1);
  });

  it('marks the same identity and evidence persistent', () => {
    const comparison = compareFindingLifecycle(scan(1, [issue('before')]), scan(2, [issue('after')]));
    expect(comparison.counts).toEqual({ new: 0, persistent: 1, changed: 0, resolved: 0 });
  });

  it('marks changed evidence on the same rule and target explicitly', () => {
    const comparison = compareFindingLifecycle(
      scan(1, [issue('before')]),
      scan(2, [issue('after', { evidence: 'new evidence' })]),
    );
    expect(comparison.entries[0]?.state).toBe('changed');
  });

  it('marks missing current identities resolved', () => {
    const comparison = compareFindingLifecycle(scan(1, [issue('before')]), scan(2, []));
    expect(comparison.entries[0]?.state).toBe('resolved');
  });

  it('treats a finding that reappears after a resolved scan as new again', () => {
    const empty = applyFindingLifecycle(scan(1, [issue('first')]), scan(2, []));
    expect(empty.findingLifecycle?.counts.resolved).toBe(1);
    const reappeared = applyFindingLifecycle(empty, scan(3, [issue('again')]));
    expect(reappeared.findingLifecycle?.counts.new).toBe(1);
    expect(reappeared.issues[0]?.lifecycleState).toBe('new');
  });

  it('annotates current findings without rewriting resolved evidence into the current scan', () => {
    const current = applyFindingLifecycle(
      scan(1, [issue('old'), issue('resolved', { ruleId: 'FT-TEST-002', targets: ['#gone'] })]),
      scan(2, [issue('current')]),
    );
    expect(current.issues).toHaveLength(1);
    expect(current.issues[0]?.lifecycleState).toBe('persistent');
    expect(current.findingLifecycle?.counts.resolved).toBe(1);
  });
});
