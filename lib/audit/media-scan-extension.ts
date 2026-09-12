import {
  LIVE_CAPTIONS_RULE,
  PRERECORDED_AUDIO_ALTERNATIVE_RULE,
  PRERECORDED_AUDIO_DESCRIPTION_RULE,
  PRERECORDED_CAPTIONS_RULE,
  PRERECORDED_VIDEO_ALTERNATIVE_RULE,
} from '../../shared/media-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import { appendAriaRoleStateRelationshipChecks } from './aria-role-state-scan-extension';
import { appendElementInternalsSemantics } from './element-internals-semantics';
import { appendFormErrorReviews } from './form-error-scan-extension';
import {
  evaluateLiveCaptions,
  evaluatePrerecordedAudioAlternatives,
  evaluatePrerecordedAudioDescriptions,
  evaluatePrerecordedCaptions,
  evaluatePrerecordedVideoAlternatives,
  type LiveCaptionEvaluation,
  type PrerecordedAudioAlternativeEvaluation,
  type PrerecordedAudioDescriptionEvaluation,
  type PrerecordedCaptionEvaluation,
  type PrerecordedVideoAlternativeEvaluation,
} from './media-alternatives';
import { appendSpecializedAccessibleNameChecks } from './specialized-accessible-name-scan-extension';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type ScanRoot = Document | Element;

function audioIssue(evaluation: PrerecordedAudioAlternativeEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: PRERECORDED_AUDIO_ALTERNATIVE_RULE.id,
    title: PRERECORDED_AUDIO_ALTERNATIVE_RULE.title,
    description: 'FocusTrace observed likely prerecorded audio-only media without an observable candidate equivalent alternative in its local markup. Review whether an equivalent time-based media alternative exists and accurately presents the same information before treating this as a WCAG failure.',
    severity: PRERECORDED_AUDIO_ALTERNATIVE_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: PRERECORDED_AUDIO_ALTERNATIVE_RULE.references,
  };
}

function captionsIssue(evaluation: PrerecordedCaptionEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: PRERECORDED_CAPTIONS_RULE.id,
    title: PRERECORDED_CAPTIONS_RULE.title,
    description: 'FocusTrace observed likely prerecorded video without an observable native captions track. Review whether the video contains auditory information and whether equivalent captions are supplied through a custom player or burned into the picture before treating this as a WCAG failure.',
    severity: PRERECORDED_CAPTIONS_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: PRERECORDED_CAPTIONS_RULE.references,
  };
}

function videoAlternativeIssue(evaluation: PrerecordedVideoAlternativeEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: PRERECORDED_VIDEO_ALTERNATIVE_RULE.id,
    title: PRERECORDED_VIDEO_ALTERNATIVE_RULE.title,
    description: 'FocusTrace observed likely prerecorded synchronized video without an observable candidate audio description or equivalent media alternative in its local markup. Review custom-player descriptions, alternate media, meaningful visual content and WCAG applicability before treating this as a failure.',
    severity: PRERECORDED_VIDEO_ALTERNATIVE_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: PRERECORDED_VIDEO_ALTERNATIVE_RULE.references,
  };
}

function liveCaptionsIssue(evaluation: LiveCaptionEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: LIVE_CAPTIONS_RULE.id,
    title: LIVE_CAPTIONS_RULE.title,
    description: 'FocusTrace observed native video with strong live-media evidence but no observable native captions track. Review whether the stream contains auditory information and whether live captions are provided by a custom player or burned into the picture before treating this as a WCAG failure.',
    severity: LIVE_CAPTIONS_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: LIVE_CAPTIONS_RULE.references,
  };
}

function audioDescriptionIssue(evaluation: PrerecordedAudioDescriptionEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: PRERECORDED_AUDIO_DESCRIPTION_RULE.id,
    title: PRERECORDED_AUDIO_DESCRIPTION_RULE.title,
    description: 'FocusTrace observed likely prerecorded synchronized video without an observable native descriptions track or nearby audio-described-version control. Review custom-player descriptions, alternate described versions and the actual visual content before treating this as a WCAG failure.',
    severity: PRERECORDED_AUDIO_DESCRIPTION_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: PRERECORDED_AUDIO_DESCRIPTION_RULE.references,
  };
}

function appendRuleResult(
  result: ScanResult,
  ruleId: string,
  applicable: number,
  passed: number,
  reviews: number,
): void {
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId,
      applicable,
      passed,
      failures: 0,
      reviews,
      warnings: 0,
    },
  ];
  result.passes += passed;
  result.rulesRun += 1;
}

export function appendMediaAccessibilityReviews(result: ScanResult, root: ScanRoot): void {
  const audioEvaluations = evaluatePrerecordedAudioAlternatives(root);
  const audioReviews = audioEvaluations
    .filter((evaluation) => evaluation.outcome === 'review')
    .map(audioIssue);
  const audioPasses = audioEvaluations.filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...audioReviews);
  appendRuleResult(
    result,
    PRERECORDED_AUDIO_ALTERNATIVE_RULE.id,
    audioEvaluations.length,
    audioPasses,
    audioReviews.length,
  );

  const captionEvaluations = evaluatePrerecordedCaptions(root);
  const captionReviews = captionEvaluations
    .filter((evaluation) => evaluation.outcome === 'review')
    .map(captionsIssue);
  const captionPasses = captionEvaluations.filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...captionReviews);
  appendRuleResult(
    result,
    PRERECORDED_CAPTIONS_RULE.id,
    captionEvaluations.length,
    captionPasses,
    captionReviews.length,
  );

  const videoAlternativeEvaluations = evaluatePrerecordedVideoAlternatives(root);
  const videoAlternativeReviews = videoAlternativeEvaluations
    .filter((evaluation) => evaluation.outcome === 'review')
    .map(videoAlternativeIssue);
  const videoAlternativePasses = videoAlternativeEvaluations.filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...videoAlternativeReviews);
  appendRuleResult(
    result,
    PRERECORDED_VIDEO_ALTERNATIVE_RULE.id,
    videoAlternativeEvaluations.length,
    videoAlternativePasses,
    videoAlternativeReviews.length,
  );

  const liveCaptionEvaluations = evaluateLiveCaptions(root);
  const liveCaptionReviews = liveCaptionEvaluations
    .filter((evaluation) => evaluation.outcome === 'review')
    .map(liveCaptionsIssue);
  const liveCaptionPasses = liveCaptionEvaluations.filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...liveCaptionReviews);
  appendRuleResult(
    result,
    LIVE_CAPTIONS_RULE.id,
    liveCaptionEvaluations.length,
    liveCaptionPasses,
    liveCaptionReviews.length,
  );

  const audioDescriptionEvaluations = evaluatePrerecordedAudioDescriptions(root);
  const audioDescriptionReviews = audioDescriptionEvaluations
    .filter((evaluation) => evaluation.outcome === 'review')
    .map(audioDescriptionIssue);
  const audioDescriptionPasses = audioDescriptionEvaluations.filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...audioDescriptionReviews);
  appendRuleResult(
    result,
    PRERECORDED_AUDIO_DESCRIPTION_RULE.id,
    audioDescriptionEvaluations.length,
    audioDescriptionPasses,
    audioDescriptionReviews.length,
  );

  appendFormErrorReviews(result, root);
  appendSpecializedAccessibleNameChecks(result, root);
  appendElementInternalsSemantics(result, root);
  appendAriaRoleStateRelationshipChecks(result, root);
}
