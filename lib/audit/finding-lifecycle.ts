import type { ScanIssue, ScanResult } from '../../shared/types';

export type FindingLifecycleState = 'new' | 'persistent' | 'changed' | 'resolved';

export type LifecycleScanIssue = ScanIssue & {
  occurrenceCount?: number;
  lifecycleState?: Exclude<FindingLifecycleState, 'resolved'>;
};

export interface FindingLifecycleEntry {
  identity: string;
  state: FindingLifecycleState;
  ruleId: string;
  target: string;
  previousFindingId?: string;
  currentFindingId?: string;
  previousEvidenceKey?: string;
  currentEvidenceKey?: string;
}

export interface FindingLifecycleComparison {
  previousScannedAt?: number;
  currentScannedAt: number;
  entries: FindingLifecycleEntry[];
  counts: Record<FindingLifecycleState, number>;
}

export type LifecycleScanResult = ScanResult & {
  findingLifecycle?: FindingLifecycleComparison;
};

function normalize(value: string | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function stableEvidence(issue: ScanIssue): string {
  return JSON.stringify({
    outcome: issue.outcome,
    severity: issue.severity,
    evidence: normalize(issue.evidence),
    accessibleName: issue.accessibleName ?? null,
    contrast: issue.contrast ?? null,
    contrastState: issue.contrastState ?? null,
    reflow: issue.reflow ?? null,
    useOfColor: issue.useOfColor ?? null,
    pauseStopHide: issue.pauseStopHide ?? null,
    linkPurposeContext: issue.linkPurposeContext ?? null,
    textResize: issue.textResize ?? null,
  });
}

export function findingTarget(issue: ScanIssue): string {
  return normalize(issue.targets[0]) || '[document]';
}

export function findingIdentity(issue: ScanIssue): string {
  return `${issue.ruleId}::${findingTarget(issue)}`;
}

export function findingEvidenceKey(issue: ScanIssue): string {
  return `${findingIdentity(issue)}::${stableEvidence(issue)}`;
}

export function deduplicateFindings(findings: ScanIssue[]): LifecycleScanIssue[] {
  const deduped: LifecycleScanIssue[] = [];
  const indexes = new Map<string, number>();

  for (const issue of findings) {
    const key = findingEvidenceKey(issue);
    const existingIndex = indexes.get(key);
    if (existingIndex == null) {
      indexes.set(key, deduped.length);
      deduped.push({ ...issue, occurrenceCount: 1 });
      continue;
    }

    const existing = deduped[existingIndex]!;
    deduped[existingIndex] = {
      ...existing,
      occurrenceCount: (existing.occurrenceCount ?? 1) + 1,
    };
  }

  return deduped;
}

export function deduplicateScanResult(scan: ScanResult): LifecycleScanResult {
  return {
    ...scan,
    issues: deduplicateFindings(scan.issues),
    review: deduplicateFindings(scan.review),
    warnings: deduplicateFindings(scan.warnings ?? []),
  };
}

function allFindings(scan: ScanResult): ScanIssue[] {
  return [
    ...scan.issues,
    ...scan.review,
    ...(scan.warnings ?? []),
  ];
}

function emptyCounts(): Record<FindingLifecycleState, number> {
  return { new: 0, persistent: 0, changed: 0, resolved: 0 };
}

export function compareFindingLifecycle(
  previous: ScanResult | undefined,
  current: ScanResult,
): FindingLifecycleComparison {
  const currentScan = deduplicateScanResult(current);
  const previousScan = previous ? deduplicateScanResult(previous) : undefined;
  const previousByIdentity = new Map<string, ScanIssue[]>();
  const currentByIdentity = new Map<string, ScanIssue[]>();

  for (const issue of previousScan ? allFindings(previousScan) : []) {
    const identity = findingIdentity(issue);
    previousByIdentity.set(identity, [...(previousByIdentity.get(identity) ?? []), issue]);
  }
  for (const issue of allFindings(currentScan)) {
    const identity = findingIdentity(issue);
    currentByIdentity.set(identity, [...(currentByIdentity.get(identity) ?? []), issue]);
  }

  const entries: FindingLifecycleEntry[] = [];
  const counts = emptyCounts();
  const identities = new Set([...previousByIdentity.keys(), ...currentByIdentity.keys()]);

  for (const identity of identities) {
    const before = previousByIdentity.get(identity) ?? [];
    const now = currentByIdentity.get(identity) ?? [];
    const usedBefore = new Set<number>();

    for (const currentIssue of now) {
      const currentEvidenceKey = findingEvidenceKey(currentIssue);
      const exactIndex = before.findIndex((previousIssue, index) =>
        !usedBefore.has(index) && findingEvidenceKey(previousIssue) === currentEvidenceKey,
      );
      const fallbackIndex = exactIndex >= 0
        ? exactIndex
        : before.findIndex((_previousIssue, index) => !usedBefore.has(index));

      if (fallbackIndex < 0) {
        counts.new += 1;
        entries.push({
          identity,
          state: 'new',
          ruleId: currentIssue.ruleId,
          target: findingTarget(currentIssue),
          currentFindingId: currentIssue.id,
          currentEvidenceKey,
        });
        continue;
      }

      usedBefore.add(fallbackIndex);
      const previousIssue = before[fallbackIndex]!;
      const previousEvidenceKey = findingEvidenceKey(previousIssue);
      const state: FindingLifecycleState = previousEvidenceKey === currentEvidenceKey ? 'persistent' : 'changed';
      counts[state] += 1;
      entries.push({
        identity,
        state,
        ruleId: currentIssue.ruleId,
        target: findingTarget(currentIssue),
        previousFindingId: previousIssue.id,
        currentFindingId: currentIssue.id,
        previousEvidenceKey,
        currentEvidenceKey,
      });
    }

    before.forEach((previousIssue, index) => {
      if (usedBefore.has(index)) return;
      counts.resolved += 1;
      entries.push({
        identity,
        state: 'resolved',
        ruleId: previousIssue.ruleId,
        target: findingTarget(previousIssue),
        previousFindingId: previousIssue.id,
        previousEvidenceKey: findingEvidenceKey(previousIssue),
      });
    });
  }

  return {
    ...(previousScan ? { previousScannedAt: previousScan.scannedAt } : {}),
    currentScannedAt: currentScan.scannedAt,
    entries,
    counts,
  };
}

export function applyFindingLifecycle(
  previous: ScanResult | undefined,
  current: ScanResult,
): LifecycleScanResult {
  const deduped = deduplicateScanResult(current);
  const findingLifecycle = compareFindingLifecycle(previous, deduped);
  const stateByFindingId = new Map(
    findingLifecycle.entries
      .filter((entry) => entry.currentFindingId && entry.state !== 'resolved')
      .map((entry) => [entry.currentFindingId!, entry.state as Exclude<FindingLifecycleState, 'resolved'>]),
  );
  const annotate = (issues: ScanIssue[]): LifecycleScanIssue[] => issues.map((issue) => ({
    ...issue,
    lifecycleState: stateByFindingId.get(issue.id) ?? 'new',
  }));

  return {
    ...deduped,
    issues: annotate(deduped.issues),
    review: annotate(deduped.review),
    warnings: annotate(deduped.warnings ?? []),
    findingLifecycle,
  };
}
