import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from '#imports';
import {
  activeAuditFromStore,
  auditScopeForUrl,
  type AccessibilityAudit,
  type AuditAnalysisPlan,
  type AuditPageVisualEvidence,
  type AuditScopeCheck,
  type MultipageAuditStore,
} from '../../../lib/audit/multipage-audit';
import {
  loadMultipageAuditStore,
  MULTIPAGE_AUDIT_STORAGE_KEY,
  deleteMultipageAuditPage,
  recordMultipageAuditScan,
} from '../../../lib/audit/multipage-audit-storage';
import {
  captureReportVisualEvidence,
  collectReportComponents,
} from '../../../lib/report/visual-evidence';
import type { ScanResult } from '../../../shared/types';

interface PendingAuditScope {
  audit: AccessibilityAudit;
  site: string;
  url: string;
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

export function useMultipageAudit() {
  const [store, setStore] = useState<MultipageAuditStore>();
  const [pendingScope, setPendingScope] = useState<PendingAuditScope>();
  const pendingResolver = useRef<PendingResolver | undefined>(undefined);

  const refresh = useCallback(async () => {
    const next = await loadMultipageAuditStore();
    setStore(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = (
      changes: StorageChangeMap,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[MULTIPAGE_AUDIT_STORAGE_KEY]) return;
      void refresh();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, [refresh]);

  const activeAudit = useMemo(
    () => store ? activeAuditFromStore(store) : undefined,
    [store],
  );

  const preparePageAnalysis = useCallback(async (url: string): Promise<AuditAnalysisPlan | null> => {
    const latest = await refresh();
    const scope: AuditScopeCheck = auditScopeForUrl(latest, url);
    if (scope.kind === 'new' || scope.kind === 'same-site') return scope.plan;

    if (pendingResolver.current) pendingResolver.current(null);
    setPendingScope({ audit: scope.audit, site: scope.site, url: scope.url });
    return new Promise<AuditAnalysisPlan | null>((resolve) => {
      pendingResolver.current = resolve;
    });
  }, [refresh]);

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

  const recordPageAnalysis = useCallback(async (scan: ScanResult, plan: AuditAnalysisPlan) => {
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
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id != null) {
        const components = await collectReportComponents(tab.id, scan, []);
        const capture = await captureReportVisualEvidence(
          tab.id,
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
      // The audit still keeps the analysis. The PDF will explicitly state that
      // visual evidence was unavailable for this review instead of using stale crops.
    }

    const next = await recordMultipageAuditScan(scan, plan, visualEvidence);
    setStore(next);
  }, []);

  const deleteAuditPage = useCallback(async (auditId: string, pageKey: string) => {
    const next = await deleteMultipageAuditPage(auditId, pageKey);
    setStore(next);
  }, []);

  return {
    activeAudit,
    pendingScope,
    decisionPending: Boolean(pendingScope),
    preparePageAnalysis,
    recordPageAnalysis,
    deleteAuditPage,
    addPendingSiteToCurrentAudit,
    startPendingSiteAsNewAudit,
    cancelPendingAuditScope,
    refreshAudit: refresh,
  };
}
