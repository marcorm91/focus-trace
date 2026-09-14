import { accessibleName, isProgrammaticallyHidden, isSequentiallyFocusable, selectorFor } from './dom';
import { scopedElements, type ScanRoot } from './scan-elements';

const TWENTY_HOURS_SECONDS = 72_000;
const THREE_SECONDS_MS = 3_000;
const MAX_ACCESSKEY_ELEMENTS = 2_000;
const MAX_SCROLLABLE_CANDIDATES = 1_000;
const MAX_SCROLLABLE_DESCENDANTS = 2_000;
const MAX_MEDIA_CANDIDATES = 250;
const MAX_REVIEW_SIGNALS = 50;
const CONTROL_SELECTOR = 'button, input[type="button"], input[type="submit"], input[type="reset"], a[href], [role="button"]';

export interface AccesskeyEvaluation {
  element: Element;
  token: string;
  occurrences: number;
  detail: string;
}

export interface MetaRefreshEvaluation {
  element: HTMLMetaElement;
  outcome: 'fail' | 'pass';
  delaySeconds: number;
  detail: string;
}

export interface ScrollableRegionEvaluation {
  element: HTMLElement;
  outcome: 'review' | 'pass';
  horizontalScrollPixels: number;
  verticalScrollPixels: number;
  focusEntry?: Element;
  detail: string;
}

export interface AutoplayAudioEvaluation {
  element: HTMLMediaElement;
  outcome: 'review' | 'pass';
  durationMs: number | null;
  audioPresence: 'native-audio' | 'video-unknown';
  controlSelectors: string[];
  detail: string;
}

function belongsToRoot(root: ScanRoot, element: Element): boolean {
  return root instanceof Document || root === element || root.contains(element);
}

function rendered(element: Element): boolean {
  if (!element.isConnected || isProgrammaticallyHidden(element)) return false;
  let current: Element | null = element;
  while (current) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    const opacity = Number.parseFloat(style.opacity || '1');
    if (Number.isFinite(opacity) && opacity <= 0) return false;
    current = current.parentElement;
  }
  return true;
}

function normalizedAccesskeyTokens(element: Element): string[] {
  const raw = element.getAttribute('accesskey')?.trim();
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .map((token) => token.normalize('NFC').toLocaleLowerCase())
    .filter((token) => Array.from(token).length === 1);
}

export function evaluateAccesskeys(root: ScanRoot = document): AccesskeyEvaluation[] {
  const all = [...document.querySelectorAll('[accesskey]')].slice(0, MAX_ACCESSKEY_ELEMENTS);
  const byToken = new Map<string, Set<Element>>();
  for (const element of all) {
    for (const token of normalizedAccesskeyTokens(element)) {
      const elements = byToken.get(token) ?? new Set<Element>();
      elements.add(element);
      byToken.set(token, elements);
    }
  }

  const evaluations: AccesskeyEvaluation[] = [];
  for (const [token, elements] of byToken) {
    if (elements.size < 2) continue;
    for (const element of elements) {
      if (!belongsToRoot(root, element) || isProgrammaticallyHidden(element)) continue;
      evaluations.push({
        element,
        token,
        occurrences: elements.size,
        detail: `accesskey token ${JSON.stringify(token)} is assigned to ${elements.size} elements in this document. Browser/platform shortcut resolution can therefore be ambiguous.`,
      });
    }
  }
  return evaluations;
}

function parseMetaRefreshDelay(content: string): number | undefined {
  const normalized = content.trim();
  if (!normalized) return undefined;
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:[;,]\s*(?:url\s*=\s*)?.*)?$/i);
  if (!match?.[1]) return undefined;
  const delay = Number.parseFloat(match[1]);
  return Number.isFinite(delay) && delay >= 0 ? delay : undefined;
}

export function evaluateMetaRefresh(document: Document = window.document): MetaRefreshEvaluation[] {
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[http-equiv][content]')]
    .filter((element) => element.getAttribute('http-equiv')?.trim().toLowerCase() === 'refresh');

  for (const element of metas) {
    const delaySeconds = parseMetaRefreshDelay(element.getAttribute('content') ?? '');
    if (delaySeconds == null) continue;
    if (delaySeconds === 0 || delaySeconds > TWENTY_HOURS_SECONDS) {
      return [{
        element,
        outcome: 'pass',
        delaySeconds,
        detail: delaySeconds === 0
          ? 'The first parseable meta refresh uses a zero-second delay, so this bounded WCAG 2.2.1 timing expectation is not violated.'
          : `The first parseable meta refresh uses ${delaySeconds} seconds, which exceeds the 20-hour ACT threshold used by this bounded WCAG 2.2.1 check.`,
      }];
    }
    return [{
      element,
      outcome: 'fail',
      delaySeconds,
      detail: `The first parseable meta refresh uses a ${delaySeconds}-second delay, which is greater than zero and no more than the 20-hour ACT threshold.`,
    }];
  }
  return [];
}

function inert(element: Element): boolean {
  return Boolean(element.closest('[inert]'));
}

function sequentialFocusEntry(element: HTMLElement): Element | undefined {
  if (isSequentiallyFocusable(element)) return element;
  let inspected = 0;
  for (const descendant of element.querySelectorAll('*')) {
    inspected += 1;
    if (inspected > MAX_SCROLLABLE_DESCENDANTS) break;
    if (isSequentiallyFocusable(descendant)) return descendant;
  }
  return undefined;
}

function scrollDistances(element: HTMLElement): { horizontal: number; vertical: number } {
  return {
    horizontal: Math.max(0, element.scrollWidth - element.clientWidth),
    vertical: Math.max(0, element.scrollHeight - element.clientHeight),
  };
}

export function evaluateScrollableRegions(root: ScanRoot = document): ScrollableRegionEvaluation[] {
  const evaluations: ScrollableRegionEvaluation[] = [];
  let reviews = 0;
  const candidates = scopedElements<HTMLElement>(root, '*').slice(0, MAX_SCROLLABLE_CANDIDATES);

  for (const element of candidates) {
    if (element instanceof HTMLIFrameElement || !rendered(element)) continue;
    const style = getComputedStyle(element);
    const overflowX = style.overflowX || style.overflow;
    const overflowY = style.overflowY || style.overflow;
    const xScrollable = /^(auto|scroll)$/.test(overflowX);
    const yScrollable = /^(auto|scroll)$/.test(overflowY);
    if (!xScrollable && !yScrollable) continue;

    const distances = scrollDistances(element);
    const horizontal = xScrollable ? distances.horizontal : 0;
    const vertical = yScrollable ? distances.vertical : 0;
    if (horizontal <= 1 && vertical <= 1) continue;

    if (inert(element)) {
      evaluations.push({
        element,
        outcome: 'pass',
        horizontalScrollPixels: horizontal,
        verticalScrollPixels: vertical,
        detail: 'The scrollable region is inside an inert subtree and is excluded from sequential interaction for this bounded keyboard expectation.',
      });
      continue;
    }

    const focusEntry = sequentialFocusEntry(element);
    if (focusEntry) {
      evaluations.push({
        element,
        outcome: 'pass',
        horizontalScrollPixels: horizontal,
        verticalScrollPixels: vertical,
        focusEntry,
        detail: `Scrollable region exposes a sequentially focusable entry point at ${selectorFor(focusEntry)}.`,
      });
      continue;
    }

    reviews += 1;
    if (reviews > MAX_REVIEW_SIGNALS) continue;
    evaluations.push({
      element,
      outcome: 'review',
      horizontalScrollPixels: horizontal,
      verticalScrollPixels: vertical,
      detail: `The region scrolls ${horizontal}px horizontally and ${vertical}px vertically but no sequentially focusable element was observed inside it. Review keyboard scrolling, browser behavior, decorative applicability and any external scroll controls.`,
    });
  }
  return evaluations;
}

function relatedControlSelectors(root: ScanRoot, media: HTMLMediaElement): string[] {
  if (!media.id) return [];
  const selectors: string[] = [];
  for (const candidate of scopedElements(root, CONTROL_SELECTOR).slice(0, 2_000)) {
    const controlled = candidate.getAttribute('aria-controls')?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (!controlled.includes(media.id) || !rendered(candidate)) continue;
    try {
      if (!accessibleName(candidate).trim()) continue;
    } catch {
      continue;
    }
    selectors.push(selectorFor(candidate));
    if (selectors.length >= 5) break;
  }
  return selectors;
}

function hasMediaSource(media: HTMLMediaElement): boolean {
  const extended = media as HTMLMediaElement & { srcObject?: unknown };
  return Boolean(extended.srcObject || media.currentSrc || media.getAttribute('src')?.trim() || media.querySelector('source[src]'));
}

export function evaluateAutoplayAudio(root: ScanRoot = document): AutoplayAudioEvaluation[] {
  const evaluations: AutoplayAudioEvaluation[] = [];
  let reviews = 0;
  const media = scopedElements<HTMLMediaElement>(root, 'audio[autoplay], video[autoplay]').slice(0, MAX_MEDIA_CANDIDATES);

  for (const element of media) {
    if (!hasMediaSource(element) || !rendered(element)) continue;
    if (element.muted || element.volume === 0) continue;

    const durationMs = Number.isFinite(element.duration) && element.duration >= 0
      ? Math.round(element.duration * 1_000)
      : null;
    const audioPresence: AutoplayAudioEvaluation['audioPresence'] = element instanceof HTMLAudioElement
      ? 'native-audio'
      : 'video-unknown';
    const controls = relatedControlSelectors(root, element);

    if (durationMs != null && durationMs <= THREE_SECONDS_MS) {
      evaluations.push({
        element,
        outcome: 'pass',
        durationMs,
        audioPresence,
        controlSelectors: controls,
        detail: `The autoplay media duration is ${durationMs} ms, no more than the three-second WCAG 1.4.2 threshold.`,
      });
      continue;
    }

    if (element.controls) {
      evaluations.push({
        element,
        outcome: 'pass',
        durationMs,
        audioPresence,
        controlSelectors: controls,
        detail: 'The autoplay media exposes native media controls that include a stop/pause and volume mechanism for this bounded observable expectation.',
      });
      continue;
    }

    reviews += 1;
    if (reviews > MAX_REVIEW_SIGNALS) continue;
    const duration = durationMs == null ? 'an unresolved duration' : `${durationMs} ms`;
    evaluations.push({
      element,
      outcome: 'review',
      durationMs,
      audioPresence,
      controlSelectors: controls,
      detail: `${element.tagName.toLowerCase()} declares autoplay, is not muted and has ${duration}. ${audioPresence === 'video-unknown' ? 'Whether this video contains an audible track cannot be proven from this DOM evidence. ' : ''}${controls.length ? `Related control candidate(s): ${controls.join(', ')}; verify that they stop or mute the audio independently of system volume.` : 'No native controls or explicitly related named stop/mute control candidate was observed.'} Review actual autoplay behavior and audio duration before treating this as a failure.`,
    });
  }
  return evaluations;
}
