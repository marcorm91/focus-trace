import type { PauseStopHideEvidence } from '../../shared/types';
import { accessibleName, isProgrammaticallyHidden, selectorFor } from './dom';
import { scopedElements, type ScanRoot } from './scan-elements';

const FIVE_SECONDS_MS = 5_000;
const MAX_ANIMATIONS = 1_000;
const MAX_MARKQUEES = 250;
const MAX_AUTOPLAY_VIDEOS = 250;
const MAX_PARALLEL_CONTENT_CANDIDATES = 2_000;
const MAX_CONTROL_CANDIDATES = 2_000;
const MAX_REVIEW_SIGNALS = 50;
const CONTROL_SELECTOR = 'button, input[type="button"], input[type="submit"], input[type="reset"], a[href], [role="button"]';
const PARALLEL_CONTENT_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, dd, dt, blockquote, figcaption, a[href], button, input, select, textarea, img, svg, canvas, video';
const KEYFRAME_METADATA = new Set(['offset', 'computedOffset', 'easing', 'composite']);

interface InspectableEffect extends AnimationEffect {
  target?: Element | null;
  getKeyframes?: () => Array<Record<string, unknown>>;
}

interface EvaluationCache {
  rendered: WeakMap<Element, boolean>;
  controls?: Element[];
  parallelContent?: Element[];
}

export interface PauseStopHideEvaluation {
  status: 'pass' | 'review';
  element: Element;
  detail?: string;
  evidence?: PauseStopHideEvidence;
}

function belongsToRoot(root: ScanRoot, element: Element): boolean {
  return root instanceof Document || root === element || root.contains(element);
}

function focusTraceOwned(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (current.getAttributeNames().some((name) => name.startsWith('data-focustrace-'))) return true;
    current = current.parentElement;
  }
  return false;
}

function rendered(element: Element, cache: EvaluationCache): boolean {
  const cached = cache.rendered.get(element);
  if (cached !== undefined) return cached;
  if (!element.isConnected || isProgrammaticallyHidden(element) || focusTraceOwned(element)) {
    cache.rendered.set(element, false);
    return false;
  }

  let current: Element | null = element;
  while (current) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
      cache.rendered.set(element, false);
      return false;
    }
    if (style.getPropertyValue('content-visibility') === 'hidden') {
      cache.rendered.set(element, false);
      return false;
    }
    const opacity = Number.parseFloat(style.opacity || '1');
    if (Number.isFinite(opacity) && opacity <= 0) {
      cache.rendered.set(element, false);
      return false;
    }
    current = current.parentElement;
  }

  const rect = element.getBoundingClientRect();
  const result = rect.width > 1 && rect.height > 1;
  cache.rendered.set(element, result);
  return result;
}

function hasMeaningfulText(element: Element): boolean {
  return /[0-9A-Za-z\u00c0-\uffff]/.test((element.textContent ?? '').replace(/\s+/g, ' ').trim());
}

function hasDirectTextOutsideTarget(target: Element): boolean {
  const parent = target.parentElement;
  if (!parent) return false;
  return [...parent.childNodes].some((node) =>
    node !== target
    && node.nodeType === Node.TEXT_NODE
    && /[0-9A-Za-z\u00c0-\uffff]/.test(node.textContent ?? ''));
}

function hasParallelContent(root: ScanRoot, target: Element, cache: EvaluationCache): boolean {
  if (hasDirectTextOutsideTarget(target)) return true;
  cache.parallelContent ??= scopedElements(root, PARALLEL_CONTENT_SELECTOR).slice(0, MAX_PARALLEL_CONTENT_CANDIDATES);
  return cache.parallelContent.some((candidate) => {
    if (candidate === target || target.contains(candidate) || candidate.contains(target)) return false;
    if (!rendered(candidate, cache)) return false;
    if (candidate.matches('img, svg, canvas, video, input, select, textarea, button, a[href]')) return true;
    return hasMeaningfulText(candidate);
  });
}

function controlCandidates(root: ScanRoot, target: Element, cache: EvaluationCache): string[] {
  if (!target.id) return [];
  cache.controls ??= scopedElements(root, CONTROL_SELECTOR).slice(0, MAX_CONTROL_CANDIDATES);
  const selectors: string[] = [];
  for (const candidate of cache.controls) {
    const controls = candidate.getAttribute('aria-controls')?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (!controls.includes(target.id) || !rendered(candidate, cache)) continue;
    let name = '';
    try {
      name = accessibleName(candidate).replace(/\s+/g, ' ').trim();
    } catch {
      continue;
    }
    if (!name) continue;
    selectors.push(selectorFor(candidate));
    if (selectors.length >= 5) break;
  }
  return selectors;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function activeDuration(animation: Animation, effect: InspectableEffect): number | undefined {
  try {
    const computed = effect.getComputedTiming();
    const duration = numberValue(computed.activeDuration);
    if (duration !== undefined) return duration;
  } catch {
    // A detached or custom effect may stop exposing timing while the scan runs.
  }

  try {
    const timing = effect.getTiming();
    const duration = numberValue(timing.duration);
    const iterations = numberValue(timing.iterations) ?? 1;
    if (duration !== undefined) return duration * iterations;
  } catch {
    // Leave the duration unresolved and preserve the candidate as REVIEW.
  }

  if (animation.playState === 'finished') return 0;
  return undefined;
}

function changedKeyframeProperties(effect: InspectableEffect): string[] {
  if (typeof effect.getKeyframes !== 'function') return [];
  let keyframes: Array<Record<string, unknown>>;
  try {
    keyframes = effect.getKeyframes();
  } catch {
    return [];
  }

  const values = new Map<string, Set<string>>();
  for (const keyframe of keyframes) {
    for (const [property, value] of Object.entries(keyframe)) {
      if (KEYFRAME_METADATA.has(property) || value == null) continue;
      const propertyValues = values.get(property) ?? new Set<string>();
      propertyValues.add(String(value));
      values.set(property, propertyValues);
    }
  }
  return [...values]
    .filter(([, propertyValues]) => propertyValues.size > 1)
    .map(([property]) => property)
    .sort()
    .slice(0, 12);
}

function animationName(animation: Animation): string | undefined {
  const candidate = animation as Animation & { animationName?: string; transitionProperty?: string };
  return candidate.animationName?.trim() || candidate.transitionProperty?.trim() || undefined;
}

function animationEvaluations(root: ScanRoot, cache: EvaluationCache): PauseStopHideEvaluation[] {
  if (typeof document.getAnimations !== 'function') return [];
  let animations: Animation[];
  try {
    animations = document.getAnimations().slice(0, MAX_ANIMATIONS);
  } catch {
    return [];
  }

  const byTarget = new Map<Element, { names: Set<string>; properties: Set<string>; duration?: number }>();
  for (const animation of animations) {
    if (animation.playState !== 'running') continue;
    if (animation.playbackRate === 0) continue;
    const effect = animation.effect as InspectableEffect | null;
    const target = effect?.target;
    if (!effect || !(target instanceof Element) || !belongsToRoot(root, target) || !rendered(target, cache)) continue;
    const properties = changedKeyframeProperties(effect);
    if (!properties.length) continue;

    const duration = activeDuration(animation, effect);
    const current = byTarget.get(target) ?? { names: new Set<string>(), properties: new Set<string>() };
    const name = animationName(animation);
    if (name) current.names.add(name);
    for (const property of properties) current.properties.add(property);
    if (duration !== undefined && (current.duration === undefined || duration > current.duration)) current.duration = duration;
    byTarget.set(target, current);
  }

  const evaluations: PauseStopHideEvaluation[] = [];
  for (const [element, animation] of byTarget) {
    if (!hasParallelContent(root, element, cache)) continue;
    if (animation.duration !== undefined && animation.duration <= FIVE_SECONDS_MS) {
      evaluations.push({ status: 'pass', element });
      continue;
    }

    const controls = controlCandidates(root, element, cache);
    const repeatsIndefinitely = animation.duration === Number.POSITIVE_INFINITY;
    const durationMs = animation.duration !== undefined && Number.isFinite(animation.duration)
      ? Math.round(animation.duration)
      : null;
    const evidence: PauseStopHideEvidence = {
      kind: 'moving-or-blinking',
      source: 'web-animation',
      automaticStart: 'unknown',
      parallelContent: 'observed',
      durationMs,
      thresholdMs: FIVE_SECONDS_MS,
      repeatsIndefinitely,
      animatedProperties: [...animation.properties],
      animationNames: [...animation.names],
      controlMechanism: controls.length ? 'candidate-observed' : 'none-observed',
      controlSelectors: controls,
    };
    const target = selectorFor(element);
    const duration = repeatsIndefinitely ? 'indefinitely' : durationMs == null ? 'for an unresolved duration' : `for ${durationMs} ms`;
    evaluations.push({
      status: 'review',
      element,
      evidence,
      detail: `${target} has a running Web Animation that changes ${evidence.animatedProperties.join(', ')} ${duration} while other content is present. ${controls.length ? `Explicit control candidate(s): ${controls.join(', ')}; activate them and verify that motion remains paused until the user resumes it.` : 'No rendered control with an accessible name and aria-controls relationship to the target was observed.'} Confirm that the motion starts automatically, lasts more than five seconds and is not essential before treating this as a failure.`,
    });
  }
  return evaluations;
}

function marqueeEvaluations(root: ScanRoot, cache: EvaluationCache): PauseStopHideEvaluation[] {
  const evaluations: PauseStopHideEvaluation[] = [];
  for (const element of scopedElements<HTMLElement>(root, 'marquee').slice(0, MAX_MARKQUEES)) {
    if (!rendered(element, cache) || !hasParallelContent(root, element, cache)) continue;
    const controls = controlCandidates(root, element, cache);
    const loop = Number.parseInt(element.getAttribute('loop') ?? '-1', 10);
    const evidence: PauseStopHideEvidence = {
      kind: 'moving-or-scrolling',
      source: 'marquee',
      automaticStart: 'declared',
      parallelContent: 'observed',
      durationMs: null,
      thresholdMs: FIVE_SECONDS_MS,
      repeatsIndefinitely: !Number.isFinite(loop) || loop <= 0,
      animatedProperties: [],
      animationNames: [],
      controlMechanism: controls.length ? 'candidate-observed' : 'none-observed',
      controlSelectors: controls,
    };
    const target = selectorFor(element);
    evaluations.push({
      status: 'review',
      element,
      evidence,
      detail: `${target} is rendered as automatically scrolling marquee content while other content is present; its total movement duration could not be resolved safely. ${controls.length ? `Explicit control candidate(s): ${controls.join(', ')}; activate them and verify pause and restart behavior.` : 'No rendered control with an accessible name and aria-controls relationship to the target was observed.'} Confirm that movement lasts more than five seconds and is not essential before treating this as a failure.`,
    });
  }
  return evaluations;
}

function hasMediaSource(video: HTMLVideoElement): boolean {
  const extended = video as HTMLVideoElement & { srcObject?: unknown };
  return Boolean(extended.srcObject || video.currentSrc || video.getAttribute('src')?.trim() || video.querySelector('source[src]'));
}

function autoplayVideoEvaluations(root: ScanRoot, cache: EvaluationCache): PauseStopHideEvaluation[] {
  const evaluations: PauseStopHideEvaluation[] = [];
  for (const video of scopedElements<HTMLVideoElement>(root, 'video[autoplay]').slice(0, MAX_AUTOPLAY_VIDEOS)) {
    if (!hasMediaSource(video) || !rendered(video, cache) || !hasParallelContent(root, video, cache)) continue;
    if (video.controls) {
      evaluations.push({ status: 'pass', element: video });
      continue;
    }

    const finiteDurationMs = Number.isFinite(video.duration) && video.duration > 0
      ? Math.round(video.duration * 1_000)
      : undefined;
    if (!video.loop && finiteDurationMs !== undefined && finiteDurationMs <= FIVE_SECONDS_MS) {
      evaluations.push({ status: 'pass', element: video });
      continue;
    }

    const controls = controlCandidates(root, video, cache);
    const evidence: PauseStopHideEvidence = {
      kind: 'moving-or-blinking',
      source: 'autoplay-video',
      automaticStart: !video.paused && !video.ended ? 'observed' : 'declared',
      parallelContent: 'observed',
      durationMs: video.loop ? null : finiteDurationMs ?? null,
      thresholdMs: FIVE_SECONDS_MS,
      repeatsIndefinitely: video.loop,
      animatedProperties: [],
      animationNames: [],
      controlMechanism: controls.length ? 'candidate-observed' : 'none-observed',
      controlSelectors: controls,
    };
    const target = selectorFor(video);
    evaluations.push({
      status: 'review',
      element: video,
      evidence,
      detail: `${target} declares autoplay without native media controls while other content is present${video.loop ? ' and repeats' : finiteDurationMs ? ` for ${finiteDurationMs} ms` : '; its duration is unresolved'}. ${controls.length ? `Explicit control candidate(s): ${controls.join(', ')}; activate them and verify pause, stop or hide behavior.` : 'No rendered control with an accessible name and aria-controls relationship to the video was observed.'} Confirm actual automatic playback, meaningful motion and essentiality before treating this as a failure.`,
    });
  }
  return evaluations;
}

export function evaluatePauseStopHide(root: ScanRoot = document): PauseStopHideEvaluation[] {
  const cache: EvaluationCache = { rendered: new WeakMap() };
  const evaluations = [
    ...animationEvaluations(root, cache),
    ...marqueeEvaluations(root, cache),
    ...autoplayVideoEvaluations(root, cache),
  ];
  let reviews = 0;
  return evaluations.filter((evaluation) => {
    if (evaluation.status === 'pass') return true;
    reviews += 1;
    return reviews <= MAX_REVIEW_SIGNALS;
  });
}
