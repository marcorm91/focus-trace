import type { ReportVisualEvidence } from '../report/visual-evidence';
import type { ScanResult } from '../../shared/types';

export const MULTIPAGE_AUDIT_VERSION = 1 as const;

export interface AuditPageVisualEvidence {
  capturedAt: number;
  visuals: ReportVisualEvidence[];
  eligibleCount: number;
  limitReached: boolean;
  captureUnavailable: boolean;
  storageTrimmed?: boolean;
}

export interface AuditPageRecord {
  key: string;
  url: string;
  title: string;
  reviewedAt: number;
  scan: ScanResult;
  visualEvidence?: AuditPageVisualEvidence;
}

export interface AccessibilityAudit {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sites: string[];
  pages: AuditPageRecord[];
}

export interface MultipageAuditStore {
  version: typeof MULTIPAGE_AUDIT_VERSION;
  activeAuditId?: string;
  audits: AccessibilityAudit[];
}

export type AuditAnalysisPlan =
  | { kind: 'new'; site: string }
  | { kind: 'existing'; auditId: string; site: string; addSite: boolean };

export type AuditScopeCheck =
  | { kind: 'new'; plan: AuditAnalysisPlan }
  | { kind: 'same-site'; plan: AuditAnalysisPlan; audit: AccessibilityAudit }
  | { kind: 'different-site'; audit: AccessibilityAudit; site: string; url: string };

export interface AuditSummary {
  pages: number;
  failures: number;
  reviews: number;
  warnings: number;
}

const SPA_HASH = /^#!?\//;

export function emptyMultipageAuditStore(): MultipageAuditStore {
  return { version: MULTIPAGE_AUDIT_VERSION, audits: [] };
}

export function normalizeAuditPageUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    if (!SPA_HASH.test(url.hash)) url.hash = '';
    return url.href;
  } catch {
    const hashIndex = value.indexOf('#');
    if (hashIndex < 0) return value;
    const hash = value.slice(hashIndex);
    return SPA_HASH.test(hash) ? value : value.slice(0, hashIndex);
  }
}

export function auditPageKey(value: string): string {
  return normalizeAuditPageUrl(value);
}

export function auditSiteKey(value: string): string {
  try {
    const hostname = new URL(value).hostname.toLocaleLowerCase().replace(/^www\./, '');
    return hostname || value;
  } catch {
    return value.trim().toLocaleLowerCase().replace(/^www\./, '');
  }
}

export function activeAuditFromStore(store: MultipageAuditStore): AccessibilityAudit | undefined {
  if (!store.activeAuditId) return undefined;
  return store.audits.find((audit) => audit.id === store.activeAuditId);
}

export function auditScopeForUrl(store: MultipageAuditStore, url: string): AuditScopeCheck {
  const site = auditSiteKey(url);
  const active = activeAuditFromStore(store);
  if (!active) return { kind: 'new', plan: { kind: 'new', site } };
  if (active.sites.includes(site)) {
    return {
      kind: 'same-site',
      audit: active,
      plan: { kind: 'existing', auditId: active.id, site, addSite: false },
    };
  }
  return { kind: 'different-site', audit: active, site, url };
}

function pageRecord(scan: ScanResult, visualEvidence?: AuditPageVisualEvidence): AuditPageRecord {
  return {
    key: auditPageKey(scan.url),
    url: normalizeAuditPageUrl(scan.url),
    title: scan.title,
    reviewedAt: scan.scannedAt,
    scan,
    ...(visualEvidence ? { visualEvidence } : {}),
  };
}

export function upsertAuditPage(
  audit: AccessibilityAudit,
  scan: ScanResult,
  visualEvidence?: AuditPageVisualEvidence,
): AccessibilityAudit {
  const record = pageRecord(scan, visualEvidence);
  const index = audit.pages.findIndex((page) => page.key === record.key);
  const pages = [...audit.pages];
  if (index >= 0) pages[index] = record;
  else pages.push(record);

  return {
    ...audit,
    updatedAt: Math.max(audit.updatedAt, record.reviewedAt),
    pages,
  };
}

export function applyAuditAnalysis(
  store: MultipageAuditStore,
  scan: ScanResult,
  plan: AuditAnalysisPlan,
  auditId: string,
  visualEvidence?: AuditPageVisualEvidence,
): MultipageAuditStore {
  if (plan.kind === 'new') {
    const reviewedAt = scan.scannedAt;
    const audit: AccessibilityAudit = {
      id: auditId,
      name: plan.site || scan.title || 'Audit',
      createdAt: reviewedAt,
      updatedAt: reviewedAt,
      sites: [plan.site],
      pages: [pageRecord(scan, visualEvidence)],
    };
    return {
      version: MULTIPAGE_AUDIT_VERSION,
      activeAuditId: audit.id,
      audits: [...store.audits, audit],
    };
  }

  const index = store.audits.findIndex((audit) => audit.id === plan.auditId);
  if (index < 0) {
    return applyAuditAnalysis(store, scan, { kind: 'new', site: plan.site }, auditId, visualEvidence);
  }

  const current = store.audits[index]!;
  const sites = plan.addSite && !current.sites.includes(plan.site)
    ? [...current.sites, plan.site]
    : current.sites;
  const nextAudit = upsertAuditPage({ ...current, sites }, scan, visualEvidence);
  const audits = [...store.audits];
  audits[index] = nextAudit;
  return {
    version: MULTIPAGE_AUDIT_VERSION,
    activeAuditId: nextAudit.id,
    audits,
  };
}

export function auditSummary(audit: AccessibilityAudit): AuditSummary {
  return audit.pages.reduce<AuditSummary>((summary, page) => ({
    pages: summary.pages + 1,
    failures: summary.failures + page.scan.issues.length,
    reviews: summary.reviews + page.scan.review.length,
    warnings: summary.warnings + (page.scan.warnings?.length ?? 0),
  }), { pages: 0, failures: 0, reviews: 0, warnings: 0 });
}
