import { describe, expect, it } from 'vitest';
import {
  RANGE_INDICATOR_NAME_RULE,
  SPECIALIZED_ARIA_NAME_WARNING_RULE,
  SPECIALIZED_CONTROL_NAME_RULE,
} from '../shared/specialized-accessible-name-rules';

describe('specialized accessible-name rule contracts', () => {
  it('keeps deterministic WCAG name checks serious and standards-backed', () => {
    expect(SPECIALIZED_CONTROL_NAME_RULE).toMatchObject({
      id: 'FT-WCAG-014',
      severity: 'serious',
    });
    expect(SPECIALIZED_CONTROL_NAME_RULE.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'WCAG', id: '4.1.2' }),
      expect.objectContaining({ type: 'WAI-ARIA' }),
    ]));

    expect(RANGE_INDICATOR_NAME_RULE).toMatchObject({
      id: 'FT-WCAG-015',
      severity: 'serious',
    });
    expect(RANGE_INDICATOR_NAME_RULE.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'WCAG', id: '1.1.1' }),
      expect.objectContaining({ type: 'WAI-ARIA' }),
    ]));
  });

  it('keeps dialog/treeitem naming as a serious ARIA authoring warning, not a WCAG rule', () => {
    expect(SPECIALIZED_ARIA_NAME_WARNING_RULE).toMatchObject({
      id: 'FT-WARN-022',
      severity: 'serious',
    });
    expect(SPECIALIZED_ARIA_NAME_WARNING_RULE.references.some((reference) => reference.type === 'WCAG')).toBe(false);
    expect(SPECIALIZED_ARIA_NAME_WARNING_RULE.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'WAI-ARIA' }),
      expect.objectContaining({ type: 'WAI-ARIA APG' }),
    ]));
  });
});
