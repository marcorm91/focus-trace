import { describe, expect, it } from 'vitest';
import actCatalog from '../generated/act-catalog.json';
import wcagCatalog from '../generated/wcag-catalog.json';
import { FORM_ERROR_RULES } from '../shared/form-error-rules';
import { wcagCoverageForCriterion } from '../shared/wcag-coverage';

describe('form error standards coverage', () => {
  it('keeps WCAG and ACT references resolvable', () => {
    const wcag = new Set(wcagCatalog.criteria.map((criterion) => criterion.id));
    const act = new Set(actCatalog.rules.map((rule) => rule.id));

    for (const rule of FORM_ERROR_RULES) {
      for (const reference of rule.references) {
        if (reference.type === 'WCAG') expect(wcag.has(reference.id), `${rule.id} WCAG ${reference.id}`).toBe(true);
        if (reference.type === 'ACT') expect(act.has(reference.id), `${rule.id} ACT ${reference.id}`).toBe(true);
      }
    }
  });

  it('maps Error Identification as partial page review evidence', () => {
    expect(wcagCoverageForCriterion('3.3.1')).toMatchObject({
      level: 'A',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-019'],
      actRuleIds: ['36b590'],
      completeness: 'partial',
      manualReviewRequired: true,
      en301549: { clause: '9.3.3.1' },
    });
  });

  it('maps Error Suggestion as partial page review evidence', () => {
    expect(wcagCoverageForCriterion('3.3.3')).toMatchObject({
      level: 'AA',
      coverage: ['review', 'manual'],
      ruleIds: ['FT-REVIEW-020'],
      completeness: 'partial',
      manualReviewRequired: true,
      en301549: { clause: '9.3.3.3' },
    });
  });
});
