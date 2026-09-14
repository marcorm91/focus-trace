import { describe, expect, it } from 'vitest';
import {
  evaluateRuntimeFindingRecheck,
  runtimeFindingSignature,
} from '../lib/runtime/runtime-finding-recheck';
import type { RuntimeEvent } from '../shared/types';

function runtimeFinding(overrides: Partial<RuntimeEvent> = {}): RuntimeEvent {
  return {
    id: 'runtime-1',
    timestamp: 10,
    kind: 'focus-obscured',
    severity: 'serious',
    title: 'Focus target obscured',
    outcome: 'review',
    ruleId: 'FT-REVIEW-050',
    element: {
      tag: 'button',
      id: 'save',
      role: 'button',
      name: 'Save',
      selector: '#save',
    },
    references: [],
    ...overrides,
  };
}

describe('runtime finding recheck', () => {
  it('builds a stable signature from recorded runtime evidence', () => {
    expect(runtimeFindingSignature(runtimeFinding())).toEqual({
      locator: '#save',
      tag: 'button',
      id: 'save',
      role: 'button',
      name: 'Save',
    });
  });

  it('requires replay when the target still resolves instead of claiming the runtime issue is fixed', () => {
    const result = evaluateRuntimeFindingRecheck(runtimeFinding(), {
      status: 'matched',
      reason: 'Unique target',
      locator: '#save',
      element: {
        tag: 'button',
        id: 'save',
        role: 'button',
        name: 'Save',
        selector: '#save',
      },
    }, 20);

    expect(result?.state).toBe('inconclusive');
    expect(result?.reason).toContain('Replay');
    expect(result?.checkedAt).toBe(20);
  });

  it('keeps missing, changed and ambiguous target states conservative', () => {
    const event = runtimeFinding();

    expect(evaluateRuntimeFindingRecheck(event, {
      status: 'missing',
      reason: 'Gone',
    })?.state).toBe('missing');

    expect(evaluateRuntimeFindingRecheck(event, {
      status: 'changed',
      reason: 'Different identity',
      locator: '#save',
    })?.state).toBe('changed');

    expect(evaluateRuntimeFindingRecheck(event, {
      status: 'ambiguous',
      reason: 'Several candidates',
      candidateCount: 2,
    })?.state).toBe('inconclusive');
  });

  it('does not offer runtime recheck semantics for non-finding events', () => {
    const event = runtimeFinding({ outcome: undefined });
    expect(evaluateRuntimeFindingRecheck(event, {
      status: 'matched',
      reason: 'Unique target',
      locator: '#save',
    })).toBeUndefined();
  });
});
