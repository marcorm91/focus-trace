import {
  captureBoundaryKeyboardFocusProbes,
  evaluateBoundaryKeyboardFocusProbe,
  isBoundaryKeyboardFocusProbe,
  type BoundaryKeyboardFocusProbe,
} from './keyboard-focus-boundary-runtime';
import {
  captureManagedKeyboardFocusProbes,
  evaluateManagedKeyboardFocusProbe,
  isManagedKeyboardFocusProbe,
  type ManagedKeyboardFocusProbe,
} from './keyboard-focus-managed-runtime';
import type { KeyboardFocusAction } from './keyboard-focus-types';
import type { RuntimeEvent } from '../../shared/types';

export type { KeyboardFocusAction } from './keyboard-focus-types';
export type KeyboardFocusProbe = ManagedKeyboardFocusProbe | BoundaryKeyboardFocusProbe;

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

export function captureKeyboardFocusProbes(
  target: Element,
  action: KeyboardFocusAction,
): KeyboardFocusProbe[] {
  return [
    ...captureManagedKeyboardFocusProbes(target, action),
    ...captureBoundaryKeyboardFocusProbes(target, action),
  ];
}

export function evaluateKeyboardFocusProbe(
  probe: KeyboardFocusProbe,
): PendingRuntimeEvent | undefined {
  if (isBoundaryKeyboardFocusProbe(probe)) return evaluateBoundaryKeyboardFocusProbe(probe);
  if (isManagedKeyboardFocusProbe(probe)) return evaluateManagedKeyboardFocusProbe(probe);
  return undefined;
}
