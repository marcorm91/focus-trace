import { useCallback, useEffect, useState } from 'react';
import {
  clearFocusMemoryHistory,
  readFocusMemoryForScan,
} from '../../../lib/focus-memory/storage';
import type { FocusMemoryComparison } from '../../../shared/focus-memory';
import type { ScanResult } from '../../../shared/types';

export interface FocusTraceMemoryState {
  enabled: boolean;
  loading: boolean;
  suppressed: boolean;
  comparison?: FocusMemoryComparison;
  clear: () => Promise<void>;
}

export function useFocusTraceMemory(scan: ScanResult): FocusTraceMemoryState {
  const [revision, setRevision] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suppressed, setSuppressed] = useState(false);
  const [comparison, setComparison] = useState<FocusMemoryComparison>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void readFocusMemoryForScan(scan)
      .then((state) => {
        if (cancelled) return;
        setEnabled(state.enabled);
        setSuppressed(state.suppressed);
        setComparison(state.comparison);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(false);
          setSuppressed(false);
          setComparison(undefined);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [revision, scan]);

  const clear = useCallback(async () => {
    await clearFocusMemoryHistory();
    setRevision((value) => value + 1);
  }, []);

  return {
    enabled,
    loading,
    suppressed,
    ...(comparison ? { comparison } : {}),
    clear,
  };
}
