import { describe, expect, it } from 'vitest';
import { APG_GUIDED_PATTERN_METADATA, APG_GUIDED_TESTS, guidedApgPatternMetadata, isInformativeApgGuidedTest } from '../lib/guided-tests/apg-catalog';
import { isRecoverableGuidedSession, startGuidedTest } from '../lib/guided-tests/framework';
import { guidedRuntimeEvidence, hasGuidedRuntimeEvidence } from '../lib/guided-tests/runtime-evidence';
import type { RuntimeEvent } from '../shared/types';

function runtimeEvent(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'kind' | 'timestamp' | 'title'>): RuntimeEvent {
  return {
    id: `${input.kind}-${input.timestamp}-${input.ruleId ?? 'event'}`,
    severity: 'info',
    ...input,
  };
}

describe('guided APG widget-pattern catalog', () => {
  it('registers tabs, disclosure, menu, combobox/listbox, tree, grid, carousel and tooltip as guided manual tests', () => {
    expect(APG_GUIDED_TESTS.map((test) => test.id)).toEqual([
      'FT-GUIDED-009',
      'FT-GUIDED-010',
      'FT-GUIDED-011',
      'FT-GUIDED-012',
      'FT-GUIDED-013',
      'FT-GUIDED-014',
      'FT-GUIDED-015',
      'FT-GUIDED-016',
    ]);
    expect(APG_GUIDED_TESTS.every((test) => test.coverage === 'guided-manual')).toBe(true);
    expect(APG_GUIDED_TESTS.every((test) => test.references.some((reference) => reference.type === 'WAI-ARIA APG'))).toBe(true);
  });

  it('provides localized keyboard instructions for every supported pattern', () => {
    for (const definition of APG_GUIDED_TESTS) {
      expect(definition.steps.length).toBeGreaterThanOrEqual(3);
      for (const step of definition.steps) {
        expect(step.title.en.trim()).not.toBe('');
        expect(step.title.es.trim()).not.toBe('');
        expect(step.prompt.en.trim()).not.toBe('');
        expect(step.prompt.es.trim()).not.toBe('');
      }
      expect(definition.steps.some((step) => /Arrow|Enter|Space|Escape|Tab|focus|keyboard/i.test(step.prompt.en))).toBe(true);
      expect(definition.steps.some((step) => /flecha|Enter|Espacio|Escape|Tab|foco|teclado/i.test(step.prompt.es))).toBe(true);
    }
  });

  it('records pattern applicability and implementation variations without claiming conformance', () => {
    for (const definition of APG_GUIDED_TESTS) {
      const metadata = guidedApgPatternMetadata(definition.id);
      expect(metadata?.variations.length).toBeGreaterThan(0);
      expect(APG_GUIDED_PATTERN_METADATA[definition.id]).toBe(metadata);
      expect(isInformativeApgGuidedTest(definition.id)).toBe(true);
      expect(definition.steps[0]?.answers).toContain('not-applicable');
    }
    expect(isInformativeApgGuidedTest('FT-GUIDED-001')).toBe(false);
  });

  it('keeps the selected APG variation recoverable as bounded session metadata', () => {
    const definition = APG_GUIDED_TESTS[0]!;
    const session = {
      ...startGuidedTest(definition, { url: 'https://example.test/tabs?secret=removed', title: 'Tabs fixture' }, 100),
      variationId: 'manual-activation',
    };

    expect(isRecoverableGuidedSession(session)).toBe(true);
    expect(session.variationId).toBe('manual-activation');
    expect(session.pageUrl).toBe('https://example.test/tabs');
    expect(isRecoverableGuidedSession({ ...session, variationId: 'x'.repeat(121) })).toBe(false);
  });

  it('reuses only pattern-relevant APG runtime findings for tabs', () => {
    const evidence = guidedRuntimeEvidence([
      runtimeEvent({ kind: 'aria-widget', timestamp: 101, title: 'Tab did not select', ruleId: 'FT-APG-004', outcome: 'review' }),
      runtimeEvent({ kind: 'aria-widget', timestamp: 102, title: 'Unrelated menu finding', ruleId: 'FT-APG-005', outcome: 'review' }),
      runtimeEvent({ kind: 'keydown', timestamp: 103, title: 'Key: ArrowRight' }),
    ], 'FT-GUIDED-009', 100, 110);

    expect(evidence).toHaveLength(2);
    expect(evidence.some((item) => item.value.includes('Unrelated menu finding'))).toBe(false);
    expect(evidence[0]?.value).toContain('Tab did not select');
    expect(evidence[1]?.value).toContain('ArrowRight');
  });

  it('supports runtime evidence policies for all APG workflows', () => {
    for (const definition of APG_GUIDED_TESTS) {
      expect(hasGuidedRuntimeEvidence(definition.id)).toBe(true);
    }
  });
});
