import type {
  ElementSnapshot,
  FindingOutcome,
  ScanIssue,
  ScanResult,
} from '../../shared/types';

export type FindingRecheckState =
  | 'resolved'
  | 'persistent'
  | 'changed'
  | 'missing'
  | 'inconclusive';

export type FindingTargetResolutionStatus =
  | 'matched'
  | 'changed'
  | 'missing'
  | 'ambiguous';

export interface FindingNodeSignature {
  locator: string;
  tag?: string;
  id?: string;
  role?: string;
  name?: string;
  className?: string;
}

export interface FindingTargetResolution {
  status: FindingTargetResolutionStatus;
  reason: string;
  locator?: string;
  element?: ElementSnapshot;
  relocated?: boolean;
  candidateCount?: number;
}

export interface FindingRecheckEvidence {
  outcome: FindingOutcome;
  targets: string[];
  evidence?: string;
  element?: ElementSnapshot;
}

export interface FindingRecheckAttempt {
  state: FindingRecheckState;
  checkedAt: number;
  reason: string;
  original: FindingRecheckEvidence;
  current?: FindingRecheckEvidence;
  target?: ElementSnapshot;
  currentLocator?: string;
}

export interface FindingRecheckRecord {
  signature: FindingNodeSignature;
  latest: FindingRecheckAttempt;
  attempts: FindingRecheckAttempt[];
}

export type RecheckableScanIssue = ScanIssue & {
  recheck?: FindingRecheckRecord;
};

const MAX_RECHECK_ATTEMPTS = 5;

function normalized(value: string | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function issueEvidence(issue: ScanIssue): FindingRecheckEvidence {
  return {
    outcome: issue.outcome,
    targets: [...issue.targets],
    ...(issue.evidence ? { evidence: issue.evidence } : {}),
    ...(issue.element ? { element: { ...issue.element } } : {}),
  };
}

export function findingNodeSignature(issue: ScanIssue): FindingNodeSignature {
  const locator = issue.targets[0]?.trim() || issue.element?.selector?.trim() || '';
  const element = issue.element;
  return {
    locator,
    ...(element?.tag ? { tag: element.tag } : {}),
    ...(element?.id ? { id: element.id } : {}),
    ...(element?.role ? { role: element.role } : {}),
    ...(element?.name ? { name: element.name } : {}),
    ...(element?.className ? { className: element.className } : {}),
  };
}

function elementMatchesSnapshot(
  candidate: ElementSnapshot | undefined,
  target: ElementSnapshot | undefined,
): boolean {
  if (!candidate || !target) return false;
  if (candidate.tag !== target.tag) return false;
  if (target.id && candidate.id !== target.id) return false;
  if (target.role && candidate.role !== target.role) return false;
  if (target.name && candidate.name !== target.name) return false;
  return true;
}

function candidateFindings(scan: ScanResult, ruleId: string): ScanIssue[] {
  return [...scan.issues, ...scan.review, ...(scan.warnings ?? [])]
    .filter((candidate) => candidate.ruleId === ruleId);
}

function findCurrentFinding(
  original: ScanIssue,
  scan: ScanResult,
  resolution: FindingTargetResolution,
): { finding?: ScanIssue; ambiguous: boolean } {
  const candidates = candidateFindings(scan, original.ruleId);
  if (!candidates.length) return { ambiguous: false };

  const locator = resolution.locator?.trim();
  if (locator) {
    const locatorMatches = candidates.filter((candidate) => candidate.targets.includes(locator));
    if (locatorMatches.length === 1) return { finding: locatorMatches[0], ambiguous: false };
    if (locatorMatches.length > 1) return { ambiguous: true };
  }

  if (resolution.element) {
    const snapshotMatches = candidates.filter((candidate) =>
      elementMatchesSnapshot(candidate.element, resolution.element));
    if (snapshotMatches.length === 1) return { finding: snapshotMatches[0], ambiguous: false };
    if (snapshotMatches.length > 1) return { ambiguous: true };
  }

  return { ambiguous: false };
}

function attempt(
  state: FindingRecheckState,
  reason: string,
  original: ScanIssue,
  resolution: FindingTargetResolution,
  current?: ScanIssue,
  checkedAt = Date.now(),
): FindingRecheckAttempt {
  return {
    state,
    checkedAt,
    reason,
    original: issueEvidence(original),
    ...(current ? { current: issueEvidence(current) } : {}),
    ...(resolution.element ? { target: { ...resolution.element } } : {}),
    ...(resolution.locator ? { currentLocator: resolution.locator } : {}),
  };
}

export function evaluateFindingRecheck(
  original: ScanIssue,
  currentScan: ScanResult,
  resolution: FindingTargetResolution,
  checkedAt = Date.now(),
): FindingRecheckAttempt {
  if (resolution.status === 'missing') {
    return attempt('missing', resolution.reason, original, resolution, undefined, checkedAt);
  }
  if (resolution.status === 'ambiguous') {
    return attempt('inconclusive', resolution.reason, original, resolution, undefined, checkedAt);
  }
  if (resolution.status === 'changed') {
    return attempt('changed', resolution.reason, original, resolution, undefined, checkedAt);
  }

  const current = findCurrentFinding(original, currentScan, resolution);
  if (current.ambiguous) {
    return attempt(
      'inconclusive',
      'More than one current finding matches the original rule and target evidence, so FocusTrace did not attach the recheck to any of them.',
      original,
      resolution,
      undefined,
      checkedAt,
    );
  }

  if (current.finding) {
    const sameOutcome = current.finding.outcome === original.outcome;
    const sameEvidence = normalized(current.finding.evidence) === normalized(original.evidence);
    const state: FindingRecheckState = sameOutcome && sameEvidence ? 'persistent' : 'changed';
    const reason = state === 'persistent'
      ? 'The same rule still reports the same uniquely resolved target.'
      : 'The target still produces this rule, but its outcome or evidence changed since the original observation.';
    return attempt(state, reason, original, resolution, current.finding, checkedAt);
  }

  const ruleResult = currentScan.ruleResults?.find((result) => result.ruleId === original.ruleId);
  if (!ruleResult || ruleResult.coverage === 'findings-only') {
    return attempt(
      'inconclusive',
      'The target was resolved, but this rule does not provide complete pass coverage when no finding is emitted.',
      original,
      resolution,
      undefined,
      checkedAt,
    );
  }

  return attempt(
    'resolved',
    'The original target was resolved uniquely and the rerun no longer reports this rule for it.',
    original,
    resolution,
    undefined,
    checkedAt,
  );
}

export function appendFindingRecheck(
  issue: ScanIssue,
  signature: FindingNodeSignature,
  latest: FindingRecheckAttempt,
): RecheckableScanIssue {
  const existing = (issue as RecheckableScanIssue).recheck;
  const attempts = [...(existing?.attempts ?? []), latest].slice(-MAX_RECHECK_ATTEMPTS);
  return {
    ...issue,
    recheck: {
      signature: existing?.signature ?? signature,
      latest,
      attempts,
    },
  } as RecheckableScanIssue;
}

export function applyFindingRecheck(
  scan: ScanResult,
  findingId: string,
  signature: FindingNodeSignature,
  latest: FindingRecheckAttempt,
): ScanResult {
  let updated = false;
  const patch = (issues: ScanIssue[]) => issues.map((issue) => {
    if (issue.id !== findingId) return issue;
    updated = true;
    return appendFindingRecheck(issue, signature, latest);
  });

  const next: ScanResult = {
    ...scan,
    issues: patch(scan.issues),
    review: patch(scan.review),
    warnings: patch(scan.warnings ?? []),
  };
  return updated ? next : scan;
}
