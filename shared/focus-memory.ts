import type { ScanIssue, ScanResult } from './types';

export const FOCUS_MEMORY_STORAGE_KEY = 'focustrace:memory:v1';
export const FOCUS_MEMORY_SETTINGS_STORAGE_KEY = 'focustrace:memory-settings:v1';
export const FOCUS_MEMORY_RETENTION_DAYS = 90;
export const FOCUS_MEMORY_MAX_PER_SCOPE = 8;
export const FOCUS_MEMORY_MAX_OBSERVATIONS = 200;
export const FOCUS_MEMORY_MAX_FAILURE_FINGERPRINTS = 120;

const RETENTION_MS = FOCUS_MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type FocusMemoryStatus = 'new' | 'open' | 'fixed' | 'regressed' | 'changed' | 'unchanged';

export interface FocusMemorySettings {
  enabled: boolean;
  ignoreScansAtOrBefore?: number;
}

export interface FocusMemoryObservation {
  id: string;
  scopeKey: string;
  scopeType: 'page' | 'component';
  observedAt: number;
  rulesRun: number;
  failCount: number;
  reviewCount: number;
  warningCount: number;
  failureFingerprints: string[];
  failuresTruncated: boolean;
}

export interface FocusMemoryStore {
  version: 1;
  observations: FocusMemoryObservation[];
}

export interface FocusMemoryComparison {
  status: FocusMemoryStatus;
  scopeType: 'page' | 'component';
  observedCount: number;
  previousObservedAt?: number;
  currentFailCount: number;
  previousFailCount?: number;
  persistentFailures: number;
  fixedFailures: number;
  regressedFailures: number;
  newFailures: number;
  reviewDelta: number;
  warningDelta: number;
  compatibleCoverage: boolean;
  partial: boolean;
}

export const DEFAULT_FOCUS_MEMORY_SETTINGS: FocusMemorySettings = {
  enabled: true,
};

export const EMPTY_FOCUS_MEMORY_STORE: FocusMemoryStore = {
  version: 1,
  observations: [],
};

function hashFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function normalizeVolatileTokens(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/:nth-(child|of-type)\(\d+\)/g, ':nth-$1(*)')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':id')
    .replace(/\b[0-9a-f]{16,}\b/gi, ':id')
    .replace(/\b\d{3,}\b/g, ':n')
    .replace(/\s+/g, ' ')
    .slice(0, 320);
}

function normalizedRouteFamily(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname
      .split('/')
      .map((segment) => normalizeVolatileTokens(segment))
      .join('/');
    return `${parsed.origin}${path || '/'}`;
  } catch {
    return normalizeVolatileTokens(url);
  }
}

export function focusMemoryScopeKey(scan: ScanResult): string {
  const route = normalizedRouteFamily(scan.url);
  if (scan.scope?.type !== 'component') {
    return `scope-${hashFingerprint(`${route}|page`)}`;
  }

  const scope = scan.scope;
  const identity = [
    route,
    'component',
    normalizeVolatileTokens(scope.tag),
    normalizeVolatileTokens(scope.role ?? ''),
    normalizeVolatileTokens(scope.label ?? ''),
    normalizeVolatileTokens(scope.selector),
  ].join('|');

  return `scope-${hashFingerprint(identity)}`;
}

function findingFingerprint(issue: ScanIssue): string {
  const targets = issue.targets.length
    ? issue.targets.map(normalizeVolatileTokens).sort().join('|')
    : 'document';
  return `finding-${hashFingerprint(`${issue.ruleId}|${targets}`)}`;
}

export function buildFocusMemoryObservation(scan: ScanResult): FocusMemoryObservation {
  const scopeKey = focusMemoryScopeKey(scan);
  const allFailureFingerprints = scan.issues.map(findingFingerprint);
  const failureFingerprints = [...new Set(allFailureFingerprints)]
    .slice(0, FOCUS_MEMORY_MAX_FAILURE_FINGERPRINTS);

  return {
    id: `${scopeKey}:${scan.scannedAt}`,
    scopeKey,
    scopeType: scan.scope?.type === 'component' ? 'component' : 'page',
    observedAt: scan.scannedAt,
    rulesRun: scan.rulesRun,
    failCount: scan.issues.length,
    reviewCount: scan.review.length,
    warningCount: scan.warnings?.length ?? 0,
    failureFingerprints,
    failuresTruncated: allFailureFingerprints.length > FOCUS_MEMORY_MAX_FAILURE_FINGERPRINTS,
  };
}

function isObservation(value: unknown): value is FocusMemoryObservation {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FocusMemoryObservation>;
  return typeof candidate.id === 'string'
    && typeof candidate.scopeKey === 'string'
    && (candidate.scopeType === 'page' || candidate.scopeType === 'component')
    && typeof candidate.observedAt === 'number'
    && Number.isFinite(candidate.observedAt)
    && typeof candidate.rulesRun === 'number'
    && typeof candidate.failCount === 'number'
    && typeof candidate.reviewCount === 'number'
    && typeof candidate.warningCount === 'number'
    && Array.isArray(candidate.failureFingerprints)
    && candidate.failureFingerprints.every((item) => typeof item === 'string')
    && typeof candidate.failuresTruncated === 'boolean';
}

export function normalizeFocusMemoryStore(value: unknown): FocusMemoryStore {
  if (!value || typeof value !== 'object') return { ...EMPTY_FOCUS_MEMORY_STORE, observations: [] };
  const candidate = value as { version?: unknown; observations?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.observations)) {
    return { ...EMPTY_FOCUS_MEMORY_STORE, observations: [] };
  }
  return {
    version: 1,
    observations: candidate.observations.filter(isObservation),
  };
}

export function normalizeFocusMemorySettings(value: unknown): FocusMemorySettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_FOCUS_MEMORY_SETTINGS };
  const candidate = value as Partial<FocusMemorySettings>;
  return {
    enabled: candidate.enabled !== false,
    ...(typeof candidate.ignoreScansAtOrBefore === 'number' && Number.isFinite(candidate.ignoreScansAtOrBefore)
      ? { ignoreScansAtOrBefore: candidate.ignoreScansAtOrBefore }
      : {}),
  };
}

export function pruneFocusMemoryObservations(
  observations: FocusMemoryObservation[],
  now = Date.now(),
): FocusMemoryObservation[] {
  const cutoff = now - RETENTION_MS;
  const sorted = observations
    .filter((observation) => observation.observedAt >= cutoff)
    .sort((left, right) => right.observedAt - left.observedAt);

  const perScope = new Map<string, number>();
  const kept: FocusMemoryObservation[] = [];

  for (const observation of sorted) {
    const count = perScope.get(observation.scopeKey) ?? 0;
    if (count >= FOCUS_MEMORY_MAX_PER_SCOPE) continue;
    kept.push(observation);
    perScope.set(observation.scopeKey, count + 1);
    if (kept.length >= FOCUS_MEMORY_MAX_OBSERVATIONS) break;
  }

  return kept;
}

function compareObservation(
  current: FocusMemoryObservation,
  previousHistory: FocusMemoryObservation[],
): FocusMemoryComparison {
  const previous = previousHistory[0];
  if (!previous) {
    return {
      status: 'new',
      scopeType: current.scopeType,
      observedCount: 1,
      currentFailCount: current.failCount,
      persistentFailures: 0,
      fixedFailures: 0,
      regressedFailures: 0,
      newFailures: current.failCount,
      reviewDelta: 0,
      warningDelta: 0,
      compatibleCoverage: true,
      partial: current.failuresTruncated,
    };
  }

  const currentFailures = new Set(current.failureFingerprints);
  const previousFailures = new Set(previous.failureFingerprints);
  const olderFailures = new Set(previousHistory.slice(1).flatMap((item) => item.failureFingerprints));
  const partial = current.failuresTruncated || previous.failuresTruncated;
  const compatibleCoverage = current.rulesRun === previous.rulesRun;

  const persistentFailures = [...currentFailures].filter((key) => previousFailures.has(key)).length;
  const fixedFailures = [...previousFailures].filter((key) => !currentFailures.has(key)).length;
  const returningFailures = [...currentFailures].filter((key) => !previousFailures.has(key) && olderFailures.has(key));
  const regressedFailures = returningFailures.length;
  const newFailures = [...currentFailures]
    .filter((key) => !previousFailures.has(key) && !olderFailures.has(key))
    .length;
  const reviewDelta = current.reviewCount - previous.reviewCount;
  const warningDelta = current.warningCount - previous.warningCount;

  let status: FocusMemoryStatus = 'unchanged';
  if (!compatibleCoverage || partial) {
    status = 'changed';
  } else if (regressedFailures > 0) {
    status = 'regressed';
  } else if (persistentFailures > 0) {
    status = 'open';
  } else if (fixedFailures > 0 && newFailures === 0) {
    status = 'fixed';
  } else if (fixedFailures > 0 || newFailures > 0 || reviewDelta !== 0 || warningDelta !== 0) {
    status = 'changed';
  }

  return {
    status,
    scopeType: current.scopeType,
    observedCount: previousHistory.length + 1,
    previousObservedAt: previous.observedAt,
    currentFailCount: current.failCount,
    previousFailCount: previous.failCount,
    persistentFailures,
    fixedFailures,
    regressedFailures,
    newFailures,
    reviewDelta,
    warningDelta,
    compatibleCoverage,
    partial,
  };
}

export function recordFocusMemoryObservation(
  value: unknown,
  scan: ScanResult,
  now = Date.now(),
): { store: FocusMemoryStore; comparison: FocusMemoryComparison } {
  const store = normalizeFocusMemoryStore(value);
  const current = buildFocusMemoryObservation(scan);
  const existing = store.observations.filter((observation) => observation.id !== current.id);
  const history = existing
    .filter((observation) => observation.scopeKey === current.scopeKey)
    .sort((left, right) => right.observedAt - left.observedAt);
  const comparison = compareObservation(current, history);
  const observations = pruneFocusMemoryObservations([...existing, current], now);

  return {
    store: { version: 1, observations },
    comparison: {
      ...comparison,
      observedCount: observations.filter((observation) => observation.scopeKey === current.scopeKey).length,
    },
  };
}
