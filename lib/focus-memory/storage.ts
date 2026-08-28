import { browser } from '#imports';
import {
  FOCUS_MEMORY_SETTINGS_STORAGE_KEY,
  FOCUS_MEMORY_STORAGE_KEY,
  normalizeFocusMemorySettings,
  normalizeFocusMemoryStore,
  pruneFocusMemoryObservations,
  recordFocusMemoryObservation,
  type FocusMemoryComparison,
  type FocusMemorySettings,
} from '../../shared/focus-memory';
import type { ScanResult } from '../../shared/types';

export interface FocusMemoryViewState {
  enabled: boolean;
  suppressed: boolean;
  hasHistory: boolean;
  comparison?: FocusMemoryComparison;
}

async function loadMemoryStorage() {
  const stored = await browser.storage.local.get([
    FOCUS_MEMORY_STORAGE_KEY,
    FOCUS_MEMORY_SETTINGS_STORAGE_KEY,
  ]);
  const settings = normalizeFocusMemorySettings(stored[FOCUS_MEMORY_SETTINGS_STORAGE_KEY]);
  const store = normalizeFocusMemoryStore(stored[FOCUS_MEMORY_STORAGE_KEY]);
  const observations = pruneFocusMemoryObservations(store.observations);

  if (observations.length !== store.observations.length) {
    if (observations.length) {
      await browser.storage.local.set({
        [FOCUS_MEMORY_STORAGE_KEY]: { version: 1, observations },
      });
    } else {
      await browser.storage.local.remove(FOCUS_MEMORY_STORAGE_KEY);
    }
  }

  return {
    settings,
    store: { version: 1 as const, observations },
  };
}

function scanIsSuppressed(settings: FocusMemorySettings, scan: ScanResult): boolean {
  return typeof settings.ignoreScansAtOrBefore === 'number'
    && scan.scannedAt <= settings.ignoreScansAtOrBefore;
}

export async function focusMemorySettingsState(): Promise<{
  settings: FocusMemorySettings;
  hasHistory: boolean;
}> {
  const { settings, store } = await loadMemoryStorage();
  return { settings, hasHistory: store.observations.length > 0 };
}

export async function setFocusMemoryEnabled(enabled: boolean): Promise<FocusMemorySettings> {
  const { settings } = await loadMemoryStorage();
  const next: FocusMemorySettings = {
    ...settings,
    enabled,
    ...(enabled ? { ignoreScansAtOrBefore: Date.now() } : {}),
  };
  await browser.storage.local.set({ [FOCUS_MEMORY_SETTINGS_STORAGE_KEY]: next });
  return next;
}

export async function recordFocusMemoryScan(scan: ScanResult): Promise<FocusMemoryComparison | undefined> {
  const { settings, store } = await loadMemoryStorage();
  if (!settings.enabled || scanIsSuppressed(settings, scan)) return undefined;

  const result = recordFocusMemoryObservation(store, scan);
  await browser.storage.local.set({ [FOCUS_MEMORY_STORAGE_KEY]: result.store });
  return result.comparison;
}

export async function readFocusMemoryForScan(scan: ScanResult): Promise<FocusMemoryViewState> {
  const { settings, store } = await loadMemoryStorage();
  const suppressed = scanIsSuppressed(settings, scan);
  if (!settings.enabled || suppressed) {
    return {
      enabled: settings.enabled,
      suppressed,
      hasHistory: store.observations.length > 0,
    };
  }

  return {
    enabled: true,
    suppressed: false,
    hasHistory: store.observations.length > 0,
    comparison: recordFocusMemoryObservation(store, scan).comparison,
  };
}

export async function clearFocusMemoryHistory(): Promise<void> {
  const stored = await browser.storage.local.get(FOCUS_MEMORY_SETTINGS_STORAGE_KEY);
  const settings = normalizeFocusMemorySettings(stored[FOCUS_MEMORY_SETTINGS_STORAGE_KEY]);
  const nextSettings: FocusMemorySettings = {
    ...settings,
    ignoreScansAtOrBefore: Date.now(),
  };
  await browser.storage.local.remove(FOCUS_MEMORY_STORAGE_KEY);
  await browser.storage.local.set({ [FOCUS_MEMORY_SETTINGS_STORAGE_KEY]: nextSettings });
}
