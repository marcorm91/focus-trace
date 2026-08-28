import { describe, expect, it } from 'vitest';
import {
  buildFocusMemoryObservation,
  DEFAULT_FOCUS_MEMORY_SETTINGS,
  FOCUS_MEMORY_MAX_OBSERVATIONS,
  FOCUS_MEMORY_MAX_PER_SCOPE,
  FOCUS_MEMORY_RETENTION_DAYS,
  focusMemoryScopeKey,
  normalizeFocusMemorySettings,
  pruneFocusMemoryObservations,
  recordFocusMemoryObservation,
  type FocusMemoryStore,
} from '../shared/focus-memory';
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

function scan({
  scannedAt,
  url = 'https://example.test/account/123',
  failures = [],
  rulesRun = 18,
  reviewCount = 0,
  warningCount = 0,
  ruleIds,
}: {
  scannedAt: number;
  url?: string;
  failures?: ScanIssue[];
  rulesRun?: number;
  reviewCount?: number;
  warningCount?: number;
  ruleIds?: string[];
}): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url,
    title: 'Account',
    scannedAt,
    scope: { type: 'page' },
    issues: failures,
    review: Array.from({ length: reviewCount }, (_, index) => ({
      ...failure(`FT-REVIEW-${index}`, `.review-${index}`),
      outcome: 'review' as const,
    })),
    warnings: Array.from({ length: warningCount }, (_, index) => ({
      ...failure(`FT-WARN-${index}`, `.warning-${index}`),
      outcome: 'warning' as const,
    })),
    headings: [],
    ...(ruleIds
      ? {
          ruleResults: ruleIds.map((ruleId) => ({
            ruleId,
            applicable: 0,
            passed: 0,
            failures: 0,
            reviews: 0,
            warnings: 0,
          })),
        }
      : {}),
    passes: 0,
    rulesRun,
  };
}

function componentScan(scannedAt: number, url: string, selector: string): ScanResult {
  return {
    ...scan({ scannedAt, url }),
    scope: {
      type: 'component',
      selector,
      tag: 'section',
      role: 'dialog',
      label: 'Edit account',
    },
  };
}

describe('FocusTrace Memory', () => {
  it('is opt-in and disabled when no preference exists', () => {
    expect(DEFAULT_FOCUS_MEMORY_SETTINGS.enabled).toBe(false);
    expect(normalizeFocusMemorySettings(undefined).enabled).toBe(false);
    expect(normalizeFocusMemorySettings({ enabled: false }).enabled).toBe(false);
    expect(normalizeFocusMemorySettings({ enabled: true }).enabled).toBe(true);
  });

  it('moves from NEW to OPEN when the same deterministic failure persists', () => {
    let store: FocusMemoryStore | undefined;
    const first = recordFocusMemoryObservation(
      store,
      scan({ scannedAt: 1_000, failures: [failure('FT-WCAG-003', '#save')] }),
      1_000,
    );
    store = first.store;
    const second = recordFocusMemoryObservation(
      store,
      scan({ scannedAt: 2_000, failures: [failure('FT-WCAG-003', '#save')] }),
      2_000,
    );

    expect(first.comparison.status).toBe('new');
    expect(second.comparison.status).toBe('open');
    expect(second.comparison.persistentFailures).toBe(1);
  });

  it('marks a previous deterministic failure as FIXED only when comparable coverage no longer reproduces it', () => {
    const first = recordFocusMemoryObservation(
      undefined,
      scan({ scannedAt: 1_000, failures: [failure('FT-WCAG-003', '#save')] }),
      1_000,
    );
    const fixed = recordFocusMemoryObservation(
      first.store,
      scan({ scannedAt: 2_000, failures: [] }),
      2_000,
    );

    expect(fixed.comparison.status).toBe('fixed');
    expect(fixed.comparison.fixedFailures).toBe(1);
    expect(fixed.comparison.compatibleCoverage).toBe(true);
  });

  it('detects a REGRESSION when a fixed failure returns', () => {
    const first = recordFocusMemoryObservation(
      undefined,
      scan({ scannedAt: 1_000, failures: [failure('FT-WCAG-003', '#save')] }),
      1_000,
    );
    const fixed = recordFocusMemoryObservation(
      first.store,
      scan({ scannedAt: 2_000, failures: [] }),
      2_000,
    );
    const regressed = recordFocusMemoryObservation(
      fixed.store,
      scan({ scannedAt: 3_000, failures: [failure('FT-WCAG-003', '#save')] }),
      3_000,
    );

    expect(regressed.comparison.status).toBe('regressed');
    expect(regressed.comparison.regressedFailures).toBe(1);
  });

  it('keeps a per-finding timeline across remembered observations', () => {
    const first = recordFocusMemoryObservation(
      undefined,
      scan({
        scannedAt: 1_000,
        failures: [
          failure('FT-WCAG-003', '#save'),
          failure('FT-WCAG-004', '#email'),
        ],
      }),
      1_000,
    );
    const second = recordFocusMemoryObservation(
      first.store,
      scan({ scannedAt: 2_000, failures: [failure('FT-WCAG-003', '#save')] }),
      2_000,
    );
    const resolvedEmail = second.history.find((item) => item.ruleId === 'FT-WCAG-004');

    expect(resolvedEmail?.state).toBe('resolved');
    expect(resolvedEmail?.changedNow).toBe(true);
    expect(resolvedEmail?.timeline.map((point) => point.present)).toEqual([true, false]);

    const third = recordFocusMemoryObservation(
      second.store,
      scan({
        scannedAt: 3_000,
        failures: [
          failure('FT-WCAG-003', '#save'),
          failure('FT-WCAG-004', '#email'),
        ],
      }),
      3_000,
    );
    const regressedEmail = third.history.find((item) => item.ruleId === 'FT-WCAG-004');
    const persistentSave = third.history.find((item) => item.ruleId === 'FT-WCAG-003');

    expect(regressedEmail?.state).toBe('regressed');
    expect(regressedEmail?.changedNow).toBe(true);
    expect(regressedEmail?.timeline.map((point) => point.present)).toEqual([true, false, true]);
    expect(persistentSave?.state).toBe('present');
    expect(persistentSave?.changedNow).toBe(false);
    expect(persistentSave?.timeline.map((point) => point.present)).toEqual([true, true, true]);
  });

  it('keeps per-finding history conservative when rule coverage changes', () => {
    const first = recordFocusMemoryObservation(
      undefined,
      scan({ scannedAt: 1_000, failures: [failure('FT-WCAG-003', '#save')], rulesRun: 17 }),
      1_000,
    );
    const changedCoverage = recordFocusMemoryObservation(
      first.store,
      scan({ scannedAt: 2_000, failures: [], rulesRun: 18 }),
      2_000,
    );
    const history = changedCoverage.history.find((item) => item.ruleId === 'FT-WCAG-003');

    expect(changedCoverage.comparison.status).toBe('changed');
    expect(changedCoverage.comparison.compatibleCoverage).toBe(false);
    expect(history?.state).toBe('changed');
    expect(history?.timeline.at(-1)?.comparableToPrevious).toBe(false);
  });

  it('does not claim FIXED or REGRESSED when rule coverage changes', () => {
    const first = recordFocusMemoryObservation(
      undefined,
      scan({ scannedAt: 1_000, failures: [failure('FT-WCAG-003', '#save')], rulesRun: 17 }),
      1_000,
    );
    const changedCoverage = recordFocusMemoryObservation(
      first.store,
      scan({ scannedAt: 2_000, failures: [], rulesRun: 18 }),
      2_000,
    );

    expect(changedCoverage.comparison.status).toBe('changed');
    expect(changedCoverage.comparison.compatibleCoverage).toBe(false);
  });

  it('compares rule identities instead of trusting only the rule count', () => {
    const first = recordFocusMemoryObservation(
      undefined,
      scan({
        scannedAt: 1_000,
        failures: [failure('FT-WCAG-003', '#save')],
        rulesRun: 2,
        ruleIds: ['FT-WCAG-003', 'FT-WCAG-004'],
      }),
      1_000,
    );
    const changedCoverage = recordFocusMemoryObservation(
      first.store,
      scan({
        scannedAt: 2_000,
        failures: [],
        rulesRun: 2,
        ruleIds: ['FT-WCAG-003', 'FT-WCAG-010'],
      }),
      2_000,
    );

    expect(changedCoverage.comparison.status).toBe('changed');
    expect(changedCoverage.comparison.compatibleCoverage).toBe(false);
  });

  it('normalizes volatile route and selector tokens when identifying a component', () => {
    const first = componentScan(
      1_000,
      'https://example.test/users/12',
      '#users > section:nth-child(12) > div[data-row="12345"]',
    );
    const second = componentScan(
      2_000,
      'https://example.test/users/43',
      '#users > section:nth-child(47) > div[data-row="98765"]',
    );

    expect(focusMemoryScopeKey(first)).toBe(focusMemoryScopeKey(second));
  });

  it('separates hash-router views while ignoring ordinary document anchors', () => {
    const account = scan({ scannedAt: 1_000, url: 'https://example.test/#/account' });
    const settings = scan({ scannedAt: 2_000, url: 'https://example.test/#/settings' });
    const intro = scan({ scannedAt: 3_000, url: 'https://example.test/help#intro' });
    const examples = scan({ scannedAt: 4_000, url: 'https://example.test/help#examples' });

    expect(focusMemoryScopeKey(account)).not.toBe(focusMemoryScopeKey(settings));
    expect(focusMemoryScopeKey(intro)).toBe(focusMemoryScopeKey(examples));
  });

  it('stores compact hashes and generic rule ids instead of raw URLs and failing selectors', () => {
    const result = scan({
      scannedAt: 1_000,
      url: 'https://private.example.test/customer/987654',
      failures: [failure('FT-WCAG-003', '#customer-secret-button')],
    });
    const observation = buildFocusMemoryObservation(result);
    const serialized = JSON.stringify(observation);

    expect(serialized).not.toContain('private.example.test');
    expect(serialized).not.toContain('customer-secret-button');
    expect(observation.failureFingerprints[0]).toMatch(/^finding-/);
    expect(observation.failureDetails?.[0]).toEqual({
      fingerprint: observation.failureFingerprints[0],
      ruleId: 'FT-WCAG-003',
    });
    expect(observation.scopeKey).toMatch(/^scope-/);
  });

  it('keeps repeated sibling failures distinct after structural selector normalization', () => {
    const repeatedFailures = [
      failure('FT-WCAG-010', '#stats > p:nth-of-type(1)'),
      failure('FT-WCAG-010', '#stats > p:nth-of-type(2)'),
      failure('FT-WCAG-010', '#stats > p:nth-of-type(3)'),
    ];
    const firstScan = scan({ scannedAt: 1_000, failures: repeatedFailures });
    const observation = buildFocusMemoryObservation(firstScan);
    const legacySingleFinding = buildFocusMemoryObservation(
      scan({ scannedAt: 500, failures: [repeatedFailures[0]!] }),
    );

    expect(observation.failCount).toBe(3);
    expect(observation.failureFingerprints).toHaveLength(3);
    expect(new Set(observation.failureFingerprints).size).toBe(3);
    expect(observation.failureFingerprints[0]).toBe(legacySingleFinding.failureFingerprints[0]);
    expect(observation.failureDetails?.map((item) => item.ruleId)).toEqual([
      'FT-WCAG-010',
      'FT-WCAG-010',
      'FT-WCAG-010',
    ]);
    expect(JSON.stringify(observation)).not.toContain('#stats');

    const first = recordFocusMemoryObservation(undefined, firstScan, 1_000);
    const second = recordFocusMemoryObservation(
      first.store,
      scan({ scannedAt: 2_000, failures: repeatedFailures }),
      2_000,
    );

    expect(second.comparison.persistentFailures).toBe(3);
    expect(second.history).toHaveLength(3);
    expect(second.history.every((item) => item.state === 'present')).toBe(true);
  });

  it('caps history per scope, globally and by age', () => {
    let store: FocusMemoryStore | undefined;
    for (let index = 1; index <= FOCUS_MEMORY_MAX_PER_SCOPE + 4; index += 1) {
      const next = recordFocusMemoryObservation(
        store,
        scan({ scannedAt: index * 1_000 }),
        index * 1_000,
      );
      store = next.store;
    }
    expect(store?.observations).toHaveLength(FOCUS_MEMORY_MAX_PER_SCOPE);

    store = undefined;
    for (let index = 1; index <= FOCUS_MEMORY_MAX_OBSERVATIONS + 10; index += 1) {
      const next = recordFocusMemoryObservation(
        store,
        scan({ scannedAt: index * 1_000, url: `https://example-${index}.test/page` }),
        index * 1_000,
      );
      store = next.store;
    }
    expect(store?.observations).toHaveLength(FOCUS_MEMORY_MAX_OBSERVATIONS);

    const now = FOCUS_MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1_000 + 5_000;
    const recent = buildFocusMemoryObservation(scan({ scannedAt: now - 1_000 }));
    const expired = buildFocusMemoryObservation(scan({ scannedAt: 1_000, url: 'https://old.example.test/page' }));
    expect(pruneFocusMemoryObservations([expired, recent], now)).toEqual([recent]);
  });
});
