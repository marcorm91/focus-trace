import type {
  FindingNodeSignature,
  FindingTargetResolution,
  FindingRecheckState,
} from '../audit/finding-recheck';
import type { RuntimeEvent } from '../../shared/types';

export interface RuntimeFindingRecheckAttempt {
  state: FindingRecheckState;
  checkedAt: number;
  reason: string;
  signature: FindingNodeSignature;
  currentLocator?: string;
}

export function runtimeFindingSignature(event: RuntimeEvent): FindingNodeSignature | undefined {
  const element = event.element ?? event.mutation?.target;
  const locator = element?.selector?.trim();
  if (!locator) return undefined;
  return {
    locator,
    ...(element?.tag ? { tag: element.tag } : {}),
    ...(element?.id ? { id: element.id } : {}),
    ...(element?.role ? { role: element.role } : {}),
    ...(element?.name ? { name: element.name } : {}),
  };
}

export function evaluateRuntimeFindingRecheck(
  event: RuntimeEvent,
  resolution: FindingTargetResolution,
  checkedAt = Date.now(),
): RuntimeFindingRecheckAttempt | undefined {
  if (!event.outcome) return undefined;
  const signature = runtimeFindingSignature(event);
  if (!signature) return undefined;

  if (resolution.status === 'missing') {
    return {
      state: 'missing',
      checkedAt,
      reason: 'The original runtime target is no longer present. The recorded event is kept as historical evidence.',
      signature,
    };
  }

  if (resolution.status === 'ambiguous') {
    return {
      state: 'inconclusive',
      checkedAt,
      reason: 'Several elements could correspond to the recorded runtime target, so FocusTrace did not choose one automatically.',
      signature,
    };
  }

  if (resolution.status === 'changed') {
    return {
      state: 'changed',
      checkedAt,
      reason: 'The recorded target locator now resolves to a materially different element identity.',
      signature,
      ...(resolution.locator ? { currentLocator: resolution.locator } : {}),
    };
  }

  return {
    state: 'inconclusive',
    checkedAt,
    reason: 'The recorded target is still identifiable. Replay the original interaction to verify whether the runtime behavior itself still occurs.',
    signature,
    ...(resolution.locator ? { currentLocator: resolution.locator } : {}),
  };
}
