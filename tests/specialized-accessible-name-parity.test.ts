import { describe, expect, it } from 'vitest';
import bestPractice01 from '../config/axe-parity/best-practice-01.json';
import core01 from '../config/axe-parity/core-01.json';
import core02 from '../config/axe-parity/core-02.json';
import core04 from '../config/axe-parity/core-04.json';

const CLASSIFICATIONS = [
  ...core01.classifications,
  ...core02.classifications,
  ...core04.classifications,
  ...bestPractice01.classifications,
];

const EXPECTED = new Map([
  ['aria-dialog-name', ['FT-WARN-022']],
  ['aria-meter-name', ['FT-WCAG-015']],
  ['aria-progressbar-name', ['FT-WCAG-015']],
  ['aria-tab-name', ['FT-WCAG-014']],
  ['aria-tooltip-name', ['FT-WCAG-014']],
  ['aria-treeitem-name', ['FT-WARN-022']],
  ['summary-name', ['FT-WCAG-014']],
] as const);

describe('specialized accessible-name axe parity', () => {
  it('records all seven targeted benchmark rules as conservative partial coverage', () => {
    for (const [axeRuleId, focusTraceRuleIds] of EXPECTED) {
      const classification = CLASSIFICATIONS.find((entry) => entry.axeRuleId === axeRuleId);
      expect(classification, `Missing classification for ${axeRuleId}`).toBeDefined();
      expect(classification).toMatchObject({
        axeRuleId,
        relationship: 'partial',
        focusTraceRuleIds: [...focusTraceRuleIds],
      });
    }
  });

  it('does not overclaim equivalence for the bounded local AccName implementation', () => {
    const targeted = CLASSIFICATIONS.filter((entry) => EXPECTED.has(entry.axeRuleId as keyof typeof EXPECTED));
    expect(targeted).toHaveLength(7);
    expect(targeted.some((entry) => entry.relationship === 'equivalent')).toBe(false);
  });
});
