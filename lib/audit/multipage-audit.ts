import type { ReportVisualEvidence } from '../report/visual-evidence';
import { sanitizeRuntimeUrl } from '../runtime/url-privacy';
import type { RuntimeEvent, ScanResult } from '../../shared/types';
import { auditProfileSnapshotKey } from './audit-profiles';
import { applyFindingLifecycle } from './finding-lifecycle';

export const MULTIPAGE_AUDIT_VERSION = 1 as const;
export const MAX_TRACE_EVENTS_PER_AUDIT_PAGE = 200;

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
  traceEvents?: RuntimeEvent[];
  traceUpdatedAt?: number;
  traceTruncated?: boolean;
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

export function auditScopeLabel(audit: Pick<AccessibilityAudit, 'sites' | 'name'>): string {
  return auditScopeSites(audit).join(' · ');
}

export function auditScopeSites(audit: Pick<AccessibilityAudit, 'sites' | 'name'>): string[] {
  const sites = [...new Set(audit.sites.map(auditSiteKey).filter(Boolean))];
  return sites.length ? sites : [audit.name];
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

// Selecting a Trace scope must not manufacture a static page review.
export function applyAuditScope(
  store: MultipageAuditStore,
  plan: AuditAnalysisPlan,
  id: string,
  now: number,
): MultipageAuditStore {
  if (plan.kind === 'new') {
    return {
      ...store,
      activeAuditId: id,
      audits: [...store.audits, {
        id, name: plan.site, sites: [plan.site], pages: [], createdAt: now, updatedAt: now,
      }],
    };
  }
  const audit = store.audits.find((item) => item.id === plan.auditId);
  if (!audit) throw new Error('The selected audit is no longer available.');
  return {
    ...store,
    activeAuditId: audit.id,
    audits: store.audits.map((item) => item.id === audit.id && plan.addSite
      ? { ...item, sites: [...new Set([...item.sites, plan.site])], updatedAt: now }
      : item),
  };
}

function traceEventsForPage(pageUrl: string, events: RuntimeEvent[]): RuntimeEvent[] {
  const safePageUrl = sanitizeRuntimeUrl(pageUrl);
  return events.filter((event) => event.pageUrl === safePageUrl);
}

export function mergeAuditPageTraceEvents(
  page: AuditPageRecord,
  events: RuntimeEvent[],
): AuditPageRecord {
  const incoming = traceEventsForPage(page.url, events);
  if (!incoming.length) return page;
  const byId = new Map((page.traceEvents ?? []).map((event) => [event.id, event]));
  incoming.forEach((event) => byId.set(event.id, event));
  const combined = [...byId.values()].sort((first, second) => first.timestamp - second.timestamp);
  const traceTruncated = Boolean(page.traceTruncated) || combined.length > MAX_TRACE_EVENTS_PER_AUDIT_PAGE;
  const traceEvents = combined.slice(-MAX_TRACE_EVENTS_PER_AUDIT_PAGE);
  if (JSON.stringify(traceEvents) === JSON.stringify(page.traceEvents ?? [])
    && traceTruncated === Boolean(page.traceTruncated)) return page;
  return {
    ...page,
    traceEvents,
    traceUpdatedAt: Math.max(...traceEvents.map((event) => event.timestamp)),
    ...(traceTruncated ? { traceTruncated: true } : {}),
  };
}

export function mergeAuditTraceEvents(
  audit: AccessibilityAudit,
  events: RuntimeEvent[],
): AccessibilityAudit {
  if (!events.length) return audit;
  const pageMatchCounts = new Map<string, number>();
  audit.pages.forEach((page) => {
    const safeUrl = sanitizeRuntimeUrl(page.url);
    pageMatchCounts.set(safeUrl, (pageMatchCounts.get(safeUrl) ?? 0) + 1);
  });
  const unambiguousEvents = events.filter((event) =>
    event.pageUrl && pageMatchCounts.get(event.pageUrl) === 1);
  const pages = audit.pages.map((page) => mergeAuditPageTraceEvents(page, unambiguousEvents));
  if (pages.every((page, index) => page === audit.pages[index])) return audit;
  return {
    ...audit,
    pages,
    updatedAt: Math.max(audit.updatedAt, ...pages.map((page) => page.traceUpdatedAt ?? page.reviewedAt)),
  };
}

function pageRecord(
  scan: ScanResult,
  visualEvidence?: AuditPageVisualEvidence,
): AuditPageRecord {
  const record: AuditPageRecord = {
    key: auditPageKey(scan.url),
    url: normalizeAuditPageUrl(scan.url),
    title: scan.title,
    reviewedAt: scan.scannedAt,
    scan,
    ...(visualEvidence ? { visualEvidence } : {}),
  };
  return record;
}

export function upsertAuditPage(
  audit: AccessibilityAudit,
  scan: ScanResult,
  visualEvidence?: AuditPageVisualEvidence,
): AccessibilityAudit {
  const key = auditPageKey(scan.url);
  const index = audit.pages.findIndex((page) => page.key === key);
  const previousCandidate = index >= 0 ? audit.pages[index]!.scan : undefined;
  const previousScan = previousCandidate
    && auditProfileSnapshotKey(previousCandidate) === auditProfileSnapshotKey(scan)
    ? previousCandidate
    : undefined;
  const previousPage = index >= 0 ? audit.pages[index] : undefined;
  const record: AuditPageRecord = {
    ...pageRecord(applyFindingLifecycle(previousScan, scan), visualEvidence),
    ...(previousPage?.traceEvents ? { traceEvents: previousPage.traceEvents } : {}),
    ...(previousPage?.traceUpdatedAt ? { traceUpdatedAt: previousPage.traceUpdatedAt } : {}),
    ...(previousPage?.traceTruncated ? { traceTruncated: true } : {}),
  };
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
  traceEvents: RuntimeEvent[] = [],
): MultipageAuditStore {
  if (plan.kind === 'new') {
    const reviewedAt = scan.scannedAt;
    const normalizedScan = applyFindingLifecycle(undefined, scan);
    const audit = mergeAuditTraceEvents({
      id: auditId,
      name: plan.site || scan.title || 'Audit',
      createdAt: reviewedAt,
      updatedAt: reviewedAt,
      sites: [plan.site],
      pages: [pageRecord(normalizedScan, visualEvidence)],
    }, traceEvents);
    return {
      version: MULTIPAGE_AUDIT_VERSION,
      activeAuditId: audit.id,
      audits: [...store.audits, audit],
    };
  }

  const index = store.audits.findIndex((audit) => audit.id === plan.auditId);
  if (index < 0) {
    return applyAuditAnalysis(store, scan, { kind: 'new', site: plan.site }, auditId, visualEvidence, traceEvents);
  }

  const current = store.audits[index]!;
  const sites = plan.addSite && !current.sites.includes(plan.site)
    ? [...current.sites, plan.site]
    : current.sites;
  const nextAudit = mergeAuditTraceEvents(
    upsertAuditPage({ ...current, sites }, scan, visualEvidence),
    traceEvents,
  );
  const audits = [...store.audits];
  audits[index] = nextAudit;
  return {
    version: MULTIPAGE_AUDIT_VERSION,
    activeAuditId: nextAudit.id,
    audits,
  };
}

export function updateAuditTraceEvents(
  store: MultipageAuditStore,
  events: RuntimeEvent[],
): MultipageAuditStore {
  const active = activeAuditFromStore(store);
  if (!active) return store;
  const nextAudit = mergeAuditTraceEvents(active, events);
  if (nextAudit === active) return store;
  return {
    ...store,
    audits: store.audits.map((audit) => audit.id === active.id ? nextAudit : audit),
  };
}

export function removeAuditTraceInteraction(
  store: MultipageAuditStore,
  interactionId: string,
): MultipageAuditStore {
  const active = activeAuditFromStore(store);
  if (!active) return store;
  let changed = false;
  const pages = active.pages.map((page) => {
    if (!page.traceEvents?.some((event) => event.interactionId === interactionId)) return page;
    changed = true;
    const traceEvents = page.traceEvents.filter((event) => event.interactionId !== interactionId);
    if (!traceEvents.length) {
      const {
        traceEvents: _traceEvents,
        traceUpdatedAt: _traceUpdatedAt,
        traceTruncated: _traceTruncated,
        ...rest
      } = page;
      return rest;
    }
    return {
      ...page,
      traceEvents,
      traceUpdatedAt: Math.max(...traceEvents.map((event) => event.timestamp)),
    };
  });
  if (!changed) return store;
  const nextAudit = { ...active, pages };
  return {
    ...store,
    audits: store.audits.map((audit) => audit.id === active.id ? nextAudit : audit),
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

export function removeAuditPage(
  store: MultipageAuditStore,
  auditId: string,
  pageKey: string,
): MultipageAuditStore {
  const audits = store.audits.flatMap((audit) => {
    if (audit.id !== auditId) return [audit];
    const pages = audit.pages.filter((page) => page.key !== pageKey);
    if (pages.length === 0) return [];
    return [{
      ...audit,
      updatedAt: Math.max(audit.createdAt, ...pages.map((page) => page.reviewedAt)),
      sites: [...new Set(pages.map((page) => auditSiteKey(page.url)))],
      pages,
    }];
  });
  const activeAuditId = audits.some((audit) => audit.id === store.activeAuditId)
    ? store.activeAuditId
    : audits.at(-1)?.id;

  return {
    version: MULTIPAGE_AUDIT_VERSION,
    audits,
    ...(activeAuditId ? { activeAuditId } : {}),
  };
}

export function updateAuditScan(
  store: MultipageAuditStore,
  scan: ScanResult,
): MultipageAuditStore {
  const key = auditPageKey(scan.url);
  let changed = false;
  const audits = store.audits.map((audit) => {
    const pages = audit.pages.map((page) => {
      if (page.key !== key || page.scan.scannedAt !== scan.scannedAt) return page;
      changed = true;
      return {
        ...page,
        title: scan.title,
        scan,
      };
    });
    return pages.some((page, index) => page !== audit.pages[index]) ? { ...audit, pages } : audit;
  });
  return changed ? { ...store, audits } : store;
}
