import { normalizeAuditorNote } from '../../shared/auditor-notes';
import { focusMemoryScopeKey } from '../../shared/focus-memory';
import type {
  AuditorNote,
  FindingReviewState,
  ScanIssue,
  ScanResult,
} from '../../shared/types';
import { findingIdentity } from './finding-lifecycle';

export const FINDING_REVIEW_STORE_VERSION = 1 as const;
export const MAX_FINDING_REVIEW_RECORDS = 500;
export const FINDING_REVIEW_STATES: FindingReviewState[] = [
  'open',
  'reviewed',
  'accepted',
  'false-positive',
  'resolved',
  'regressed',
];

export interface FindingReviewRecord {
  key: string;
  state: FindingReviewState;
  updatedAt: number;
  auditorNote?: AuditorNote;
}

export interface FindingReviewStore {
  version: typeof FINDING_REVIEW_STORE_VERSION;
  records: FindingReviewRecord[];
}

function hash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(36);
}

function allFindings(scan: ScanResult): ScanIssue[] {
  return [...scan.issues, ...scan.review, ...(scan.warnings ?? [])];
}

function isFindingReviewState(value: unknown): value is FindingReviewState {
  return typeof value === 'string' && FINDING_REVIEW_STATES.includes(value as FindingReviewState);
}

export function emptyFindingReviewStore(): FindingReviewStore {
  return { version: FINDING_REVIEW_STORE_VERSION, records: [] };
}

export function normalizeFindingReviewStore(value: unknown): FindingReviewStore {
  if (!value || typeof value !== 'object') return emptyFindingReviewStore();
  const candidate = value as Partial<FindingReviewStore>;
  if (candidate.version !== FINDING_REVIEW_STORE_VERSION || !Array.isArray(candidate.records)) {
    return emptyFindingReviewStore();
  }

  const byKey = new Map<string, FindingReviewRecord>();
  for (const raw of candidate.records) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Partial<FindingReviewRecord>;
    const key = typeof record.key === 'string' ? record.key.trim().slice(0, 96) : '';
    if (!key.startsWith('finding-review-')
      || !isFindingReviewState(record.state)
      || typeof record.updatedAt !== 'number'
      || !Number.isFinite(record.updatedAt)) continue;
    const auditorNote = normalizeAuditorNote(record.auditorNote);
    byKey.set(key, {
      key,
      state: record.state,
      updatedAt: record.updatedAt,
      ...(auditorNote ? { auditorNote } : {}),
    });
  }

  return {
    version: FINDING_REVIEW_STORE_VERSION,
    records: [...byKey.values()]
      .sort((left, right) => left.updatedAt - right.updatedAt)
      .slice(-MAX_FINDING_REVIEW_RECORDS),
  };
}

export function findingReviewKey(scan: ScanResult, issue: ScanIssue): string {
  return `finding-review-${hash(`${focusMemoryScopeKey(scan)}|${findingIdentity(issue)}`)}`;
}

export function findingById(scan: ScanResult, findingId: string): ScanIssue | undefined {
  return allFindings(scan).find((issue) => issue.id === findingId);
}

function updateFinding(
  scan: ScanResult,
  findingId: string,
  update: (issue: ScanIssue) => ScanIssue,
): ScanResult {
  let changed = false;
  const map = (issues: ScanIssue[]) => issues.map((issue) => {
    if (issue.id !== findingId) return issue;
    const next = update(issue);
    if (next !== issue) changed = true;
    return next;
  });
  const issues = map(scan.issues);
  const review = map(scan.review);
  const warnings = map(scan.warnings ?? []);
  return changed ? { ...scan, issues, review, warnings } : scan;
}

export function updateScanFindingReviewState(
  scan: ScanResult,
  findingId: string,
  state: FindingReviewState,
  updatedAt = Date.now(),
): ScanResult {
  return updateFinding(scan, findingId, (issue) => ({
    ...issue,
    reviewState: state,
    reviewStateUpdatedAt: updatedAt,
  }));
}

export function setFindingReviewRecord(
  store: FindingReviewStore,
  scan: ScanResult,
  findingId: string,
  state: FindingReviewState,
  updatedAt = Date.now(),
): FindingReviewStore {
  const issue = findingById(scan, findingId);
  if (!issue) return store;
  const key = findingReviewKey(scan, issue);
  const existing = store.records.find((record) => record.key === key);
  return normalizeFindingReviewStore({
    version: FINDING_REVIEW_STORE_VERSION,
    records: [
      ...store.records.filter((record) => record.key !== key),
      {
        key,
        state,
        updatedAt,
        ...(existing?.auditorNote ?? issue.auditorNote
          ? { auditorNote: existing?.auditorNote ?? issue.auditorNote }
          : {}),
      },
    ],
  });
}

export function syncFindingReviewNote(
  store: FindingReviewStore,
  scan: ScanResult,
  findingId: string,
): FindingReviewStore {
  const issue = findingById(scan, findingId);
  if (!issue) return store;
  const key = findingReviewKey(scan, issue);
  const existing = store.records.find((record) => record.key === key);
  const auditorNote = normalizeAuditorNote(issue.auditorNote);
  if (!auditorNote && (!existing || existing.state === 'open')) {
    return {
      ...store,
      records: store.records.filter((record) => record.key !== key),
    };
  }
  return normalizeFindingReviewStore({
    version: FINDING_REVIEW_STORE_VERSION,
    records: [
      ...store.records.filter((record) => record.key !== key),
      {
        key,
        state: existing?.state ?? issue.reviewState ?? 'open',
        updatedAt: auditorNote?.updatedAt ?? existing?.updatedAt ?? Date.now(),
        ...(auditorNote ? { auditorNote } : {}),
      },
    ],
  });
}

export function resetFindingReviewRecord(
  store: FindingReviewStore,
  scan: ScanResult,
  findingId: string,
): FindingReviewStore {
  const issue = findingById(scan, findingId);
  if (!issue) return store;
  const key = findingReviewKey(scan, issue);
  const existing = store.records.find((record) => record.key === key);
  if (!existing?.auditorNote) {
    return { ...store, records: store.records.filter((record) => record.key !== key) };
  }
  return normalizeFindingReviewStore({
    version: FINDING_REVIEW_STORE_VERSION,
    records: [
      ...store.records.filter((record) => record.key !== key),
      { ...existing, state: 'open' },
    ],
  });
}

export function applyFindingReviewStore(
  scan: ScanResult,
  store: FindingReviewStore,
  now = Date.now(),
): { scan: ScanResult; store: FindingReviewStore; changed: boolean } {
  let nextStore = store;
  let changed = false;

  const decorate = (issue: ScanIssue): ScanIssue => {
    const key = findingReviewKey(scan, issue);
    const record = nextStore.records.find((item) => item.key === key);
    if (!record) {
      return issue.reviewState === 'open'
        ? issue
        : { ...issue, reviewState: 'open' };
    }

    let effective = record;
    if (record.state === 'resolved' && scan.scannedAt > record.updatedAt) {
      effective = { ...record, state: 'regressed', updatedAt: now };
      nextStore = normalizeFindingReviewStore({
        version: FINDING_REVIEW_STORE_VERSION,
        records: [
          ...nextStore.records.filter((item) => item.key !== key),
          effective,
        ],
      });
      changed = true;
    }

    return {
      ...issue,
      reviewState: effective.state,
      reviewStateUpdatedAt: effective.updatedAt,
      ...(effective.auditorNote ? { auditorNote: effective.auditorNote } : {}),
    };
  };

  return {
    scan: {
      ...scan,
      issues: scan.issues.map(decorate),
      review: scan.review.map(decorate),
      warnings: (scan.warnings ?? []).map(decorate),
    },
    store: nextStore,
    changed,
  };
}
