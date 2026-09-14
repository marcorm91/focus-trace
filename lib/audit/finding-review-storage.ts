import { browser } from '#imports';
import type { AuditorNote, FindingReviewState, ScanResult } from '../../shared/types';
import {
  FINDING_REVIEW_STORE_VERSION,
  applyFindingReviewStore,
  emptyFindingReviewStore,
  findingById,
  normalizeFindingReviewStore,
  resetFindingReviewRecord,
  setFindingReviewRecord,
  syncFindingReviewNote,
  updateScanFindingReviewState,
  type FindingReviewStore,
} from './finding-review';

export const FINDING_REVIEW_STORAGE_KEY = 'focustrace:finding-review:v1';

let reviewQueue: Promise<unknown> = Promise.resolve();

function serializeReviewAccess<T>(work: () => Promise<T>): Promise<T> {
  const next = reviewQueue.catch(() => undefined).then(work);
  reviewQueue = next;
  return next;
}

async function loadStore(): Promise<FindingReviewStore> {
  const stored = await browser.storage.local.get(FINDING_REVIEW_STORAGE_KEY);
  return normalizeFindingReviewStore(stored[FINDING_REVIEW_STORAGE_KEY]);
}

async function saveStore(store: FindingReviewStore): Promise<FindingReviewStore> {
  const normalized = normalizeFindingReviewStore(store);
  if (normalized.records.length) {
    await browser.storage.local.set({ [FINDING_REVIEW_STORAGE_KEY]: normalized });
  } else {
    await browser.storage.local.remove(FINDING_REVIEW_STORAGE_KEY);
  }
  return normalized;
}

export function applyStoredFindingReviews(scan: ScanResult): Promise<ScanResult> {
  return serializeReviewAccess(async () => {
    const current = await loadStore();
    const applied = applyFindingReviewStore(scan, current);
    if (applied.changed) await saveStore(applied.store);
    return applied.scan;
  });
}

export function saveFindingReviewState(
  scan: ScanResult,
  findingId: string,
  state: FindingReviewState,
  updatedAt = Date.now(),
): Promise<ScanResult> {
  return serializeReviewAccess(async () => {
    if (!findingById(scan, findingId)) return scan;
    const current = await loadStore();
    await saveStore(setFindingReviewRecord(current, scan, findingId, state, updatedAt));
    return updateScanFindingReviewState(scan, findingId, state, updatedAt);
  });
}

export function resetStoredFindingReview(scan: ScanResult, findingId: string): Promise<ScanResult> {
  return serializeReviewAccess(async () => {
    if (!findingById(scan, findingId)) return scan;
    const current = await loadStore();
    await saveStore(resetFindingReviewRecord(current, scan, findingId));
    return updateScanFindingReviewState(scan, findingId, 'open');
  });
}

export function syncStoredFindingReviewNote(
  scan: ScanResult,
  findingId: string,
): Promise<void> {
  return serializeReviewAccess(async () => {
    const current = await loadStore();
    await saveStore(syncFindingReviewNote(current, scan, findingId));
  });
}

export function clearFindingReviewHistory(): Promise<void> {
  return serializeReviewAccess(async () => {
    await browser.storage.local.remove(FINDING_REVIEW_STORAGE_KEY);
  });
}

export async function findingReviewStateForScan(scan: ScanResult): Promise<{
  scan: ScanResult;
  store: FindingReviewStore;
}> {
  const store = await loadStore().catch(() => emptyFindingReviewStore());
  const applied = applyFindingReviewStore(scan, store);
  return { scan: applied.scan, store: applied.store };
}

export function reviewStateWithNote(
  state: FindingReviewState,
  auditorNote?: AuditorNote,
): { version: typeof FINDING_REVIEW_STORE_VERSION; state: FindingReviewState; auditorNote?: AuditorNote } {
  return {
    version: FINDING_REVIEW_STORE_VERSION,
    state,
    ...(auditorNote ? { auditorNote } : {}),
  };
}
