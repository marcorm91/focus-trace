import { EMBEDDED_CONTENT_RULES } from '../../shared/embedded-content-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import { evaluateEmbeddedContent, type EmbeddedContentEvaluation } from './embedded-content';

type ScanRoot = Document | Element;

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function issueFor(evaluation: EmbeddedContentEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: evaluation.rule.id,
    title: evaluation.rule.title,
    description: descriptionFor(evaluation),
    severity: evaluation.rule.severity,
    outcome: evaluation.outcome === 'pass' ? 'review' : evaluation.outcome,
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    ...(evaluation.accessibleName ? { accessibleName: evaluation.accessibleName } : {}),
    references: evaluation.rule.references,
  };
}

function descriptionFor(evaluation: EmbeddedContentEvaluation): string {
  switch (evaluation.rule.id) {
    case 'FT-WCAG-018':
      return 'This embedded object exposes non-text content without a usable accessible alternative. Provide a non-empty accessible name or mark the object presentational only when it is genuinely decorative.';
    case 'FT-WCAG-019':
      return 'This exposed frame has an empty accessible name, so assistive-technology users cannot identify the purpose of the embedded browsing context.';
    case 'FT-WCAG-020':
      return 'This frame is removed from sequential keyboard navigation while its same-origin embedded document contains at least one sequentially focusable descendant.';
    case 'FT-REVIEW-038':
      return 'Several exposed frames share the same accessible name. Review whether they have an equivalent purpose; otherwise give each frame a distinguishable name.';
    case 'FT-REVIEW-039':
      return 'FocusTrace could inspect the frame element but could not evaluate the embedded document. Nested content must not be reported as clean when that inspection boundary exists.';
    default:
      return 'Review the embedded-content evidence collected by FocusTrace.';
  }
}

export function appendEmbeddedContentChecks(result: ScanResult, root: ScanRoot): void {
  const evaluations = evaluateEmbeddedContent(root);

  for (const rule of EMBEDDED_CONTENT_RULES) {
    const relevant = evaluations.filter((evaluation) => evaluation.rule.id === rule.id);
    const failures = relevant.filter((evaluation) => evaluation.outcome === 'fail');
    const reviews = relevant.filter((evaluation) => evaluation.outcome === 'review');
    const passed = relevant.filter((evaluation) => evaluation.outcome === 'pass').length;

    result.issues.push(...failures.map(issueFor));
    result.review.push(...reviews.map(issueFor));
    result.ruleResults = [
      ...(result.ruleResults ?? []),
      {
        ruleId: rule.id,
        applicable: relevant.length,
        passed,
        failures: failures.length,
        reviews: reviews.length,
        warnings: 0,
      },
    ];
    result.passes += passed;
    result.rulesRun += 1;
  }
}
