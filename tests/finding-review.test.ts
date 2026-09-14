import { describe, expect, it } from 'vitest';
import {
  MAX_FINDING_REVIEW_RECORDS,
  applyFindingReviewStore,
  emptyFindingReviewStore,
  findingReviewKey,
  normalizeFindingReviewStore,
  resetFindingReviewRecord,
  setFindingReviewRecord,
  syncFindingReviewNote,
} from '../lib/audit/finding-review';
import type { ScanIssue, ScanResult } from '../shared/types';

function issue(id = 'finding-1'): ScanIssue {
  return {
    id,
    ruleId: 'FT-WCAG-003',
    title: 'Button has no accessible name',
    description: 'Provide an accessible name.',
    severity: 'serious',
    outcome: 'fail',
    targets: ['#save'],
    references: [],
  };
}

function scan(scannedAt = 100, currentIssue = issue()): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://example.test/editor',
    title: 'Editor',
    scannedAt,
    scope: { type: 'page' },
    issues: [currentIssue],
    review: [],
    warnings: [],
    passes: 0,
    rulesRun: 1,
  };
}

describe('finding review workflow', () => {
  it('persists an explicit auditor state and rehydrates it on a later compatible finding', () => {
    const original = scan();
    const stored = setFindingReviewRecord(emptyFindingReviewStore(), original, 'finding-1', 'accepted', 150);
    const later = scan(200, { ...issue('finding-2'), targets: ['#save'] });
    const applied = applyFindingReviewStore(later, stored, 210);
    expect(applied.scan.issues[0]?.reviewState).toBe('accepted');
    expect(applied.scan.issues[0]?.reviewStateUpdatedAt).toBe(150);
  });

  it('marks a resolved managed finding as regressed only when it reappears in a later scan', () => {
    const original = scan(100);
    const resolved = setFindingReviewRecord(emptyFindingReviewStore(), original, 'finding-1', 'resolved', 150);
    const sameObservation = applyFindingReviewStore(scan(100), resolved, 160);
    expect(sameObservation.scan.issues[0]?.reviewState).toBe('resolved');
    const later = applyFindingReviewStore(scan(200), resolved, 220);
    expect(later.scan.issues[0]?.reviewState).toBe('regressed');
    expect(later.changed).toBe(true);
  });

  it('keeps auditor notes with the managed identity and allows the state to be reset', () => {
    const withNote = scan(100, {
      ...issue(),
      auditorNote: { text: 'Accepted until redesign.', updatedAt: 120 },
    });
    let store = syncFindingReviewNote(emptyFindingReviewStore(), withNote, 'finding-1');
    store = setFindingReviewRecord(store, withNote, 'finding-1', 'accepted', 130);
    const reset = resetFindingReviewRecord(store, withNote, 'finding-1');
    expect(reset.records[0]?.state).toBe('open');
    expect(reset.records[0]?.auditorNote?.text).toBe('Accepted until redesign.');
  });

  it('uses a privacy-safe bounded key rather than persisting the raw selector', () => {
    const current = scan();
    const key = findingReviewKey(current, current.issues[0]!);
    expect(key).toMatch(/^finding-review-/);
    expect(key).not.toContain('#save');
  });

  it('bounds stored workflow history and keeps the most recently updated records', () => {
    const records = Array.from({ length: MAX_FINDING_REVIEW_RECORDS + 10 }, (_, index) => ({
      key: `finding-review-${index}`,
      state: 'reviewed' as const,
      updatedAt: index,
    }));
    const normalized = normalizeFindingReviewStore({ version: 1, records });
    expect(normalized.records).toHaveLength(MAX_FINDING_REVIEW_RECORDS);
    expect(normalized.records[0]?.updatedAt).toBe(10);
  });
});
