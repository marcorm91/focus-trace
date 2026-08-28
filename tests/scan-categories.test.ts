import { describe, expect, it } from 'vitest';
import { scanCategoryForRule } from '../shared/scan-categories';

describe('scan categories', () => {
  it('keeps text and non-text contrast inside the full Analyze scan', () => {
    expect(scanCategoryForRule('FT-WCAG-010')).toBe('contrast');
    expect(scanCategoryForRule('FT-WCAG-011')).toBe('contrast');
  });

  it('groups existing rules into useful audit areas', () => {
    expect(scanCategoryForRule('FT-WCAG-003')).toBe('names');
    expect(scanCategoryForRule('FT-WCAG-004')).toBe('forms');
    expect(scanCategoryForRule('FT-REVIEW-002')).toBe('structure');
    expect(scanCategoryForRule('FT-REVIEW-001')).toBe('keyboard');
    expect(scanCategoryForRule('FT-WARN-003')).toBe('aria');
    expect(scanCategoryForRule('FT-WARN-004')).toBe('structure');
  });
});
