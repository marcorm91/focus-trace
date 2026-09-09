import {
  ERROR_IDENTIFICATION_RULE,
  ERROR_SUGGESTION_RULE,
} from '../../shared/form-error-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { appendAccessibleAuthenticationReviews } from './authentication-scan-extension';
import { selectorFor } from './dom';
import {
  evaluateErrorIdentification,
  evaluateErrorSuggestions,
  type ErrorIdentificationEvaluation,
  type ErrorSuggestionEvaluation,
} from './form-errors';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type ScanRoot = Document | Element;

function identificationIssue(evaluation: ErrorIdentificationEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: ERROR_IDENTIFICATION_RULE.id,
    title: ERROR_IDENTIFICATION_RULE.title,
    description: 'FocusTrace observed an explicit or user-invalid field state without an associated text error description it could resolve through aria-errormessage or aria-describedby. Review any visible/application-level error message and whether the detected error is identified and described in text before treating this as a WCAG failure.',
    severity: ERROR_IDENTIFICATION_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: ERROR_IDENTIFICATION_RULE.references,
  };
}

function suggestionIssue(evaluation: ErrorSuggestionEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: ERROR_SUGGESTION_RULE.id,
    title: ERROR_SUGGESTION_RULE.title,
    description: 'FocusTrace observed an invalid field with associated error text and correction-relevant constraint metadata. Review whether the message offers a useful correction suggestion when one is known, unless doing so would jeopardize security or the purpose of the content.',
    severity: ERROR_SUGGESTION_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: ERROR_SUGGESTION_RULE.references,
  };
}

export function appendFormErrorReviews(result: ScanResult, root: ScanRoot): void {
  const identificationEvaluations = evaluateErrorIdentification(root);
  const identificationReviews = identificationEvaluations
    .filter((evaluation) => evaluation.outcome === 'review')
    .map(identificationIssue);
  const identificationPasses = identificationEvaluations
    .filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...identificationReviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: ERROR_IDENTIFICATION_RULE.id,
      applicable: identificationEvaluations.length,
      passed: identificationPasses,
      failures: 0,
      reviews: identificationReviews.length,
      warnings: 0,
    },
  ];
  result.passes += identificationPasses;
  result.rulesRun += 1;

  const suggestionEvaluations = evaluateErrorSuggestions(root);
  const suggestionReviews = suggestionEvaluations.map(suggestionIssue);
  result.review.push(...suggestionReviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: ERROR_SUGGESTION_RULE.id,
      applicable: suggestionEvaluations.length,
      passed: 0,
      failures: 0,
      reviews: suggestionReviews.length,
      warnings: 0,
    },
  ];
  result.rulesRun += 1;

  appendAccessibleAuthenticationReviews(result, root);
}
