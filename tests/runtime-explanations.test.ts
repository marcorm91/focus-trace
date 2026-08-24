import { describe, expect, it } from 'vitest';
import {
  explanationForCause,
  humanInteractionTitle,
  humanRuntimeEventTitle,
} from '../lib/runtime/explanations';
import type { RuntimeInteraction } from '../shared/types';

describe('runtime explanations', () => {
  it('provides plain-language impact and remediation for every deterministic cause', () => {
    const explanation = explanationForCause('MODAL_FOCUS_ESCAPE');
    expect(explanation.title).toContain('Focus moved outside');
    expect(explanation.impact.length).toBeGreaterThan(20);
    expect(explanation.recommendation.length).toBeGreaterThan(20);
  });

  it('turns technical focus events into readable labels', () => {
    expect(humanRuntimeEventTitle({
      id: '1',
      timestamp: 1,
      kind: 'focus',
      severity: 'info',
      title: 'Focus → button',
      element: { tag: 'button', selector: '#save', name: 'Save profile' },
    })).toBe('Focus moved to “Save profile”');
  });

  it('describes keyboard activation without exposing an interaction id', () => {
    const trigger = {
      id: '1',
      timestamp: 1,
      kind: 'keydown' as const,
      severity: 'info' as const,
      title: 'Key: Enter',
      interactionId: 'ix-page-1',
      element: { tag: 'button', selector: '#save', name: 'Save profile' },
    };
    const interaction: RuntimeInteraction = {
      id: 'ix-page-1',
      correlated: true,
      startedAt: 1,
      endedAt: 1,
      trigger,
      events: [trigger],
      findings: 0,
      causes: [],
      breakpointHits: [],
    };

    expect(humanInteractionTitle(interaction)).toBe('Activated “Save profile” with the keyboard');
  });
});
