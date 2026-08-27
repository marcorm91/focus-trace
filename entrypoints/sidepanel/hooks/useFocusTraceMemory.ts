import { useCallback, useEffect, useState } from 'react';
import { browser } from '#imports';
import {
  DEFAULT_FOCUS_MEMORY_SETTINGS,
  FOCUS_MEMORY_SETTINGS_STORAGE_KEY,
  FOCUS_MEMORY_STORAGE_KEY,
  normalizeFocusMemorySettings,
  recordFocusMemoryObservation,
  type FocusMemoryComparison,
  type FocusMemorySettings,
} from '../../../shared/focus-memory';
import type { ScanResult } from '../../../shared/types';

export interface FocusTraceMemoryState {
  enabled: boolean;
  loading: boolean;
  suppressed: boolean;
  comparison?: FocusMemoryComparison;
  clear: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
}

export function useFocusTraceMemory(scan: ScanResult): FocusTraceMemoryState {
  const [revision, setRevision] = useState(0);
  const [enabled, setEnabledState] = useState(DEFAULT_FOCUS_MEMORY_SETTINGS.enabled);
  const [loading, setLoading] = useState(true);
  const [suppressed, setSuppressed] = useState(false);
  const [comparison, setComparison] = useState<FocusMemoryComparison>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const stored = await browser.storage.local.get([
        FOCUS_MEMORY_STORAGE_KEY,
        FOCUS_MEMORY_SETTINGS_STORAGE_KEY,
      ]);
      const settings = normalizeFocusMemorySettings(stored[FOCUS_MEMORY_SETTINGS_STORAGE_KEY]);
      if (cancelled) return;
      setEnabledState(settings.enabled);

      const scanIsSuppressed = typeof settings.ignoreScansAtOrBefore === 'number'
        && scan.scannedAt <= settings.ignoreScansAtOrBefore;
      if (!settings.enabled || scanIsSuppressed) {
        setComparison(undefined);
        setSuppressed(scanIsSuppressed);
        setLoading(false);
        return;
      }

      const result = recordFocusMemoryObservation(stored[FOCUS_MEMORY_STORAGE_KEY], scan);
      await browser.storage.local.set({
        [FOCUS_MEMORY_STORAGE_KEY]: result.store,
      });
      if (cancelled) return;
      setComparison(result.comparison);
      setSuppressed(false);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setComparison(undefined);
        setSuppressed(false);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [revision, scan]);

  const clear = useCallback(async () => {
    const stored = await browser.storage.local.get(FOCUS_MEMORY_SETTINGS_STORAGE_KEY);
    const settings = normalizeFocusMemorySettings(stored[FOCUS_MEMORY_SETTINGS_STORAGE_KEY]);
    const nextSettings: FocusMemorySettings = {
      ...settings,
      ignoreScansAtOrBefore: Date.now(),
    };
    await browser.storage.local.remove(FOCUS_MEMORY_STORAGE_KEY);
    await browser.storage.local.set({
      [FOCUS_MEMORY_SETTINGS_STORAGE_KEY]: nextSettings,
    });
    setRevision((value) => value + 1);
  }, []);

  const setEnabled = useCallback(async (nextEnabled: boolean) => {
    const stored = await browser.storage.local.get(FOCUS_MEMORY_SETTINGS_STORAGE_KEY);
    const settings = normalizeFocusMemorySettings(stored[FOCUS_MEMORY_SETTINGS_STORAGE_KEY]);
    await browser.storage.local.set({
      [FOCUS_MEMORY_SETTINGS_STORAGE_KEY]: {
        ...settings,
        enabled: nextEnabled,
      } satisfies FocusMemorySettings,
    });
    setRevision((value) => value + 1);
  }, []);

  return {
    enabled,
    loading,
    suppressed,
    ...(comparison ? { comparison } : {}),
    clear,
    setEnabled,
  };
}
