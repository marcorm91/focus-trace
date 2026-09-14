import { describe, expect, it } from 'vitest';
import { GUIDED_TESTS } from '../lib/guided-tests/catalog';
import { answerGuidedStep, startGuidedTest } from '../lib/guided-tests/framework';
import { guidedRuntimeEvidence } from '../lib/guided-tests/runtime-evidence';
import type { RuntimeEvent } from '../shared/types';

function event(
  id: string,
  timestamp: number,
  kind: RuntimeEvent['kind'],
  title: string,
  selector = '#target',
): RuntimeEvent {
  return {
    id,
    timestamp,
    kind,
    severity: 'info',
    title,
    element: { tag: 'button', selector, name: selector },
  };
}

describe('guided runtime evidence', () => {
  it('captures sequential focus evidence without converting it into a manual answer', () => {
    const runtime = [
      event('f1', 110, 'focus', 'Focus → first', '#first'),
      event('f2', 120, 'focus', 'Focus → second', '#second'),
      event('f3', 130, 'focus', 'Focus → third', '#third'),
    ];
    const evidence = guidedRuntimeEvidence('FT-GUIDED-002', 'keyboard-sequential-pass', runtime, 100);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.kind).toBe('runtime-observation');
    expect(evidence[0]?.value).toContain('#first → #second → #third');
  });

  it('treats focus cycling in an active modal as containment, not a keyboard trap', () => {
    const runtime: RuntimeEvent[] = [
      event('open', 110, 'dialog-open', 'Dialog opened with focus inside', '#dialog'),
      event('f1', 120, 'focus', 'Focus → first', '#dialog-first'),
      event('f2', 130, 'focus', 'Focus → last', '#dialog-last'),
      event('f3', 140, 'focus', 'Focus → first', '#dialog-first'),
    ];
    const evidence = guidedRuntimeEvidence('FT-GUIDED-003', 'focus-trap-review', runtime, 100);
    expect(evidence[0]?.label).toBe('Observed modal focus containment');
    expect(evidence[0]?.value).toContain('not classified as a keyboard trap automatically');
  });

  it('surfaces a modal focus escape as observed runtime evidence', () => {
    const escaped = event('escape', 130, 'dialog-focus-escape', 'Modal dialog focus escaped', '#outside');
    escaped.detail = 'Focus moved to #outside while a modal dialog remained open.';
    const runtime: RuntimeEvent[] = [
      event('open', 110, 'dialog-open', 'Dialog opened with focus inside', '#dialog'),
      escaped,
    ];
    const evidence = guidedRuntimeEvidence('FT-GUIDED-004', 'dialog-containment', runtime, 100);
    expect(evidence[0]).toMatchObject({
      kind: 'runtime-observation',
      label: 'Observed modal focus escape',
      sourceEventId: 'escape',
      sourceEventKind: 'dialog-focus-escape',
    });
  });

  it('stores observed events separately from the auditor answer', () => {
    const definition = GUIDED_TESTS.find((test) => test.id === 'FT-GUIDED-002')!;
    const session = startGuidedTest(definition, { url: 'https://example.test/' }, 100);
    const observed = guidedRuntimeEvidence(
      definition.id,
      'keyboard-sequential-pass',
      [event('f1', 110, 'focus', 'Focus → first', '#first')],
      session.startedAt,
    );
    const answered = answerGuidedStep(session, definition, 'pass', '', 120, observed);
    const evidence = answered.steps[0]?.evidence ?? [];
    expect(evidence.some((item) => item.kind === 'runtime-observation')).toBe(true);
    expect(evidence.some((item) => item.kind === 'manual-answer' && item.value === 'pass')).toBe(true);
  });
});
