import { browser } from '#imports';
import {
  FOCUS_MEMORY_SETTINGS_STORAGE_KEY,
  FOCUS_MEMORY_STORAGE_KEY,
  focusMemoryScopeKey,
  normalizeFocusMemorySettings,
  normalizeFocusMemoryStore,
  pruneFocusMemoryObservations,
  recordFocusMemoryObservation,
  type FocusMemoryComparison,
  type FocusMemoryFindingHistory,
  type FocusMemorySettings,
} from '../../shared/focus-memory';
import {
  FOCUS_MEMORY_RESOLVED_STORAGE_KEY,
  applyResolvedFindingMemory,
  archiveResolvedFinding,
  normalizeFocusMemoryResolvedStore,
  pruneFocusMemoryResolvedFindings,
} from '../../shared/focus-memory-resolution';
import type { FocusMemoryCapturedEvidence, ScanResult } from '../../shared/types';

export interface FocusMemoryViewState {
  enabled: boolean;
  suppressed: boolean;
  hasHistory: boolean;
  comparison?: FocusMemoryComparison;
  history?: FocusMemoryFindingHistory[];
}

let memoryAccessQueue: Promise<unknown> = Promise.resolve();

function serializeMemoryAccess<T>(work: () => Promise<T>): Promise<T> {
  const next = memoryAccessQueue.catch(() => undefined).then(work);
  memoryAccessQueue = next;
  return next;
}

async function loadMemoryStorage() {
  const stored = await browser.storage.local.get([
    FOCUS_MEMORY_STORAGE_KEY,
    FOCUS_MEMORY_SETTINGS_STORAGE_KEY,
    FOCUS_MEMORY_RESOLVED_STORAGE_KEY,
  ]);
  const settings = normalizeFocusMemorySettings(stored[FOCUS_MEMORY_SETTINGS_STORAGE_KEY]);
  const store = normalizeFocusMemoryStore(stored[FOCUS_MEMORY_STORAGE_KEY]);
  const resolvedStore = normalizeFocusMemoryResolvedStore(stored[FOCUS_MEMORY_RESOLVED_STORAGE_KEY]);
  const observations = pruneFocusMemoryObservations(store.observations);
  const resolvedFindings = pruneFocusMemoryResolvedFindings(resolvedStore.findings);

  const removals: string[] = [];
  const updates: Record<string, unknown> = {};

  if (observations.length !== store.observations.length) {
    if (observations.length) {
      updates[FOCUS_MEMORY_STORAGE_KEY] = { version: 1, observations };
    } else {
      removals.push(FOCUS_MEMORY_STORAGE_KEY);
    }
  }

  if (resolvedFindings.length !== resolvedStore.findings.length) {
    if (resolvedFindings.length) {
      updates[FOCUS_MEMORY_RESOLVED_STORAGE_KEY] = { version: 1, findings: resolvedFindings };
    } else {
      removals.push(FOCUS_MEMORY_RESOLVED_STORAGE_KEY);
    }
  }

  if (Object.keys(updates).length) await browser.storage.local.set(updates);
  if (removals.length) await browser.storage.local.remove(removals);

  return {
    settings,
    store: { version: 1 as const, observations },
    resolvedFindings,
  };
}

function scanIsSuppressed(settings: FocusMemorySettings, scan: ScanResult): boolean {
  return typeof settings.ignoreScansAtOrBefore === 'number'
    && scan.scannedAt <= settings.ignoreScansAtOrBefore;
}

export function focusMemorySettingsState(): Promise<{
  settings: FocusMemorySettings;
  hasHistory: boolean;
}> {
  return serializeMemoryAccess(async () => {
    const { settings, store, resolvedFindings } = await loadMemoryStorage();
    return {
      settings,
      hasHistory: store.observations.length > 0 || resolvedFindings.length > 0,
    };
  });
}

export function setFocusMemoryEnabled(enabled: boolean): Promise<FocusMemorySettings> {
  return serializeMemoryAccess(async () => {
    const { settings } = await loadMemoryStorage();
    const next: FocusMemorySettings = {
      ...settings,
      enabled,
      ...(enabled ? { ignoreScansAtOrBefore: Date.now() } : {}),
    };
    await browser.storage.local.set({ [FOCUS_MEMORY_SETTINGS_STORAGE_KEY]: next });
    return next;
  });
}

export function recordFocusMemoryScan(
  scan: ScanResult,
  capturedEvidence: FocusMemoryCapturedEvidence[] = [],
): Promise<FocusMemoryComparison | undefined> {
  return serializeMemoryAccess(async () => {
    const { settings, store, resolvedFindings } = await loadMemoryStorage();
    if (!settings.enabled || scanIsSuppressed(settings, scan)) return undefined;

    const result = recordFocusMemoryObservation(store, scan, Date.now(), capturedEvidence);
    const resolved = applyResolvedFindingMemory(
      result.comparison,
      result.history,
      resolvedFindings,
      focusMemoryScopeKey(scan),
    );
    await browser.storage.local.set({ [FOCUS_MEMORY_STORAGE_KEY]: result.store });
    return resolved.comparison;
  });
}

export function readFocusMemoryForScan(scan: ScanResult): Promise<FocusMemoryViewState> {
  return serializeMemoryAccess(async () => {
    const { settings, store, resolvedFindings } = await loadMemoryStorage();
    const suppressed = scanIsSuppressed(settings, scan);
    if (!settings.enabled || suppressed) {
      return {
        enabled: settings.enabled,
        suppressed,
        hasHistory: store.observations.length > 0 || resolvedFindings.length > 0,
      };
    }

    const result = recordFocusMemoryObservation(store, scan);
    const resolved = applyResolvedFindingMemory(
      result.comparison,
      result.history,
      resolvedFindings,
      focusMemoryScopeKey(scan),
    );
    return {
      enabled: true,
      suppressed: false,
      hasHistory: store.observations.length > 0 || resolvedFindings.length > 0,
      comparison: resolved.comparison,
      history: resolved.history,
    };
  });
}

export function markFocusMemoryFindingResolved(
  scan: ScanResult,
  fingerprint: string,
  ruleId?: string,
): Promise<boolean> {
  return serializeMemoryAccess(async () => {
    const { settings, store, resolvedFindings } = await loadMemoryStorage();
    if (!settings.enabled || scanIsSuppressed(settings, scan)) return false;

    const scopeKey = focusMemoryScopeKey(scan);
    const result = recordFocusMemoryObservation(store, scan);
    const resolved = applyResolvedFindingMemory(
      result.comparison,
      result.history,
      resolvedFindings,
      scopeKey,
    );
    const finding = resolved.history.find((item) => item.fingerprint === fingerprint);
    if (finding?.state !== 'resolved') return false;

    const archived = archiveResolvedFinding(
      result.store.observations,
      resolvedFindings,
      scopeKey,
      fingerprint,
      ruleId ?? finding.ruleId,
    );

    await browser.storage.local.set({
      [FOCUS_MEMORY_STORAGE_KEY]: { version: 1, observations: archived.observations },
      [FOCUS_MEMORY_RESOLVED_STORAGE_KEY]: { version: 1, findings: archived.resolvedFindings },
    });
    return true;
  });
}

export function clearFocusMemoryHistory(): Promise<void> {
  return serializeMemoryAccess(async () => {
    const stored = await browser.storage.local.get(FOCUS_MEMORY_SETTINGS_STORAGE_KEY);
    const settings = normalizeFocusMemorySettings(stored[FOCUS_MEMORY_SETTINGS_STORAGE_KEY]);
    const nextSettings: FocusMemorySettings = {
      ...settings,
      ignoreScansAtOrBefore: Date.now(),
    };
    await browser.storage.local.remove([
      FOCUS_MEMORY_STORAGE_KEY,
      FOCUS_MEMORY_RESOLVED_STORAGE_KEY,
    ]);
    await browser.storage.local.set({ [FOCUS_MEMORY_SETTINGS_STORAGE_KEY]: nextSettings });
  });
}
