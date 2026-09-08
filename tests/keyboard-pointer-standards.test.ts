import { describe, expect, it } from 'vitest';
import actCatalog from '../generated/act-catalog.json';
import wcagCatalog from '../generated/wcag-catalog.json';
import { KEYBOARD_POINTER_RULES } from '../shared/keyboard-pointer-rules';
import { wcagCoverageForCriterion } from '../shared/wcag-coverage';

describe('keyboard and pointer standards coverage', () => {
  it('keeps the new WCAG and ACT references resolvable', () => {
    const wcag = new Set(wcagCatalog.criteria.map((criterion) => criterion.id));
    const act = new Set(actCatalog.rules.map((rule) => rule.id));

    for (const rule of KEYBOARD_POINTER_RULES) {
      for (const reference of rule.references) {
        if (reference.type === 'WCAG') expect(wcag.has(reference.id), `${rule.id} WCAG ${reference.id}`).toBe(true);
        if (reference.type === 'ACT') expect(act.has(reference.id), `${rule.id} ACT ${reference.id}`).toBe(true);
      }
    }
  });

  it('maps Keyboard to runtime review evidence without claiming complete coverage', () => {
    expect(wcagCoverageForCriterion('2.1.1')).toMatchObject({
      level: 'A',
      coverage: ['review', 'runtime', 'manual'],
      ruleIds: ['FT-RUNTIME-011'],
      completeness: 'partial',
      manualReviewRequired: true,
      en301549: { clause: '9.2.1.1' },
    });
  });

  it('maps No Keyboard Trap to standard-navigation ACT evidence', () => {
    expect(wcagCoverageForCriterion('2.1.2')).toMatchObject({
      level: 'A',
      coverage: ['review', 'runtime', 'manual'],
      ruleIds: ['FT-RUNTIME-012'],
      actRuleIds: ['a1b64e'],
      completeness: 'partial',
      manualReviewRequired: true,
      en301549: { clause: '9.2.1.2' },
    });
  });

  it('maps Pointer Cancellation to bounded runtime review evidence', () => {
    expect(wcagCoverageForCriterion('2.5.2')).toMatchObject({
      level: 'A',
      coverage: ['review', 'runtime', 'manual'],
      ruleIds: ['FT-RUNTIME-013'],
      completeness: 'partial',
      manualReviewRequired: true,
      en301549: { clause: '9.2.5.2' },
    });
  });
});
