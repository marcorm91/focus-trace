import wcagCatalog from '../generated/wcag-catalog.json';
import { RULES } from './rule-catalog';

export type WcagCoverageMode = 'automated' | 'review' | 'runtime';

export interface WcagCriterionCoverage {
  id: string;
  title: string;
  level: 'A' | 'AA' | 'AAA';
  url: string;
  coverage: WcagCoverageMode[];
  ruleIds: string[];
  implemented: boolean;
}

function modeForRule(ruleId: string): WcagCoverageMode | undefined {
  if (ruleId.startsWith('FT-WCAG-')) return 'automated';
  if (ruleId.startsWith('FT-REVIEW-')) return 'review';
  if (ruleId.startsWith('FT-RUNTIME-')) return 'runtime';
  return undefined;
}

const ruleReferences = Object.values(RULES).flatMap((rule) => {
  const mode = modeForRule(rule.id);
  if (!mode) return [];
  return rule.references
    .filter((reference) => reference.type === 'WCAG')
    .map((reference) => ({ criterionId: reference.id, ruleId: rule.id, mode }));
});

export const WCAG_COVERAGE: readonly WcagCriterionCoverage[] = wcagCatalog.criteria
  .filter((criterion) => criterion.status === 'active')
  .map((criterion) => {
    const matches = ruleReferences.filter((reference) => reference.criterionId === criterion.id);
    const coverage = [...new Set(matches.map((reference) => reference.mode))];
    return {
      id: criterion.id,
      title: criterion.title,
      level: criterion.level as 'A' | 'AA' | 'AAA',
      url: criterion.url,
      coverage,
      ruleIds: [...new Set(matches.map((reference) => reference.ruleId))].sort(),
      implemented: coverage.length > 0,
    };
  });

export function wcagCoverageForCriterion(id: string): WcagCriterionCoverage | undefined {
  return WCAG_COVERAGE.find((criterion) => criterion.id === id);
}

export const WCAG_COVERAGE_SUMMARY = {
  totalActive: WCAG_COVERAGE.length,
  implemented: WCAG_COVERAGE.filter((criterion) => criterion.implemented).length,
  notImplemented: WCAG_COVERAGE.filter((criterion) => !criterion.implemented).length,
  automated: WCAG_COVERAGE.filter((criterion) => criterion.coverage.includes('automated')).length,
  review: WCAG_COVERAGE.filter((criterion) => criterion.coverage.includes('review')).length,
  runtime: WCAG_COVERAGE.filter((criterion) => criterion.coverage.includes('runtime')).length,
} as const;
