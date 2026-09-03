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
const MAX_VISUALS_PER_PAGE = 2;
const MAX_VISUAL_DATA_CHARS = 3_000_000;

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

function normalizeStore(value: unknown): MultipageAuditStore {
  if (!value || typeof value !== 'object') return emptyMultipageAuditStore();
  const candidate = value as Partial<MultipageAuditStore>;
  if (candidate.version !== MULTIPAGE_AUDIT_VERSION || !Array.isArray(candidate.audits)) {
    return emptyMultipageAuditStore();
  }
  const audits = trimVisualStorage(candidate.audits
    .filter((audit): audit is AccessibilityAudit => Boolean(audit && typeof audit === 'object' && audit.id))
    .map(normalizeAudit)
    .slice(-MAX_AUDITS));
  const activeAuditId = candidate.activeAuditId && audits.some((audit) => audit.id === candidate.activeAuditId)
    ? candidate.activeAuditId
    : audits.at(-1)?.id;
  return {
    version: MULTIPAGE_AUDIT_VERSION,
    audits,
    ...(activeAuditId ? { activeAuditId } : {}),
  };
}

export async function loadMultipageAuditStore(): Promise<MultipageAuditStore> {
  const stored = await browser.storage.local.get(MULTIPAGE_AUDIT_STORAGE_KEY);
  return normalizeStore(stored[MULTIPAGE_AUDIT_STORAGE_KEY]);
}

export async function saveMultipageAuditStore(store: MultipageAuditStore): Promise<void> {
  await browser.storage.local.set({
    [MULTIPAGE_AUDIT_STORAGE_KEY]: normalizeStore(store),
  });
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
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await browser.storage.session.set({
    [`${AUDIT_PRINT_EVIDENCE_PREFIX}${token}`]: { audit } satisfies AuditPrintEvidence,
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
