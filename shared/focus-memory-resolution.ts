import {
  FOCUS_MEMORY_MAX_OBSERVATIONS,
  FOCUS_MEMORY_RETENTION_DAYS,
  type FocusMemoryComparison,
  type FocusMemoryFindingHistory,
  type FocusMemoryFindingState,
  type FocusMemoryObservation,
} from './focus-memory';

export const FOCUS_MEMORY_RESOLVED_STORAGE_KEY = 'focustrace:memory-resolved:v1';
export const FOCUS_MEMORY_MAX_RESOLVED_FINDINGS = FOCUS_MEMORY_MAX_OBSERVATIONS;

const RETENTION_MS = FOCUS_MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface FocusMemoryResolvedFinding {
  scopeKey: string;
  fingerprint: string;
  ruleId?: string;
  resolvedAt: number;
}

export interface FocusMemoryResolvedStore {
  version: 1;
  findings: FocusMemoryResolvedFinding[];
}

export const EMPTY_FOCUS_MEMORY_RESOLVED_STORE: FocusMemoryResolvedStore = {
  version: 1,
  findings: [],
};

function isResolvedFinding(value: unknown): value is FocusMemoryResolvedFinding {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FocusMemoryResolvedFinding>;
  return typeof candidate.scopeKey === 'string'
    && typeof candidate.fingerprint === 'string'
    && (candidate.ruleId == null || typeof candidate.ruleId === 'string')
    && typeof candidate.resolvedAt === 'number'
    && Number.isFinite(candidate.resolvedAt);
}

export function normalizeFocusMemoryResolvedStore(value: unknown): FocusMemoryResolvedStore {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_FOCUS_MEMORY_RESOLVED_STORE, findings: [] };
  }
  const candidate = value as { version?: unknown; findings?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.findings)) {
    return { ...EMPTY_FOCUS_MEMORY_RESOLVED_STORE, findings: [] };
  }
  return {
    version: 1,
    findings: candidate.findings.filter(isResolvedFinding),
  };
}

export function pruneFocusMemoryResolvedFindings(
  findings: FocusMemoryResolvedFinding[],
  now = Date.now(),
): FocusMemoryResolvedFinding[] {
  const cutoff = now - RETENTION_MS;
  const newestByFinding = new Map<string, FocusMemoryResolvedFinding>();

  for (const finding of [...findings].sort((left, right) => right.resolvedAt - left.resolvedAt)) {
    if (finding.resolvedAt < cutoff) continue;
    const key = `${finding.scopeKey}:${finding.fingerprint}`;
    if (!newestByFinding.has(key)) newestByFinding.set(key, finding);
    if (newestByFinding.size >= FOCUS_MEMORY_MAX_RESOLVED_FINDINGS) break;
  }

  return [...newestByFinding.values()];
}

export function archiveResolvedFinding(
  observations: FocusMemoryObservation[],
  resolvedFindings: FocusMemoryResolvedFinding[],
  scopeKey: string,
  fingerprint: string,
  ruleId: string | undefined,
  resolvedAt = Date.now(),
): {
  observations: FocusMemoryObservation[];
  resolvedFindings: FocusMemoryResolvedFinding[];
} {
  const nextObservations = observations.map((observation) => {
    if (observation.scopeKey !== scopeKey || !observation.failureFingerprints.includes(fingerprint)) {
      return observation;
    }

    return {
      ...observation,
      failCount: Math.max(0, observation.failCount - 1),
      failureFingerprints: observation.failureFingerprints.filter((item) => item !== fingerprint),
      ...(observation.failureDetails
        ? { failureDetails: observation.failureDetails.filter((item) => item.fingerprint !== fingerprint) }
        : {}),
    };
  });

  const nextResolved = resolvedFindings.filter(
    (item) => item.scopeKey !== scopeKey || item.fingerprint !== fingerprint,
  );
  nextResolved.push({
    scopeKey,
    fingerprint,
    ...(ruleId ? { ruleId } : {}),
    resolvedAt,
  });

  return {
    observations: nextObservations,
    resolvedFindings: pruneFocusMemoryResolvedFindings(nextResolved, resolvedAt),
  };
}

function statePriority(state: FocusMemoryFindingState): number {
  if (state === 'regressed') return 0;
  if (state === 'new') return 1;
  if (state === 'resolved') return 2;
  if (state === 'changed') return 3;
  return 4;
}

export function applyResolvedFindingMemory(
  comparison: FocusMemoryComparison,
  history: FocusMemoryFindingHistory[],
  resolvedFindings: FocusMemoryResolvedFinding[],
  scopeKey: string,
): {
  comparison: FocusMemoryComparison;
  history: FocusMemoryFindingHistory[];
} {
  const resolvedMap = new Map(
    resolvedFindings
      .filter((item) => item.scopeKey === scopeKey)
      .map((item) => [item.fingerprint, item]),
  );

  let archivedRegressions = 0;
  const nextHistory = history.map((item) => {
    const archived = resolvedMap.get(item.fingerprint);
    if (!archived) return item;

    if (item.state === 'new' && comparison.compatibleCoverage && !comparison.partial) {
      archivedRegressions += 1;
      return {
        ...item,
        ruleId: item.ruleId ?? archived.ruleId,
        state: 'regressed' as const,
        changedNow: true,
      };
    }

    return item.ruleId || !archived.ruleId
      ? item
      : { ...item, ruleId: archived.ruleId };
  }).sort((left, right) => {
    if (left.changedNow !== right.changedNow) return left.changedNow ? -1 : 1;
    const priority = statePriority(left.state) - statePriority(right.state);
    if (priority !== 0) return priority;
    return (left.ruleId ?? left.fingerprint).localeCompare(right.ruleId ?? right.fingerprint);
  });

  if (archivedRegressions === 0) {
    return { comparison, history: nextHistory };
  }

  return {
    comparison: {
      ...comparison,
      status: 'regressed',
      regressedFailures: comparison.regressedFailures + archivedRegressions,
      newFailures: Math.max(0, comparison.newFailures - archivedRegressions),
    },
    history: nextHistory,
  };
}
