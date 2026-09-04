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

  it('keeps structural and interactive semantics in the same review area', () => {
    for (const ruleId of [
      'FT-REVIEW-004',
      'FT-REVIEW-005',
      'FT-REVIEW-006',
      'FT-REVIEW-007',
      'FT-REVIEW-008',
      'FT-REVIEW-009',
      'FT-REVIEW-010',
      'FT-REVIEW-011',
    ]) expect(scanCategoryForRule(ruleId)).toBe('structure');
  });

  it('keeps HTML authoring and content-model warnings inside Semantics', () => {
    for (const ruleId of [
      'FT-WARN-005',
      'FT-WARN-006',
      'FT-WARN-007',
      'FT-WARN-008',
      'FT-WARN-009',
      'FT-WARN-010',
      'FT-WARN-011',
    ]) expect(scanCategoryForRule(ruleId)).toBe('structure');
  });

  it('keeps advanced ARIA validation inside the ARIA area', () => {
    for (const ruleId of [
      'FT-WARN-012',
      'FT-WARN-013',
      'FT-WARN-014',
      'FT-WARN-015',
      'FT-WARN-016',
      'FT-WARN-017',
      'FT-WARN-018',
      'FT-WARN-019',
    ]) expect(scanCategoryForRule(ruleId)).toBe('aria');
  });
});
