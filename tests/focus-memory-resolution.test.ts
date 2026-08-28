import { describe, expect, it } from 'vitest';
import {
  FOCUS_MEMORY_RETENTION_DAYS,
  focusMemoryScopeKey,
  recordFocusMemoryObservation,
} from '../shared/focus-memory';
import {
  FOCUS_MEMORY_MAX_RESOLVED_FINDINGS,
  applyResolvedFindingMemory,
  archiveResolvedFinding,
  pruneFocusMemoryResolvedFindings,
} from '../shared/focus-memory-resolution';
import type { ScanIssue, ScanResult } from '../shared/types';

function failure(ruleId: string, target: string): ScanIssue {
  return {
    id: `${ruleId}:${target}`,
    ruleId,
    title: 'Failure',
    description: 'Failure description',
    severity: 'serious',
    outcome: 'fail',
    targets: [target],
    references: [],
  };
}

function scan(scannedAt: number, failures: ScanIssue[]): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://example.test/account',
    title: 'Account',
    scannedAt,
    scope: { type: 'page' },
    issues: failures,
    review: [],
    warnings: [],
    headings: [],
    passes: 0,
    rulesRun: 18,
  };
}

describe('FocusTrace Memory resolved findings', () => {
  it('removes detailed history after resolution but still detects a later regression', () => {
    const issue = failure('FT-WCAG-003', '#save');
    const firstScan = scan(1_000, [issue]);
    const fixedScan = scan(2_000, []);
    const returnedScan = scan(3_000, [issue]);
    const stillFailingScan = scan(4_000, [issue]);

    const first = recordFocusMemoryObservation(undefined, firstScan, 1_000);
    const fixed = recordFocusMemoryObservation(first.store, fixedScan, 2_000);
    const fixedFinding = fixed.history.find((item) => item.state === 'resolved');

    expect(fixedFinding).toBeDefined();
    const fingerprint = fixedFinding!.fingerprint;
    const scopeKey = focusMemoryScopeKey(fixedScan);
    const archived = archiveResolvedFinding(
      fixed.store.observations,
      [],
      scopeKey,
      fingerprint,
      fixedFinding!.ruleId,
      2_000,
    );

    expect(archived.resolvedFindings).toEqual([
      expect.objectContaining({
        scopeKey,
        fingerprint,
        ruleId: 'FT-WCAG-003',
        resolvedAt: 2_000,
      }),
    ]);
    expect(archived.observations.every((item) => !item.failureFingerprints.includes(fingerprint))).toBe(true);
    expect(JSON.stringify(archived.observations)).not.toContain('#save');

    const afterArchive = recordFocusMemoryObservation(
      { version: 1, observations: archived.observations },
      fixedScan,
      2_000,
    );
    expect(afterArchive.history).toHaveLength(0);

    const returned = recordFocusMemoryObservation(
      { version: 1, observations: archived.observations },
      returnedScan,
      3_000,
    );
    const decoratedReturn = applyResolvedFindingMemory(
      returned.comparison,
      returned.history,
      archived.resolvedFindings,
      scopeKey,
    );

    expect(decoratedReturn.comparison.status).toBe('regressed');
    expect(decoratedReturn.comparison.regressedFailures).toBe(1);
    expect(decoratedReturn.comparison.newFailures).toBe(0);
    expect(decoratedReturn.history[0]).toEqual(expect.objectContaining({
      fingerprint,
      ruleId: 'FT-WCAG-003',
      state: 'regressed',
    }));

    const stillFailing = recordFocusMemoryObservation(returned.store, stillFailingScan, 4_000);
    const decoratedStillFailing = applyResolvedFindingMemory(
      stillFailing.comparison,
      stillFailing.history,
      archived.resolvedFindings,
      scopeKey,
    );
    expect(decoratedStillFailing.history.find((item) => item.fingerprint === fingerprint)?.state).toBe('present');
  });

  it('bounds compact resolved markers by age and count', () => {
    const day = 24 * 60 * 60 * 1_000;
    const now = FOCUS_MEMORY_RETENTION_DAYS * day + 10_000;
    const expired = {
      scopeKey: 'scope-old',
      fingerprint: 'finding-old',
      ruleId: 'FT-WCAG-003',
      resolvedAt: 1,
    };
    const recent = {
      scopeKey: 'scope-recent',
      fingerprint: 'finding-recent',
      ruleId: 'FT-WCAG-003',
      resolvedAt: now - 1_000,
    };

    expect(pruneFocusMemoryResolvedFindings([expired, recent], now)).toEqual([recent]);

    const many = Array.from({ length: FOCUS_MEMORY_MAX_RESOLVED_FINDINGS + 15 }, (_, index) => ({
      scopeKey: `scope-${index}`,
      fingerprint: `finding-${index}`,
      ruleId: 'FT-WCAG-003',
      resolvedAt: now - index,
    }));
    expect(pruneFocusMemoryResolvedFindings(many, now)).toHaveLength(FOCUS_MEMORY_MAX_RESOLVED_FINDINGS);
  });
});
