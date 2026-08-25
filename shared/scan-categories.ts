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
  'FT-WARN-001': 'aria',
  'FT-WARN-002': 'aria',
  'FT-WARN-003': 'aria',
  'FT-REVIEW-001': 'keyboard',
  'FT-REVIEW-002': 'structure',
  'FT-REVIEW-003': 'forms',
};

export function scanCategoryForRule(ruleId: string): Exclude<ScanCategory, 'all'> {
  return RULE_CATEGORY[ruleId] ?? 'other';
}

export function scanCategoryForIssue(issue: Pick<ScanIssue, 'ruleId'>): Exclude<ScanCategory, 'all'> {
  return scanCategoryForRule(issue.ruleId);
}
