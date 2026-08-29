import type { ScanIssue } from './types';

export type ScanCategory =
  | 'all'
  | 'contrast'
  | 'names'
  | 'forms'
  | 'structure'
  | 'keyboard'
  | 'aria'
  | 'other';

const RULE_CATEGORY: Record<string, Exclude<ScanCategory, 'all'>> = {
  'FT-WCAG-001': 'structure',
  'FT-WCAG-002': 'names',
  'FT-WCAG-003': 'names',
  'FT-WCAG-004': 'forms',
  'FT-WCAG-005': 'names',
  'FT-WCAG-006': 'keyboard',
  'FT-WCAG-007': 'names',
  'FT-WCAG-008': 'structure',
  'FT-WCAG-009': 'structure',
  'FT-WCAG-010': 'contrast',
  'FT-WCAG-011': 'contrast',
  'FT-WARN-001': 'aria',
  'FT-WARN-002': 'aria',
  'FT-WARN-003': 'aria',
  'FT-WARN-004': 'structure',
  'FT-WARN-005': 'structure',
  'FT-WARN-006': 'structure',
  'FT-WARN-007': 'structure',
  'FT-WARN-008': 'structure',
  'FT-WARN-009': 'structure',
  'FT-WARN-010': 'structure',
  'FT-WARN-011': 'structure',
  'FT-WARN-012': 'aria',
  'FT-WARN-013': 'aria',
  'FT-WARN-014': 'aria',
  'FT-WARN-015': 'aria',
  'FT-WARN-016': 'aria',
  'FT-WARN-017': 'aria',
  'FT-WARN-018': 'aria',
  'FT-WARN-019': 'aria',
  'FT-REVIEW-001': 'keyboard',
  'FT-REVIEW-002': 'structure',
  'FT-REVIEW-003': 'forms',
  'FT-REVIEW-004': 'structure',
  'FT-REVIEW-005': 'structure',
  'FT-REVIEW-006': 'structure',
  'FT-REVIEW-007': 'structure',
  'FT-REVIEW-008': 'structure',
  'FT-REVIEW-009': 'structure',
  'FT-REVIEW-010': 'structure',
};

export function scanCategoryForRule(ruleId: string): Exclude<ScanCategory, 'all'> {
  return RULE_CATEGORY[ruleId] ?? 'other';
}

export function scanCategoryForIssue(issue: Pick<ScanIssue, 'ruleId'>): Exclude<ScanCategory, 'all'> {
  return scanCategoryForRule(issue.ruleId);
}
