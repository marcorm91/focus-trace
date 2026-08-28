import { useCallback, useEffect, useState } from 'react';
import {
  clearFocusMemoryHistory,
  markFocusMemoryFindingResolved,
  readFocusMemoryForScan,
} from '../../../lib/focus-memory/storage';
import type {
  FocusMemoryComparison,
  FocusMemoryFindingHistory,
} from '../../../shared/focus-memory';
import type { ScanResult } from '../../../shared/types';

export interface FocusTraceMemoryState {
  enabled: boolean;
  loading: boolean;
  suppressed: boolean;
  comparison?: FocusMemoryComparison;
  history?: FocusMemoryFindingHistory[];
  resolveFinding: (fingerprint: string, ruleId?: string) => Promise<boolean>;
  clear: () => Promise<void>;
}

export function useFocusTraceMemory(scan: ScanResult): FocusTraceMemoryState {
  const [revision, setRevision] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suppressed, setSuppressed] = useState(false);
  const [comparison, setComparison] = useState<FocusMemoryComparison>();
  const [history, setHistory] = useState<FocusMemoryFindingHistory[]>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void readFocusMemoryForScan(scan)
      .then((state) => {
        if (cancelled) return;
        setEnabled(state.enabled);
        setSuppressed(state.suppressed);
        setComparison(state.comparison);
        setHistory(state.history);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(false);
          setSuppressed(false);
          setComparison(undefined);
          setHistory(undefined);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [revision, scan]);

  const resolveFinding = useCallback(async (fingerprint: string, ruleId?: string) => {
    const resolved = await markFocusMemoryFindingResolved(scan, fingerprint, ruleId);
    if (resolved) setRevision((value) => value + 1);
    return resolved;
  }, [scan]);

  const clear = useCallback(async () => {
    await clearFocusMemoryHistory();
    setRevision((value) => value + 1);
  }, []);

  return {
    enabled,
    loading,
    suppressed,
    ...(comparison ? { comparison } : {}),
    ...(history ? { history } : {}),
    resolveFinding,
    clear,
  };
}
