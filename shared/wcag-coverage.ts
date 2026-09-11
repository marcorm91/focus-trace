import wcagCatalog from '../generated/wcag-catalog.json';
import { FOCUS_VISIBLE_RULE } from './focus-visible-rules';
import { FORM_ERROR_RULES } from './form-error-rules';
import { FORM_PURPOSE_RULES } from './form-purpose-rules';
import { HOVER_FOCUS_CONTENT_RULE } from './hover-focus-content-rules';
import {
  INTERACTIVE_NON_TEXT_CONTRAST_RULE,
  INTERACTIVE_TEXT_CONTRAST_RULE,
} from './interactive-contrast-rules';
import { KEYBOARD_POINTER_RULES } from './keyboard-pointer-rules';
import { LANGUAGE_PARTS_RULE } from './language-parts-rules';
import { MEDIA_RULES } from './media-rules';
import { RULES } from './rule-catalog';
import { TEXT_SPACING_RULE } from './text-spacing-rules';

export type WcagCoverageMethod = 'automated' | 'review';
export type WcagCoverageSurface = 'page' | 'runtime' | 'site-audit';
export type WcagCoverageCompleteness = 'none' | 'partial' | 'complete';
export type WcagCoverageMode = 'automated' | 'review' | 'runtime' | 'site-audit' | 'manual' | 'not-covered';

export interface WcagCoverageCheck {
  ruleId: string;
  method: WcagCoverageMethod;
  surface: WcagCoverageSurface;
  actRuleIds: string[];
}

export interface En301549WebReference {
  standard: 'EN 301 549';
  version: 'V4.1.1 (2026-09)';
  clause: string;
  url: string;
}

export interface WcagCriterionCoverage {
  id: string;
  title: string;
  level: 'A' | 'AA' | 'AAA';
  url: string;
  coverage: WcagCoverageMode[];
  checks: WcagCoverageCheck[];
  ruleIds: string[];
  actRuleIds: string[];
  implemented: boolean;
  completeness: WcagCoverageCompleteness;
  manualReviewRequired: boolean;
  en301549?: En301549WebReference;
}

export const EN_301_549_WEB_STANDARD = {
  standard: 'EN 301 549' as const,
  version: 'V4.1.1 (2026-09)' as const,
  title: 'Accessibility requirements for ICT products and services',
  clause: '9',
  url: 'https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf',
} as const;

function en301549Reference(
  criterionId: string,
  level: 'A' | 'AA' | 'AAA',
): En301549WebReference | undefined {
  if (level === 'AAA') return undefined;
  return {
    standard: EN_301_549_WEB_STANDARD.standard,
    version: EN_301_549_WEB_STANDARD.version,
    clause: `9.${criterionId}`,
    url: EN_301_549_WEB_STANDARD.url,
  };
}

const SITE_AUDIT_RULE_IDS = new Set([
  'FT-REVIEW-011',
  'FT-REVIEW-013',
  'FT-REVIEW-015',
]);

const FULLY_EVALUATED_WCAG_CRITERIA = new Set<string>();

function coverageMethodForRule(ruleId: string): WcagCoverageMethod | undefined {
  if (ruleId.startsWith('FT-WCAG-')) return 'automated';
  if (ruleId.startsWith('FT-REVIEW-') || ruleId.startsWith('FT-RUNTIME-')) return 'review';
  return undefined;
}

function coverageSurfaceForRule(ruleId: string): WcagCoverageSurface {
  if (ruleId.startsWith('FT-RUNTIME-')) return 'runtime';
  if (SITE_AUDIT_RULE_IDS.has(ruleId)) return 'site-audit';
  return 'page';
}

const COVERAGE_RULES = [
  ...Object.values(RULES),
  ...FORM_PURPOSE_RULES,
  ...FORM_ERROR_RULES,
  LANGUAGE_PARTS_RULE,
  TEXT_SPACING_RULE,
  FOCUS_VISIBLE_RULE,
  INTERACTIVE_TEXT_CONTRAST_RULE,
  INTERACTIVE_NON_TEXT_CONTRAST_RULE,
  HOVER_FOCUS_CONTENT_RULE,
  ...MEDIA_RULES,
  ...KEYBOARD_POINTER_RULES,
];

const ruleReferences = COVERAGE_RULES.flatMap((rule) => {
  const method = coverageMethodForRule(rule.id);
  if (!method) return [];
  const surface = coverageSurfaceForRule(rule.id);
  const actRuleIds = rule.references
    .filter((reference) => reference.type === 'ACT')
    .map((reference) => reference.id)
    .sort();

  return rule.references
    .filter((reference) => reference.type === 'WCAG')
    .map((reference) => ({
      criterionId: reference.id,
      ruleId: rule.id,
      method,
      surface,
      actRuleIds,
    }));
});

const COVERAGE_MODE_ORDER: WcagCoverageMode[] = [
  'automated',
  'review',
  'runtime',
  'site-audit',
  'manual',
  'not-covered',
];

function modesForChecks(
  checks: WcagCoverageCheck[],
  manualReviewRequired: boolean,
): WcagCoverageMode[] {
  if (checks.length === 0) return ['manual', 'not-covered'];

  const modes = new Set<WcagCoverageMode>();
  for (const check of checks) {
    modes.add(check.method);
    if (check.surface === 'runtime') modes.add('runtime');
    if (check.surface === 'site-audit') modes.add('site-audit');
  }
  if (manualReviewRequired) modes.add('manual');
  return COVERAGE_MODE_ORDER.filter((mode) => modes.has(mode));
}

export const WCAG_COVERAGE: readonly WcagCriterionCoverage[] = wcagCatalog.criteria
  .filter((criterion) => criterion.status === 'active')
  .map((criterion) => {
    const level = criterion.level as 'A' | 'AA' | 'AAA';
    const matches = ruleReferences.filter((reference) => reference.criterionId === criterion.id);
    const checks: WcagCoverageCheck[] = matches.map((match) => ({
      ruleId: match.ruleId,
      method: match.method,
      surface: match.surface,
      actRuleIds: match.actRuleIds,
    }));
    const implemented = checks.length > 0;
    const completeness: WcagCoverageCompleteness = !implemented
      ? 'none'
      : FULLY_EVALUATED_WCAG_CRITERIA.has(criterion.id)
        ? 'complete'
        : 'partial';
    const manualReviewRequired = completeness !== 'complete';

    return {
      id: criterion.id,
      title: criterion.title,
      level,
      url: criterion.url,
      coverage: modesForChecks(checks, manualReviewRequired),
      checks,
      ruleIds: [...new Set(checks.map((check) => check.ruleId))].sort(),
      actRuleIds: [...new Set(checks.flatMap((check) => check.actRuleIds))].sort(),
      implemented,
      completeness,
      manualReviewRequired,
      en301549: en301549Reference(criterion.id, level),
    };
  });

export function wcagCoverageForCriterion(id: string): WcagCriterionCoverage | undefined {
  return WCAG_COVERAGE.find((criterion) => criterion.id === id);
}

export const WCAG_COVERAGE_SUMMARY = {
  totalActive: WCAG_COVERAGE.length,
  levelAOrAA: WCAG_COVERAGE.filter((criterion) => criterion.level !== 'AAA').length,
  implemented: WCAG_COVERAGE.filter((criterion) => criterion.implemented).length,
  notImplemented: WCAG_COVERAGE.filter((criterion) => !criterion.implemented).length,
  complete: WCAG_COVERAGE.filter((criterion) => criterion.completeness === 'complete').length,
  partial: WCAG_COVERAGE.filter((criterion) => criterion.completeness === 'partial').length,
  manualRequired: WCAG_COVERAGE.filter((criterion) => criterion.manualReviewRequired).length,
  automated: WCAG_COVERAGE.filter((criterion) => criterion.coverage.includes('automated')).length,
  review: WCAG_COVERAGE.filter((criterion) => criterion.coverage.includes('review')).length,
  runtime: WCAG_COVERAGE.filter((criterion) => criterion.coverage.includes('runtime')).length,
  siteAudit: WCAG_COVERAGE.filter((criterion) => criterion.coverage.includes('site-audit')).length,
  en301549Web: WCAG_COVERAGE.filter((criterion) => criterion.en301549).length,
} as const;
