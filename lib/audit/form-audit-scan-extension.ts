import { FORM_LABELING_AND_INSTRUCTIONS_RULE } from '../../shared/form-audit-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import { evaluateFormAudit, type FormAuditEvaluation } from './form-audit';
import { appendViewportVisualChecks } from './viewport-visual-scan-extension';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
type ScanRoot = Document | Element;

function issueFor(evaluation: FormAuditEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: FORM_LABELING_AND_INSTRUCTIONS_RULE.id,
    title: FORM_LABELING_AND_INSTRUCTIONS_RULE.title,
    description: 'FocusTrace observed a bounded form-labeling, grouping, instruction or required-state signal that needs human review. The rule intentionally does not inspect or persist editable field values.',
    severity: FORM_LABELING_AND_INSTRUCTIONS_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: FORM_LABELING_AND_INSTRUCTIONS_RULE.references,
  };
}

export function appendFormAuditReviews(result: ScanResult, root: ScanRoot): void {
  const evaluations = evaluateFormAudit(root);
  const reviews = evaluations.map(issueFor);

  result.review.push(...reviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: FORM_LABELING_AND_INSTRUCTIONS_RULE.id,
      applicable: evaluations.length,
      passed: 0,
      failures: 0,
      reviews: reviews.length,
      warnings: 0,
      coverage: 'findings-only',
    },
  ];
  result.rulesRun += 1;

  appendViewportVisualChecks(result, root);
}
