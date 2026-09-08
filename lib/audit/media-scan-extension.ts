import {
  PRERECORDED_AUDIO_ALTERNATIVE_RULE,
  PRERECORDED_CAPTIONS_RULE,
} from '../../shared/media-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import {
  evaluatePrerecordedAudioAlternatives,
  evaluatePrerecordedCaptions,
  type PrerecordedAudioAlternativeEvaluation,
  type PrerecordedCaptionEvaluation,
} from './media-alternatives';

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

export function appendMediaAccessibilityReviews(result: ScanResult, root: ScanRoot): void {
  const audioEvaluations = evaluatePrerecordedAudioAlternatives(root);
  const audioReviews = audioEvaluations
    .filter((evaluation) => evaluation.outcome === 'review')
    .map(audioIssue);
  const audioPasses = audioEvaluations.filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...audioReviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: PRERECORDED_AUDIO_ALTERNATIVE_RULE.id,
      applicable: audioEvaluations.length,
      passed: audioPasses,
      failures: 0,
      reviews: audioReviews.length,
      warnings: 0,
    },
  ];
  result.passes += audioPasses;
  result.rulesRun += 1;

  const captionEvaluations = evaluatePrerecordedCaptions(root);
  const captionReviews = captionEvaluations
    .filter((evaluation) => evaluation.outcome === 'review')
    .map(captionsIssue);
  const captionPasses = captionEvaluations.filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...captionReviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: PRERECORDED_CAPTIONS_RULE.id,
      applicable: captionEvaluations.length,
      passed: captionPasses,
      failures: 0,
      reviews: captionReviews.length,
      warnings: 0,
    },
  ];
  result.passes += captionPasses;
  result.rulesRun += 1;
}
