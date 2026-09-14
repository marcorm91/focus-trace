import {
  LARGE_SCALE_ZOOM_REVIEW_RULE,
  ORIENTATION_LOCK_REVIEW_RULE,
  VIEWPORT_ZOOM_RULE,
} from '../../shared/viewport-visual-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import { evaluateOrientationLock, evaluateViewportZoom } from './viewport-visual';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type PageRule = typeof VIEWPORT_ZOOM_RULE | typeof LARGE_SCALE_ZOOM_REVIEW_RULE | typeof ORIENTATION_LOCK_REVIEW_RULE;

function issueFor(
  rule: PageRule,
  target: Element,
  outcome: 'fail' | 'review',
  detail: string,
): ScanIssue {
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: rule.id === VIEWPORT_ZOOM_RULE.id
      ? 'The authored viewport metadata can prevent the ACT-observable 200% text enlargement expectation in affected user agents. This FAIL is limited to that syntactic zoom expectation and does not claim complete WCAG 1.4.4 conformance.'
      : rule.id === LARGE_SCALE_ZOOM_REVIEW_RULE.id
        ? 'The viewport permits the WCAG 200% threshold but sets a finite larger zoom ceiling below the compatibility review threshold. Review low-vision usability without treating 5× enlargement as a WCAG requirement.'
        : 'An orientation-conditioned CSS transform appears to rotate visible content by a quarter turn. Review whether this effectively locks operation to one orientation and whether an essential-orientation exception or alternate control applies.',
    severity: rule.severity,
    outcome,
    targets: [selectorFor(target)],
    evidence: detail,
    references: rule.references,
  };
}

function appendRuleResult(
  result: ScanResult,
  ruleId: string,
  applicable: number,
  passed: number,
  failures: number,
  reviews: number,
): void {
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    { ruleId, applicable, passed, failures, reviews, warnings: 0 },
  ];
  result.passes += passed;
  result.rulesRun += 1;
}

export function appendViewportVisualChecks(result: ScanResult, root: Document | Element): void {
  if (!(root instanceof Document)) return;

  const viewport = evaluateViewportZoom(root);
  const twoHundred = viewport.filter((entry) => entry.kind === '200-percent');
  const twoHundredFailures = twoHundred.filter((entry) => entry.outcome === 'fail');
  const twoHundredReviews = twoHundred.filter((entry) => entry.outcome === 'review');
  const twoHundredPasses = twoHundred.filter((entry) => entry.outcome === 'pass');
  result.issues.push(...twoHundredFailures.map((entry) => issueFor(VIEWPORT_ZOOM_RULE, entry.element, 'fail', entry.detail)));
  result.review.push(...twoHundredReviews.map((entry) => issueFor(VIEWPORT_ZOOM_RULE, entry.element, 'review', entry.detail)));
  appendRuleResult(
    result,
    VIEWPORT_ZOOM_RULE.id,
    twoHundred.length,
    twoHundredPasses.length,
    twoHundredFailures.length,
    twoHundredReviews.length,
  );

  const largeScale = viewport.filter((entry) => entry.kind === 'large-scale');
  const largeScaleReviews = largeScale.filter((entry) => entry.outcome === 'review');
  const largeScalePasses = largeScale.filter((entry) => entry.outcome === 'pass');
  result.review.push(...largeScaleReviews.map((entry) => issueFor(LARGE_SCALE_ZOOM_REVIEW_RULE, entry.element, 'review', entry.detail)));
  appendRuleResult(
    result,
    LARGE_SCALE_ZOOM_REVIEW_RULE.id,
    largeScale.length,
    largeScalePasses.length,
    0,
    largeScaleReviews.length,
  );

  const orientation = evaluateOrientationLock(root);
  result.review.push(...orientation.map((entry) => issueFor(ORIENTATION_LOCK_REVIEW_RULE, entry.element, 'review', entry.detail)));
  appendRuleResult(
    result,
    ORIENTATION_LOCK_REVIEW_RULE.id,
    orientation.length,
    0,
    0,
    orientation.length,
  );
}