import {
  ACCESSKEY_UNIQUENESS_RULE,
  AUTOPLAY_AUDIO_REVIEW_RULE,
  META_REFRESH_TIMING_RULE,
  SCROLLABLE_REGION_KEYBOARD_RULE,
} from '../../shared/keyboard-navigation-motion-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import {
  evaluateAccesskeys,
  evaluateAutoplayAudio,
  evaluateMetaRefresh,
  evaluateScrollableRegions,
  type AccesskeyEvaluation,
  type AutoplayAudioEvaluation,
  type MetaRefreshEvaluation,
  type ScrollableRegionEvaluation,
} from './keyboard-navigation-motion';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
type ScanRoot = Document | Element;

function accesskeyIssue(evaluation: AccesskeyEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: ACCESSKEY_UNIQUENESS_RULE.id,
    title: ACCESSKEY_UNIQUENESS_RULE.title,
    description: 'The same valid accesskey token is assigned to multiple elements in this document. Review and remove the collision so the browser/platform shortcut does not resolve ambiguously.',
    severity: ACCESSKEY_UNIQUENESS_RULE.severity,
    outcome: 'warning',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: ACCESSKEY_UNIQUENESS_RULE.references,
  };
}

function metaRefreshIssue(evaluation: MetaRefreshEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: META_REFRESH_TIMING_RULE.id,
    title: META_REFRESH_TIMING_RULE.title,
    description: 'The first parseable meta refresh imposes a delayed automatic refresh or redirect inside the bounded WCAG 2.2.1 timing window implemented by FocusTrace.',
    severity: META_REFRESH_TIMING_RULE.severity,
    outcome: 'fail',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: META_REFRESH_TIMING_RULE.references,
  };
}

function scrollableIssue(evaluation: ScrollableRegionEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: SCROLLABLE_REGION_KEYBOARD_RULE.id,
    title: SCROLLABLE_REGION_KEYBOARD_RULE.title,
    description: 'FocusTrace observed a rendered scrollable region without a sequentially focusable entry point. Review whether keyboard users can place focus in the region and scroll all required content, or whether another accessible mechanism provides the same function.',
    severity: SCROLLABLE_REGION_KEYBOARD_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: SCROLLABLE_REGION_KEYBOARD_RULE.references,
  };
}

function autoplayAudioIssue(evaluation: AutoplayAudioEvaluation): ScanIssue {
  return {
    id: uid(),
    ruleId: AUTOPLAY_AUDIO_REVIEW_RULE.id,
    title: AUTOPLAY_AUDIO_REVIEW_RULE.title,
    description: 'FocusTrace observed unmuted media that declares autoplay and may continue for more than three seconds without an observable native stop/mute mechanism. Review actual playback, audio-track presence and any custom control before treating this as a WCAG failure.',
    severity: AUTOPLAY_AUDIO_REVIEW_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: AUTOPLAY_AUDIO_REVIEW_RULE.references,
  };
}

function appendFindingOnlyRule(result: ScanResult, ruleId: string, warnings: number): void {
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId,
      applicable: warnings,
      passed: 0,
      failures: 0,
      reviews: 0,
      warnings,
      coverage: 'findings-only',
    },
  ];
  result.rulesRun += 1;
}

function appendMeasuredRule(
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

export function appendKeyboardNavigationMotionChecks(result: ScanResult, root: ScanRoot): void {
  const accesskeys = evaluateAccesskeys(root);
  const accesskeyWarnings = accesskeys.map(accesskeyIssue);
  result.warnings.push(...accesskeyWarnings);
  appendFindingOnlyRule(result, ACCESSKEY_UNIQUENESS_RULE.id, accesskeyWarnings.length);

  if (root instanceof Document) {
    const refresh = evaluateMetaRefresh(root);
    const refreshFailures = refresh.filter((entry) => entry.outcome === 'fail');
    const refreshPasses = refresh.filter((entry) => entry.outcome === 'pass');
    result.issues.push(...refreshFailures.map(metaRefreshIssue));
    appendMeasuredRule(
      result,
      META_REFRESH_TIMING_RULE.id,
      refresh.length,
      refreshPasses.length,
      refreshFailures.length,
      0,
    );
  }

  const scrollable = evaluateScrollableRegions(root);
  const scrollReviews = scrollable.filter((entry) => entry.outcome === 'review');
  const scrollPasses = scrollable.filter((entry) => entry.outcome === 'pass');
  result.review.push(...scrollReviews.map(scrollableIssue));
  appendMeasuredRule(
    result,
    SCROLLABLE_REGION_KEYBOARD_RULE.id,
    scrollable.length,
    scrollPasses.length,
    0,
    scrollReviews.length,
  );

  const autoplayAudio = evaluateAutoplayAudio(root);
  const audioReviews = autoplayAudio.filter((entry) => entry.outcome === 'review');
  const audioPasses = autoplayAudio.filter((entry) => entry.outcome === 'pass');
  result.review.push(...audioReviews.map(autoplayAudioIssue));
  appendMeasuredRule(
    result,
    AUTOPLAY_AUDIO_REVIEW_RULE.id,
    autoplayAudio.length,
    audioPasses.length,
    0,
    audioReviews.length,
  );
}
