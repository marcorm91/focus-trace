import { describe, expect, it } from 'vitest';
import { GUIDED_TESTS } from '../lib/guided-tests/catalog';
import { appendGuidedEvidence, startGuidedTest } from '../lib/guided-tests/framework';
import { guidedRuntimeEvidence } from '../lib/guided-tests/runtime-evidence';
import type { RuntimeEvent } from '../shared/types';

function event(kind: RuntimeEvent['kind'], timestamp: number, title = kind): RuntimeEvent {
  return {
    id: `${kind}-${timestamp}`,
    kind,
    timestamp,
    title,
    severity: 'info',
    element: { tag: 'button', selector: '#target' },
  };
}

describe('guided keyboard, focus and dialog workflows', () => {
  it('registers three focused manual workflows without claiming automation', () => {
    const ids = GUIDED_TESTS.map((test) => test.id);
    expect(ids).toContain('FT-GUIDED-002');
    expect(ids).toContain('FT-GUIDED-003');
    expect(ids).toContain('FT-GUIDED-004');
    expect(GUIDED_TESTS.filter((test) => ids.slice(1).includes(test.id)).every((test) => test.coverage === 'guided-manual')).toBe(true);
  });

  it('captures only relevant recent runtime events and keeps the evidence bounded', () => {
    const events = [
      event('route', 90),
      event('focus', 110),
      event('keydown', 120),
      event('click', 130),
    ];
    const evidence = guidedRuntimeEvidence(events, 'FT-GUIDED-002', 100, 140);
    expect(evidence).toHaveLength(2);
    expect(evidence.every((item) => item.kind === 'runtime-observation')).toBe(true);
    expect(evidence[0]?.value).toContain('keydown');
    expect(evidence[1]?.value).toContain('click');
  });

  it('stores observed runtime evidence separately from manual answers', () => {
    const definition = GUIDED_TESTS.find((test) => test.id === 'FT-GUIDED-003')!;
    const session = startGuidedTest(definition, { url: 'https://example.test/' }, 100);
    const observations = guidedRuntimeEvidence([event('focus-obscured', 110)], definition.id, 100, 120);
    const updated = appendGuidedEvidence(session, observations, 120);
    expect(updated.steps[0]?.evidence.some((item) => item.kind === 'runtime-observation')).toBe(true);
    expect(updated.steps[0]?.answer).toBeUndefined();
  });

  it('treats modal containment as valid guidance rather than a keyboard-trap finding', () => {
    const dialog = GUIDED_TESTS.find((test) => test.id === 'FT-GUIDED-004')!;
    const containment = dialog.steps.find((step) => step.id === 'dialog-containment')!;
    expect(containment.prompt.en).toContain('may intentionally remain inside it');
    expect(containment.prompt.en).toContain('only if focus escapes unexpectedly');
    expect(containment.prompt.es).toContain('pueden permanecer intencionadamente dentro');
  });

  it('reuses dialog-open, dialog-close and dialog-focus-escape observations', () => {
    const evidence = guidedRuntimeEvidence([
      event('dialog-open', 101),
      event('focus', 102),
      event('dialog-focus-escape', 103),
      event('dialog-close', 104),
    ], 'FT-GUIDED-004', 100, 105);
    expect(evidence).toHaveLength(2);
    expect(evidence[0]?.value).toContain('dialog-focus-escape');
    expect(evidence[1]?.value).toContain('dialog-close');
  });
});
