import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from '#imports';
import {
  activeAuditFromStore,
  auditScopeForUrl,
  type AccessibilityAudit,
  type AuditAnalysisPlan,
  type AuditScopeCheck,
  type MultipageAuditStore,
} from '../../../lib/audit/multipage-audit';
import {
  loadMultipageAuditStore,
  MULTIPAGE_AUDIT_STORAGE_KEY,
  recordMultipageAuditScan,
} from '../../../lib/audit/multipage-audit-storage';
import type { ScanResult } from '../../../shared/types';

interface PendingAuditScope {
  audit: AccessibilityAudit;
  site: string;
  url: string;
}

type PendingResolver = (plan: AuditAnalysisPlan | null) => void;

export function useMultipageAudit() {
  const [store, setStore] = useState<MultipageAuditStore>();
  const [pendingScope, setPendingScope] = useState<PendingAuditScope>();
  const pendingResolver = useRef<PendingResolver>();

  const refresh = useCallback(async () => {
    const next = await loadMultipageAuditStore();
    setStore(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = (
      changes: Record<string, browser.Storage.StorageChange>,
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
    const next = await recordMultipageAuditScan(scan, plan);
    setStore(next);
  }, []);

  return {
    activeAudit,
    pendingScope,
    decisionPending: Boolean(pendingScope),
    preparePageAnalysis,
    recordPageAnalysis,
    addPendingSiteToCurrentAudit,
    startPendingSiteAsNewAudit,
    cancelPendingAuditScope,
    refreshAudit: refresh,
  };
}
