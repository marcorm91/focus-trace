import { describe, expect, it } from 'vitest';
import { wcagCoverageForCriterion } from '../shared/wcag-coverage';

describe('specialized accessible-name WCAG coverage', () => {
  it('maps deterministic specialized control naming to WCAG 4.1.2', () => {
    const criterion = wcagCoverageForCriterion('4.1.2');
    expect(criterion?.ruleIds).toContain('FT-WCAG-014');
    expect(criterion?.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'FT-WCAG-014',
        method: 'automated',
        surface: 'page',
      }),
    ]));
  });

  it('maps deterministic range-indicator naming to WCAG 1.1.1', () => {
    const criterion = wcagCoverageForCriterion('1.1.1');
    expect(criterion?.ruleIds).toContain('FT-WCAG-015');
    expect(criterion?.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'FT-WCAG-015',
        method: 'automated',
        surface: 'page',
      }),
    ]));
  });

  it('does not promote the dialog/treeitem authoring warning into WCAG coverage', () => {
    for (const criterionId of ['1.1.1', '4.1.2']) {
      expect(wcagCoverageForCriterion(criterionId)?.ruleIds).not.toContain('FT-WARN-022');
    }
  });
});
