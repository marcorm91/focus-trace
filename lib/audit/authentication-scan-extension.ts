import { ACCESSIBLE_AUTHENTICATION_PASTE_RULE } from '../../shared/authentication-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import {
  evaluateAccessibleAuthentication,
  type AccessibleAuthenticationEvaluation,
} from './accessible-authentication';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type ScanRoot = Document | Element;

function authenticationIssue(evaluation: AccessibleAuthenticationEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: ACCESSIBLE_AUTHENTICATION_PASTE_RULE.id,
    title: ACCESSIBLE_AUTHENTICATION_PASTE_RULE.title,
    description: 'FocusTrace observed an explicitly marked authentication field whose own markup or an ancestor inline handler appears to cancel paste. Review whether paste/password-manager assistance or another authentication method avoids requiring users to remember or manually transcribe information before treating this as a WCAG failure.',
    severity: ACCESSIBLE_AUTHENTICATION_PASTE_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: ACCESSIBLE_AUTHENTICATION_PASTE_RULE.references,
  };
}

export function appendAccessibleAuthenticationReviews(result: ScanResult, root: ScanRoot): void {
  const evaluations = evaluateAccessibleAuthentication(root);
  const reviews = evaluations.map(authenticationIssue);

  result.review.push(...reviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: ACCESSIBLE_AUTHENTICATION_PASTE_RULE.id,
      applicable: evaluations.length,
      passed: 0,
      failures: 0,
      reviews: reviews.length,
      warnings: 0,
      coverage: 'findings-only',
    },
  ];
  result.rulesRun += 1;
}
