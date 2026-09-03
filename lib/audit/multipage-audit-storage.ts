import { browser } from '#imports';
import type { ScanResult } from '../../shared/types';
import {
  MULTIPAGE_AUDIT_VERSION,
  activeAuditFromStore,
  applyAuditAnalysis,
  emptyMultipageAuditStore,
  type AccessibilityAudit,
  type AuditAnalysisPlan,
  type MultipageAuditStore,
} from './multipage-audit';

export const MULTIPAGE_AUDIT_STORAGE_KEY = 'focustrace:multipage-audits:v1';
export const AUDIT_PRINT_EVIDENCE_PREFIX = 'focustrace:audit-print:';
const MAX_AUDITS = 8;
const MAX_PAGES_PER_AUDIT = 40;

export interface AuditPrintEvidence {
  audit: AccessibilityAudit;
}

function normalizeAudit(audit: AccessibilityAudit): AccessibilityAudit {
  return {
    ...audit,
    sites: [...new Set(audit.sites)].filter(Boolean),
    pages: audit.pages.slice(-MAX_PAGES_PER_AUDIT),
  };
}

function normalizeStore(value: unknown): MultipageAuditStore {
  if (!value || typeof value !== 'object') return emptyMultipageAuditStore();
  const candidate = value as Partial<MultipageAuditStore>;
  if (candidate.version !== MULTIPAGE_AUDIT_VERSION || !Array.isArray(candidate.audits)) {
    return emptyMultipageAuditStore();
  }
  const audits = candidate.audits
    .filter((audit): audit is AccessibilityAudit => Boolean(audit && typeof audit === 'object' && audit.id))
    .map(normalizeAudit)
    .slice(-MAX_AUDITS);
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
): Promise<MultipageAuditStore> {
  const current = await loadMultipageAuditStore();
  const next = applyAuditAnalysis(current, scan, plan, auditId());
  await saveMultipageAuditStore(next);
  return next;
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
