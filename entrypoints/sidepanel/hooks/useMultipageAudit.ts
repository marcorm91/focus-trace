import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from '#imports';
import {
  activeAuditFromStore,
  auditScopeForUrl,
  normalizeAuditPageUrl,
  type AccessibilityAudit,
  type AuditAnalysisPlan,
  type AuditPageVisualEvidence,
  type AuditScopeCheck,
  type MultipageAuditStore,
} from '../../../lib/audit/multipage-audit';
import {
  loadMultipageAuditStore,
  MULTIPAGE_AUDIT_STORAGE_KEY,
} from '../../../lib/audit/multipage-audit-storage';
import {
  clearMultipageAudits,
  deleteMultipageAuditPage,
  recordMultipageAuditScan,
  recordMultipageAuditScope,
} from '../../../lib/audit/multipage-audit-client';
import {
  captureReportVisualEvidence,
  collectReportComponents,
} from '../../../lib/report/visual-evidence';
import { resolveVisibleTabCaptureSource } from '../../../lib/extension/visible-tab-capture';
import type { ExtensionMessage, ScanResult, SessionState } from '../../../shared/types';

interface PendingAuditScope {
  audit: AccessibilityAudit;
  site: string;
  url: string;
  purpose: 'analysis' | 'trace';
}

type PendingResolver = (plan: AuditAnalysisPlan | null) => void;
type StorageChangeMap = Record<string, { newValue?: unknown; oldValue?: unknown }>;
const MAX_AUDIT_VISUALS_PER_REVIEW = 3;

function staticVisualTargetCount(scan: ScanResult): number {
  return new Set(
    [...scan.issues, ...scan.review, ...(scan.warnings ?? [])]
      .flatMap((issue) => issue.targets)
      .filter(Boolean),
  ).size;
}

export function useMultipageAudit(tabId?: number) {
  const [store, setStore] = useState<MultipageAuditStore>();
  const [pendingScope, setPendingScope] = useState<PendingAuditScope>();
  const pendingResolver = useRef<PendingResolver | undefined>(undefined);

  const refreshRevision = useRef(0);
  const scopeGeneration = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      refreshRevision.current += 1;
    };
  }, []);

  useEffect(() => () => {
    scopeGeneration.current += 1;
    pendingResolver.current?.(null);
    pendingResolver.current = undefined;
    setPendingScope(undefined);
  }, [tabId]);

  const refresh = useCallback(async () => {
    const revision = ++refreshRevision.current;
    const next = await loadMultipageAuditStore();
    if (mounted.current && revision === refreshRevision.current) setStore(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const onChanged = (
      changes: StorageChangeMap,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[MULTIPAGE_AUDIT_STORAGE_KEY]) return;
      void refresh().catch(() => undefined);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, [refresh]);

  const activeAudit = useMemo(
    () => store ? activeAuditFromStore(store) : undefined,
    [store],
  );

  const preparePageAnalysis = useCallback(async (url: string, purpose: 'analysis' | 'trace' = 'analysis'): Promise<AuditAnalysisPlan | null> => {
    const generation = scopeGeneration.current;
    const latest = await refresh();
    if (!mounted.current || generation !== scopeGeneration.current) return null;
    const scope: AuditScopeCheck = auditScopeForUrl(latest, url);
    if (scope.kind === 'new' || scope.kind === 'same-site') return scope.plan;

    if (pendingResolver.current) pendingResolver.current(null);
    setPendingScope({ audit: scope.audit, site: scope.site, url: scope.url, purpose });
    return new Promise<AuditAnalysisPlan | null>((resolve) => {
      pendingResolver.current = resolve;
    });
  }, [refresh]);

  const prepareTraceScope = useCallback(async (targetTabId: number): Promise<boolean> => {
    const tab = await browser.tabs.get(targetTabId);
    if (!tab.url) throw new Error('FocusTrace could not resolve the current page URL.');
    const plan = await preparePageAnalysis(tab.url, 'trace');
    if (!plan) return false;
    // Navigation while the modal is open invalidates the user's scope decision.
    const current = await browser.tabs.get(targetTabId);
    if (!current.url || normalizeAuditPageUrl(current.url) !== normalizeAuditPageUrl(tab.url)) {
      throw new Error('The page changed. Start Trace again on the current page.');
    }
    await recordMultipageAuditScope(plan);
    await refresh();
    return true;
  }, [preparePageAnalysis, refresh]);

  const resolvePending = useCallback((plan: AuditAnalysisPlan | null) => {
    const resolve = pendingResolver.current;
    pendingResolver.current = undefined;
    setPendingScope(undefined);
    resolve?.(plan);
  }, []);

  const addPendingSiteToCurrentAudit = useCallback(() => {
    if (!pendingScope) return;
    resolvePending({
      kind: 'existing',
      auditId: pendingScope.audit.id,
      site: pendingScope.site,
      addSite: true,
    });
  }, [pendingScope, resolvePending]);

  const startPendingSiteAsNewAudit = useCallback(() => {
    if (!pendingScope) return;
    resolvePending({ kind: 'new', site: pendingScope.site });
  }, [pendingScope, resolvePending]);

  const cancelPendingAuditScope = useCallback(() => resolvePending(null), [resolvePending]);

  const recordPageAnalysis = useCallback(async (
    tabId: number,
    scan: ScanResult,
    plan: AuditAnalysisPlan,
  ) => {
    if (scan.scope?.type === 'component') return;

    const fallbackEligibleCount = staticVisualTargetCount(scan);
    let visualEvidence: AuditPageVisualEvidence = {
      capturedAt: Date.now(),
      visuals: [],
      eligibleCount: fallbackEligibleCount,
      limitReached: fallbackEligibleCount > MAX_AUDIT_VISUALS_PER_REVIEW,
      captureUnavailable: fallbackEligibleCount > 0,
    };

    try {
      if (await resolveVisibleTabCaptureSource(tabId, scan.url)) {
        const components = await collectReportComponents(tabId, scan, []);
        const capture = await captureReportVisualEvidence(
          tabId,
          scan,
          components,
          [],
          MAX_AUDIT_VISUALS_PER_REVIEW,
        );
        visualEvidence = {
          capturedAt: Date.now(),
          visuals: capture.visuals,
          eligibleCount: capture.eligibleCount,
          limitReached: capture.limitReached,
          captureUnavailable: capture.captureUnavailable,
        };
      }
    } catch {
      // The audit still keeps the analysis. The Report workspace explains that
      // this page must be analyzed again before images can be included.
    }

    const session = await browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_SESSION',
      tabId,
    } satisfies ExtensionMessage) as SessionState;
    await recordMultipageAuditScan(scan, plan, visualEvidence, session.events);
    await refresh();
  }, [refresh]);

  const deleteAuditPage = useCallback(async (auditId: string, pageKey: string) => {
    await deleteMultipageAuditPage(auditId, pageKey);
    await refresh();
  }, [refresh]);

  const clearAuditHistory = useCallback(async () => {
    await clearMultipageAudits();
    await refresh();
  }, [refresh]);

  return {
    activeAudit,
    pendingScope,
    decisionPending: Boolean(pendingScope),
    preparePageAnalysis,
    prepareTraceScope,
    recordPageAnalysis,
    deleteAuditPage,
    clearAuditHistory,
    addPendingSiteToCurrentAudit,
    startPendingSiteAsNewAudit,
    cancelPendingAuditScope,
    refreshAudit: refresh,
  };
}
