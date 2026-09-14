import { sanitizeRuntimeUrl } from './url-privacy';
import type { FindingOutcome, RuntimeEvent, RuntimeEventKind, RuntimeInteraction } from '../../shared/types';

export const SAVED_FLOW_VERSION = 1 as const;
export const MAX_SAVED_FLOW_STEPS = 160;
export const MAX_SAVED_FLOW_FINDINGS = 80;

export type SavedFlowActionKind = 'keydown' | 'click' | 'input-change';
export type SavedFlowActionPolicy = 'auto' | 'manual-stop';
export type SavedFlowCheckpointKind = 'focus' | 'route' | 'dialog-open' | 'dialog-close';
export type SavedFlowRegressionState =
  | 'new'
  | 'resolved'
  | 'persistent'
  | 'changed'
  | 'missing-element'
  | 'broken-flow';

export interface SavedFlowTargetSignature {
  locator: string;
  tag?: string;
  id?: string;
  role?: string;
}

export interface SavedFlowActionStep {
  id: string;
  type: 'action';
  sourceEventKind: SavedFlowActionKind;
  policy: SavedFlowActionPolicy;
  target?: SavedFlowTargetSignature;
  key?: string;
}

export interface SavedFlowCheckpointStep {
  id: string;
  type: 'checkpoint';
  checkpoint: SavedFlowCheckpointKind;
  target?: SavedFlowTargetSignature;
  fromRoute?: string;
  toRoute?: string;
}

export type SavedFlowStep = SavedFlowActionStep | SavedFlowCheckpointStep;

export interface SavedFlowBaselineFinding {
  id: string;
  ruleId: string;
  kind: RuntimeEventKind;
  outcome: FindingOutcome;
  target?: SavedFlowTargetSignature;
}

export interface SavedUserFlow {
  version: typeof SAVED_FLOW_VERSION;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceRoute?: string;
  steps: SavedFlowStep[];
  baselineFindings: SavedFlowBaselineFinding[];
}

export interface SavedFlowCurrentFinding {
  ruleId: string;
  kind: RuntimeEventKind;
  outcome: FindingOutcome;
  target?: SavedFlowTargetSignature;
}

export interface SavedFlowRegressionResult {
  state: SavedFlowRegressionState;
  ruleId?: string;
  baseline?: SavedFlowBaselineFinding;
  current?: SavedFlowCurrentFinding;
  stepId?: string;
  reason: string;
}

const SAFE_SYNTHETIC_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Escape',
]);

function normalized(value: string | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function targetSignatureFromLocator(locator: string, event: RuntimeEvent): SavedFlowTargetSignature {
  const snapshot = event.element ?? event.mutation?.target;
  return {
    locator,
    ...(snapshot?.tag ? { tag: snapshot.tag } : {}),
    ...(snapshot?.id ? { id: snapshot.id.slice(0, 120) } : {}),
    ...(snapshot?.role ? { role: snapshot.role.slice(0, 80) } : {}),
  };
}

export function savedFlowTargetSignature(event: RuntimeEvent): SavedFlowTargetSignature | undefined {
  const snapshot = event.element ?? event.mutation?.target;
  const locator = snapshot?.selector?.trim();
  return locator ? targetSignatureFromLocator(locator, event) : undefined;
}

export function savedFlowFindingSignature(event: RuntimeEvent): SavedFlowTargetSignature | undefined {
  // Saved regression baselines intentionally keep only the same minimal target
  // metadata used for action/checkpoint resolution. Names, class names, event
  // detail and page text are excluded from persistent flow storage.
  return savedFlowTargetSignature(event);
}

function keyFromEvent(event: RuntimeEvent): string | undefined {
  if (event.kind !== 'keydown') return undefined;
  const raw = event.title.match(/^Key:\s*(.+)$/)?.[1]?.trim();
  if (!raw) return undefined;
  return raw === 'Space' ? ' ' : raw.slice(0, 40);
}

export function savedFlowActionPolicy(event: RuntimeEvent): SavedFlowActionPolicy | undefined {
  if (event.kind === 'click' || event.kind === 'input-change') return 'manual-stop';
  if (event.kind !== 'keydown') return undefined;
  const key = keyFromEvent(event);
  return key && SAFE_SYNTHETIC_KEYS.has(key) ? 'auto' : 'manual-stop';
}

function actionStep(event: RuntimeEvent): SavedFlowActionStep | undefined {
  if (event.kind !== 'keydown' && event.kind !== 'click' && event.kind !== 'input-change') return undefined;
  const policy = savedFlowActionPolicy(event);
  if (!policy) return undefined;
  const target = savedFlowTargetSignature(event);
  const key = keyFromEvent(event);
  return {
    id: `action:${event.id}`,
    type: 'action',
    sourceEventKind: event.kind,
    policy,
    ...(target ? { target } : {}),
    ...(event.kind === 'keydown' && key ? { key } : {}),
  };
}

function checkpointStep(event: RuntimeEvent): SavedFlowCheckpointStep | undefined {
  if (event.kind === 'focus') {
    const target = savedFlowTargetSignature(event);
    return target ? { id: `checkpoint:${event.id}`, type: 'checkpoint', checkpoint: 'focus', target } : undefined;
  }
  if (event.kind === 'route') {
    return {
      id: `checkpoint:${event.id}`,
      type: 'checkpoint',
      checkpoint: 'route',
      ...(event.fromUrl ? { fromRoute: sanitizeRuntimeUrl(event.fromUrl) } : {}),
      ...(event.toUrl ? { toRoute: sanitizeRuntimeUrl(event.toUrl) } : {}),
    };
  }
  if (event.kind === 'dialog-open' || event.kind === 'dialog-close') {
    const target = savedFlowTargetSignature(event);
    return {
      id: `checkpoint:${event.id}`,
      type: 'checkpoint',
      checkpoint: event.kind,
      ...(target ? { target } : {}),
    };
  }
  return undefined;
}

function baselineFinding(event: RuntimeEvent): SavedFlowBaselineFinding | undefined {
  if (!event.outcome || !event.ruleId) return undefined;
  const target = savedFlowFindingSignature(event);
  return {
    id: `finding:${event.id}`,
    ruleId: event.ruleId,
    kind: event.kind,
    outcome: event.outcome,
    ...(target ? { target } : {}),
  };
}

export function buildSavedUserFlow(input: {
  id: string;
  name: string;
  events: RuntimeEvent[];
  interactions: RuntimeInteraction[];
  sourceUrl?: string;
  now?: number;
}): SavedUserFlow {
  const now = input.now ?? Date.now();
  const correlatedIds = new Set(input.interactions.filter((item) => item.correlated).map((item) => item.id));
  const eligibleEvents = input.events.filter((event) => !event.interactionId || correlatedIds.has(event.interactionId));
  const steps: SavedFlowStep[] = [];
  const findings: SavedFlowBaselineFinding[] = [];

  for (const event of eligibleEvents) {
    const action = actionStep(event);
    if (action && steps.length < MAX_SAVED_FLOW_STEPS) steps.push(action);
    const checkpoint = checkpointStep(event);
    if (checkpoint && steps.length < MAX_SAVED_FLOW_STEPS) steps.push(checkpoint);
    const finding = baselineFinding(event);
    if (finding && findings.length < MAX_SAVED_FLOW_FINDINGS) findings.push(finding);
  }

  const safeName = normalized(input.name).slice(0, 80) || 'Saved accessibility flow';
  return {
    version: SAVED_FLOW_VERSION,
    id: input.id,
    name: safeName,
    createdAt: now,
    updatedAt: now,
    ...(input.sourceUrl ? { sourceRoute: sanitizeRuntimeUrl(input.sourceUrl) } : {}),
    steps,
    baselineFindings: findings,
  };
}

function sameTarget(left?: SavedFlowTargetSignature, right?: SavedFlowTargetSignature): boolean {
  if (!left || !right) return !left && !right;
  if (left.locator && right.locator && left.locator === right.locator) return true;
  if (left.id && right.id && left.id === right.id && (!left.tag || !right.tag || left.tag === right.tag)) return true;
  return false;
}

function findingIdentity(finding: { ruleId: string; target?: SavedFlowTargetSignature }): string {
  return `${finding.ruleId}|${finding.target?.locator ?? finding.target?.id ?? '[no-target]'}`;
}

export function savedFlowCurrentFindings(events: RuntimeEvent[]): SavedFlowCurrentFinding[] {
  return events.flatMap((event) => {
    if (!event.outcome || !event.ruleId) return [];
    const target = savedFlowFindingSignature(event);
    return [{
      ruleId: event.ruleId,
      kind: event.kind,
      outcome: event.outcome,
      ...(target ? { target } : {}),
    } satisfies SavedFlowCurrentFinding];
  });
}

export function compareSavedFlowFindings(
  baseline: SavedFlowBaselineFinding[],
  current: SavedFlowCurrentFinding[],
  complete = true,
): SavedFlowRegressionResult[] {
  const results: SavedFlowRegressionResult[] = [];
  const matchedCurrent = new Set<number>();

  for (const original of baseline) {
    const exactIndex = current.findIndex((candidate, index) =>
      !matchedCurrent.has(index)
      && candidate.ruleId === original.ruleId
      && sameTarget(candidate.target, original.target),
    );
    if (exactIndex < 0) {
      if (complete) {
        results.push({ state: 'resolved', ruleId: original.ruleId, baseline: original, reason: 'The saved finding was not observed after the complete replay finished.' });
      }
      continue;
    }

    matchedCurrent.add(exactIndex);
    const candidate = current[exactIndex]!;
    if (candidate.outcome === original.outcome && candidate.kind === original.kind) {
      results.push({ state: 'persistent', ruleId: original.ruleId, baseline: original, current: candidate, reason: 'The same rule and target still produce the same runtime outcome.' });
    } else {
      results.push({ state: 'changed', ruleId: original.ruleId, baseline: original, current: candidate, reason: 'The same rule and target were observed, but the runtime outcome or event kind changed.' });
    }
  }

  current.forEach((candidate, index) => {
    if (matchedCurrent.has(index)) return;
    const baselineIdentity = baseline.some((original) => findingIdentity(original) === findingIdentity(candidate));
    results.push({
      state: baselineIdentity ? 'changed' : 'new',
      ruleId: candidate.ruleId,
      current: candidate,
      reason: baselineIdentity
        ? 'A saved finding identity reappeared with different evidence.'
        : 'This finding was not present in the saved baseline.',
    });
  });

  return results;
}

export function savedFlowMissingElement(stepId: string, reason: string): SavedFlowRegressionResult {
  return { state: 'missing-element', stepId, reason };
}

export function savedFlowBrokenFlow(stepId: string, reason: string): SavedFlowRegressionResult {
  return { state: 'broken-flow', stepId, reason };
}
