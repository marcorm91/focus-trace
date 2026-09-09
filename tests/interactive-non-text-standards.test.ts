import { describe, expect, it } from 'vitest';
import wcagCatalog from '../generated/wcag-catalog.json';
import { INTERACTIVE_NON_TEXT_CONTRAST_RULE } from '../shared/interactive-contrast-rules';
import { wcagCoverageForCriterion } from '../shared/wcag-coverage';

describe('interactive non-text contrast standards mapping', () => {
  it('keeps FT-RUNTIME-016 linked to the current WCAG 2.2 AA criterion', () => {
    const reference = INTERACTIVE_NON_TEXT_CONTRAST_RULE.references.find((item) => item.type === 'WCAG');
    const criterion = wcagCatalog.criteria.find((item) => item.id === '1.4.11');

    expect(reference).toMatchObject({
      type: 'WCAG',
      id: '1.4.11',
      level: 'AA',
      status: 'normative',
    });
    expect(criterion).toMatchObject({ id: '1.4.11', level: 'AA', status: 'active' });
  });

  it('adds runtime review coverage without claiming complete conformance', () => {
    expect(wcagCoverageForCriterion('1.4.11')).toMatchObject({
      level: 'AA',
      coverage: ['automated', 'review', 'runtime', 'manual'],
      ruleIds: ['FT-RUNTIME-016', 'FT-WCAG-011'],
      completeness: 'partial',
      manualReviewRequired: true,
      en301549: { clause: '9.1.4.11' },
    });
  });
});