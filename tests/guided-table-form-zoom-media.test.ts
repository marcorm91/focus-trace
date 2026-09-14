import { describe, expect, it } from 'vitest';
import { ALL_GUIDED_TESTS } from '../lib/guided-tests/all-catalog';
import { guidedStepCriteria } from '../lib/guided-tests/criterion-map';
import { guidedRuntimeEvidence, hasGuidedRuntimeEvidence } from '../lib/guided-tests/runtime-evidence';
import type { RuntimeEvent } from '../shared/types';

function event(kind: RuntimeEvent['kind'], timestamp: number): RuntimeEvent {
  return {
    id: `${kind}-${timestamp}`,
    kind,
    timestamp,
    title: kind,
    severity: 'info',
    element: { tag: 'input', selector: '#field' },
  };
}

describe('guided table, form, resize and multimedia workflows', () => {
  it('registers the four contextual workflows without claiming automated conformance', () => {
    for (const id of ['FT-GUIDED-005', 'FT-GUIDED-006', 'FT-GUIDED-007', 'FT-GUIDED-008']) {
      const definition = ALL_GUIDED_TESTS.find((test) => test.id === id);
      expect(definition).toBeDefined();
      expect(definition?.coverage).toBe('guided-manual');
    }
  });

  it('maps each substantive contextual step to WCAG references declared by its workflow', () => {
    for (const definition of ALL_GUIDED_TESTS.filter((test) => Number(test.id.slice(-3)) >= 5)) {
      const declared = new Set(
        definition.references
          .filter((reference) => reference.type === 'WCAG')
          .map((reference) => reference.id),
      );
      for (const step of definition.steps) {
        const criteria = guidedStepCriteria(definition.id, step.id);
        expect(criteria.length, `${definition.id}/${step.id}`).toBeGreaterThan(0);
        expect(criteria.every((criterion) => declared.has(criterion)), `${definition.id}/${step.id}`).toBe(true);
      }
    }
  });

  it('keeps contextual workflows manual-only and does not attach runtime observations', () => {
    const events = [event('focus', 110), event('keydown', 120), event('click', 130)];
    for (const id of ['FT-GUIDED-005', 'FT-GUIDED-006', 'FT-GUIDED-007', 'FT-GUIDED-008']) {
      expect(hasGuidedRuntimeEvidence(id)).toBe(false);
      expect(guidedRuntimeEvidence(events, id, 100, 140)).toEqual([]);
    }
  });

  it('uses the existing 200 percent and 320 CSS px baselines for contextual resize review', () => {
    const resize = ALL_GUIDED_TESTS.find((test) => test.id === 'FT-GUIDED-007')!;
    expect(resize.steps.find((step) => step.id === 'resize-text-200')?.prompt.en).toContain('200%');
    expect(resize.steps.find((step) => step.id === 'reflow-320')?.prompt.en).toContain('320 CSS px');
  });

  it('records only form/media judgements and warns against persisting payloads or values', () => {
    const form = ALL_GUIDED_TESTS.find((test) => test.id === 'FT-GUIDED-006')!;
    const media = ALL_GUIDED_TESTS.find((test) => test.id === 'FT-GUIDED-008')!;
    expect(form.steps.find((step) => step.id === 'form-error-identification')?.prompt.en).toContain('Do not record the field value');
    expect(media.description.en).toContain('without copying or storing media, transcript or caption payloads');
    expect(media.steps.some((step) => step.prompt.en.includes('Record only your judgement'))).toBe(true);
  });
});
