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

function hasKeyboardModifier(action: KeyboardFocusAction): boolean {
  return action.kind === 'keydown'
    && Boolean(action.ctrlKey || action.altKey || action.shiftKey || action.metaKey);
}

export function captureKeyboardFocusProbes(
  target: Element,
  action: KeyboardFocusAction,
): KeyboardFocusProbe[] {
  // APG expectations in this module model the unmodified key bindings.
  // Preserve modified shortcuts in Trace, but do not reinterpret them as the
  // corresponding plain Arrow/Home/End/activation key.
  if (hasKeyboardModifier(action)) return [];

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
