import { browser } from '#imports';
import type { ScanResult } from '../../shared/types';
import {
  MULTIPAGE_AUDIT_VERSION,
  activeAuditFromStore,
  applyAuditAnalysis,
  emptyMultipageAuditStore,
  type AccessibilityAudit,
  type AuditAnalysisPlan,
  type AuditPageVisualEvidence,
  type MultipageAuditStore,
} from './multipage-audit';

export const MULTIPAGE_AUDIT_STORAGE_KEY = 'focustrace:multipage-audits:v1';
export const AUDIT_PRINT_EVIDENCE_PREFIX = 'focustrace:audit-print:';
const MAX_AUDITS = 8;
const MAX_PAGES_PER_AUDIT = 40;
const MAX_VISUALS_PER_PAGE = 3;
const MAX_VISUAL_DATA_CHARS = 3_000_000;
const MAX_AUDIT_STORE_CHARS = 4_500_000;

export interface AuditPrintEvidence {
  audit: AccessibilityAudit;
}

function normalizeAudit(audit: AccessibilityAudit): AccessibilityAudit {
  return {
    ...audit,
    sites: [...new Set(audit.sites)].filter(Boolean),
    pages: audit.pages.slice(-MAX_PAGES_PER_AUDIT).map((page) => {
      const evidence = page.visualEvidence;
      if (!evidence || !Array.isArray(evidence.visuals)) {
        const { visualEvidence: _visualEvidence, ...rest } = page;
        return rest;
      }
      const visuals = evidence.visuals.slice(0, MAX_VISUALS_PER_PAGE);
      return {
        ...page,
        visualEvidence: {
          capturedAt: Number.isFinite(evidence.capturedAt) ? evidence.capturedAt : page.reviewedAt,
          visuals,
          eligibleCount: Number.isFinite(evidence.eligibleCount) ? evidence.eligibleCount : visuals.length,
          limitReached: Boolean(evidence.limitReached),
          captureUnavailable: Boolean(evidence.captureUnavailable),
          ...(evidence.storageTrimmed || evidence.visuals.length > visuals.length ? { storageTrimmed: true } : {}),
        },
      };
    }),
  };
}

function trimVisualStorage(audits: AccessibilityAudit[]): AccessibilityAudit[] {
  let remaining = MAX_VISUAL_DATA_CHARS;
  const next = audits.map((audit) => ({
    ...audit,
    pages: audit.pages.map((page) => ({ ...page })),
  }));

  // Prefer the newest reviews when the local evidence budget is exhausted.
  for (let auditIndex = next.length - 1; auditIndex >= 0; auditIndex -= 1) {
    const audit = next[auditIndex]!;
    for (let pageIndex = audit.pages.length - 1; pageIndex >= 0; pageIndex -= 1) {
      const page = audit.pages[pageIndex]!;
      const evidence = page.visualEvidence;
      if (!evidence) continue;
      const kept = [] as typeof evidence.visuals;
      let storageTrimmed = Boolean(evidence.storageTrimmed);
      for (const visual of evidence.visuals) {
        const cost = visual.dataUrl.length;
        if (cost <= remaining) {
          kept.push(visual);
          remaining -= cost;
        } else {
          storageTrimmed = true;
        }
      }
      page.visualEvidence = {
        ...evidence,
        visuals: kept,
        ...(storageTrimmed ? { storageTrimmed: true } : {}),
      };
    }
  }
  return next;
}

function storeChars(audits: AccessibilityAudit[], activeAuditId?: string): number {
  return JSON.stringify({
    version: MULTIPAGE_AUDIT_VERSION,
    audits,
    ...(activeAuditId ? { activeAuditId } : {}),
  }).length;
}

function trimAuditHistoryToBudget(
  audits: AccessibilityAudit[],
  activeAuditId?: string,
): AccessibilityAudit[] {
  const next = audits.map((audit) => ({ ...audit, pages: [...audit.pages] }));

  while (storeChars(next, activeAuditId) > MAX_AUDIT_STORE_CHARS) {
    const oldestInactiveIndex = next.findIndex((audit) => audit.id !== activeAuditId);
    if (oldestInactiveIndex >= 0 && next.length > 1) {
      next.splice(oldestInactiveIndex, 1);
      continue;
    }

    const auditWithHistoryIndex = next.findIndex((audit) => audit.pages.length > 1);
    if (auditWithHistoryIndex < 0) break;
    const audit = next[auditWithHistoryIndex]!;
    next[auditWithHistoryIndex] = {
      ...audit,
      pages: audit.pages.slice(1),
    };
  }

  return next;
}

export function boundMultipageAuditStore(store: MultipageAuditStore): MultipageAuditStore {
  const normalizedAudits = trimVisualStorage(store.audits
    .map(normalizeAudit)
    .slice(-MAX_AUDITS));
  const candidateActiveAuditId = store.activeAuditId
    && normalizedAudits.some((audit) => audit.id === store.activeAuditId)
    ? store.activeAuditId
    : normalizedAudits.at(-1)?.id;
  const audits = trimAuditHistoryToBudget(normalizedAudits, candidateActiveAuditId);
  const activeAuditId = candidateActiveAuditId && audits.some((audit) => audit.id === candidateActiveAuditId)
    ? candidateActiveAuditId
    : audits.at(-1)?.id;

  return {
    version: MULTIPAGE_AUDIT_VERSION,
    audits,
    ...(activeAuditId ? { activeAuditId } : {}),
  };
}

function normalizeStore(value: unknown): MultipageAuditStore {
  if (!value || typeof value !== 'object') return emptyMultipageAuditStore();
  const candidate = value as Partial<MultipageAuditStore>;
  if (candidate.version !== MULTIPAGE_AUDIT_VERSION || !Array.isArray(candidate.audits)) {
    return emptyMultipageAuditStore();
  }
  const audits = candidate.audits
    .filter((audit): audit is AccessibilityAudit => Boolean(audit && typeof audit === 'object' && audit.id));
  return boundMultipageAuditStore({
    version: MULTIPAGE_AUDIT_VERSION,
    audits,
    ...(candidate.activeAuditId ? { activeAuditId: candidate.activeAuditId } : {}),
  });
}

export async function loadMultipageAuditStore(): Promise<MultipageAuditStore> {
  const stored = await browser.storage.local.get(MULTIPAGE_AUDIT_STORAGE_KEY);
  return normalizeStore(stored[MULTIPAGE_AUDIT_STORAGE_KEY]);
}

export async function saveMultipageAuditStore(store: MultipageAuditStore): Promise<void> {
  const bounded = boundMultipageAuditStore(store);
  try {
    await browser.storage.local.set({
      [MULTIPAGE_AUDIT_STORAGE_KEY]: bounded,
    });
  } catch (reason) {
    const active = activeAuditFromStore(bounded);
    if (!active?.pages.length) throw reason;
    const latestPage = active.pages.at(-1)!;
    const visualEvidence = latestPage.visualEvidence
      ? { ...latestPage.visualEvidence, visuals: [], storageTrimmed: true }
      : undefined;
    const fallback: MultipageAuditStore = {
      version: MULTIPAGE_AUDIT_VERSION,
      activeAuditId: active.id,
      audits: [{
        ...active,
        pages: [{
          ...latestPage,
          ...(visualEvidence ? { visualEvidence } : {}),
        }],
      }],
    };
    await browser.storage.local.set({ [MULTIPAGE_AUDIT_STORAGE_KEY]: fallback });
  }
}

function auditId(): string {
  return `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function recordMultipageAuditScan(
  scan: ScanResult,
  plan: AuditAnalysisPlan,
  visualEvidence?: AuditPageVisualEvidence,
): Promise<MultipageAuditStore> {
  const current = await loadMultipageAuditStore();
  const next = applyAuditAnalysis(current, scan, plan, auditId(), visualEvidence);
  await saveMultipageAuditStore(next);
  return loadMultipageAuditStore();
}

export async function readActiveAudit(): Promise<AccessibilityAudit | undefined> {
  return activeAuditFromStore(await loadMultipageAuditStore());
}

export async function storeAuditPrintEvidence(audit: AccessibilityAudit): Promise<string> {
  const bounded = boundMultipageAuditStore({
    version: MULTIPAGE_AUDIT_VERSION,
    activeAuditId: audit.id,
    audits: [audit],
  });
  const printableAudit = bounded.audits[0];
  if (!printableAudit) throw new Error('FocusTrace audit has no printable pages.');
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await browser.storage.session.set({
    [`${AUDIT_PRINT_EVIDENCE_PREFIX}${token}`]: { audit: printableAudit } satisfies AuditPrintEvidence,
  });
  return token;
}

export async function readAuditPrintEvidence(token: string): Promise<AuditPrintEvidence | undefined> {
  const key = `${AUDIT_PRINT_EVIDENCE_PREFIX}${token}`;
  const stored = await browser.storage.session.get(key);
  const evidence = stored[key] as AuditPrintEvidence | undefined;
  if (evidence) await browser.storage.session.remove(key).catch(() => undefined);
  return evidence;
}
