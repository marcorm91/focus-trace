import type {
  TextResizeAssessment,
  TextResizeBaseline,
  TextResizeContext,
  TextResizeEvidence,
  TextResizeRectSnapshot,
  TextResizeSubjectKind,
  TextResizeSubjectSnapshot,
} from '../../shared/types';
import { accessibleName, selectorFor } from './dom';
import { scopedElements } from './scan-elements';

const BASELINE_ZOOM = 1;
const TARGET_ZOOM = 2;
const ZOOM_TOLERANCE = 0.05;
const SCALE_TOLERANCE = 0.1;
const GEOMETRY_TOLERANCE = 2;
const MAX_EVALUATED_ELEMENTS = 5_000;
const MAX_SUBJECTS = 1_000;
const MAX_SIGNALS = 30;
const MAX_OVERLAP_SUBJECTS = 400;
const MAX_LABEL_LENGTH = 120;
const DOCUMENT_TOKEN = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const NON_CONTENT_TAGS = new Set([
  'head', 'meta', 'link', 'style', 'script', 'template', 'noscript', 'br', 'wbr',
  'img', 'picture', 'source', 'track', 'video', 'audio', 'canvas', 'svg', 'iframe',
  'object', 'embed',
]);

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="searchbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
].join(',');

interface InternalSnapshot {
  baseline: TextResizeBaseline;
  elements: Map<string, Element>;
  cache: CaptureCache;
}

interface CaptureCache {
  styles: WeakMap<Element, CSSStyleDeclaration>;
  exposed: WeakMap<Element, boolean>;
  transformed: WeakMap<Element, boolean>;
}

export interface TextResizeSignal {
  selector: string;
  currentElement?: Element;
  detail: string;
  evidence: TextResizeEvidence;
}

export interface TextResizeEvaluation {
  assessment: TextResizeAssessment;
  signals: TextResizeSignal[];
}

function near(value: number, target: number): boolean {
  return Math.abs(value - target) <= ZOOM_TOLERANCE;
}

function finitePositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function compactText(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= MAX_LABEL_LENGTH
    ? compact
    : `${compact.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`;
}

function normalizedSignature(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 240);
}

function directText(element: Element): string {
  return [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function styleFor(element: Element, cache: CaptureCache): CSSStyleDeclaration {
  const cached = cache.styles.get(element);
  if (cached) return cached;
  const style = getComputedStyle(element);
  cache.styles.set(element, style);
  return style;
}

function styleExposed(element: Element, cache: CaptureCache): boolean {
  const cached = cache.exposed.get(element);
  if (cached != null) return cached;
  const style = styleFor(element, cache);
  const exposed = style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.visibility !== 'collapse'
    && style.getPropertyValue('content-visibility') !== 'hidden'
    && Number.parseFloat(style.opacity || '1') !== 0
    && (!element.parentElement || styleExposed(element.parentElement, cache));
  cache.exposed.set(element, exposed);
  return exposed;
}

function rendered(element: Element, cache: CaptureCache): boolean {
  if (!element.isConnected || NON_CONTENT_TAGS.has(element.tagName.toLowerCase())) return false;
  if (!styleExposed(element, cache)) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > GEOMETRY_TOLERANCE && rect.height > GEOMETRY_TOLERANCE;
}

function hasRenderedDisclosureCandidate(element: Element, document: Document, cache: CaptureCache): boolean {
  let region: Element | null = element;
  while (region) {
    if (region instanceof HTMLDetailsElement) {
      const summary = [...region.children].find((child) => child instanceof HTMLElement && child.tagName === 'SUMMARY');
      if (summary && rendered(summary, cache) && accessibleName(summary).trim()) return true;
    }
    if (region.id) {
      for (const candidate of scopedElements(document, '[aria-controls]')) {
        const controlledIds = (candidate.getAttribute('aria-controls') ?? '').trim().split(/\s+/).filter(Boolean);
        if (controlledIds.includes(region.id) && rendered(candidate, cache) && accessibleName(candidate).trim()) return true;
      }
    }
    region = region.parentElement;
  }
  return false;
}

function subjectKind(element: Element): TextResizeSubjectKind | undefined {
  if (element.matches(INTERACTIVE_SELECTOR)) return 'control';
  return directText(element) ? 'text' : undefined;
}

function subjectLabel(element: Element, kind: TextResizeSubjectKind): { label: string; accessibleName?: string } {
  if (kind === 'control') {
    const name = compactText(accessibleName(element));
    const visible = compactText(directText(element));
    return {
      label: name || visible || element.tagName.toLowerCase(),
      ...(name ? { accessibleName: name } : {}),
    };
  }
  return { label: compactText(directText(element)) };
}

function rectSnapshot(element: Element): TextResizeRectSnapshot {
  const rect = element.getBoundingClientRect();
  return {
    left: rounded(rect.left + window.scrollX),
    top: rounded(rect.top + window.scrollY),
    width: rounded(rect.width),
    height: rounded(rect.height),
  };
}

function effectiveOverflow(style: CSSStyleDeclaration, axis: 'x' | 'y'): string {
  const axisValue = (axis === 'x' ? style.overflowX : style.overflowY).trim().toLowerCase();
  const shorthand = style.overflow.trim().toLowerCase();
  if ((!axisValue || axisValue === 'visible') && (shorthand === 'hidden' || shorthand === 'clip')) return shorthand;
  return axisValue || shorthand || 'visible';
}

function clipsOverflow(value: string): boolean {
  return value === 'hidden' || value === 'clip';
}

function clippingAncestor(element: Element, cache: CaptureCache): string | undefined {
  let current: Element | null = element;
  const targetRect = element.getBoundingClientRect();
  while (current) {
    const style = styleFor(current, cache);
    const overflowX = effectiveOverflow(style, 'x');
    const overflowY = effectiveOverflow(style, 'y');
    if (clipsOverflow(overflowX) || clipsOverflow(overflowY)) {
      const rect = current.getBoundingClientRect();
      const ownHorizontalLoss = current === element
        && clipsOverflow(overflowX)
        && finitePositive(current.scrollWidth) > finitePositive(current.clientWidth) + GEOMETRY_TOLERANCE;
      const ownVerticalLoss = current === element
        && clipsOverflow(overflowY)
        && finitePositive(current.scrollHeight) > finitePositive(current.clientHeight) + GEOMETRY_TOLERANCE;
      const ancestorHorizontalLoss = current !== element
        && clipsOverflow(overflowX)
        && (targetRect.left < rect.left - GEOMETRY_TOLERANCE || targetRect.right > rect.right + GEOMETRY_TOLERANCE);
      const ancestorVerticalLoss = current !== element
        && clipsOverflow(overflowY)
        && (targetRect.top < rect.top - GEOMETRY_TOLERANCE || targetRect.bottom > rect.bottom + GEOMETRY_TOLERANCE);
      if (ownHorizontalLoss || ownVerticalLoss || ancestorHorizontalLoss || ancestorVerticalLoss) {
        return selectorFor(current);
      }
    }
    current = current.parentElement;
  }
  return undefined;
}

function hasTransform(element: Element, cache: CaptureCache): boolean {
  const cached = cache.transformed.get(element);
  if (cached != null) return cached;
  const transform = styleFor(element, cache).transform.trim();
  const transformed = Boolean(transform && transform !== 'none')
    || Boolean(element.parentElement && hasTransform(element.parentElement, cache));
  cache.transformed.set(element, transformed);
  return transformed;
}

function entryFor(element: Element, cache: CaptureCache): TextResizeSubjectSnapshot | undefined {
  if (!rendered(element, cache)) return undefined;
  const kind = subjectKind(element);
  if (!kind) return undefined;
  const text = subjectLabel(element, kind);
  const signatureValue = text.accessibleName || text.label;
  if (!signatureValue) return undefined;
  const fontSizePx = Number.parseFloat(styleFor(element, cache).fontSize);
  const clippedBy = clippingAncestor(element, cache);
  return {
    selector: selectorFor(element),
    kind,
    signature: `${kind}:${normalizedSignature(signatureValue)}`,
    label: text.label,
    ...(text.accessibleName ? { accessibleName: text.accessibleName } : {}),
    fontSizePx: rounded(finitePositive(fontSizePx)),
    transformed: hasTransform(element, cache),
    rect: rectSnapshot(element),
    ...(clippedBy ? { clippedBy } : {}),
  };
}

function captureInternal(document: Document, zoomFactor: number): InternalSnapshot {
  const subjects: TextResizeSubjectSnapshot[] = [];
  const elements = new Map<string, Element>();
  const cache: CaptureCache = {
    styles: new WeakMap(),
    exposed: new WeakMap(),
    transformed: new WeakMap(),
  };
  const candidates = scopedElements(document, '*').slice(0, MAX_EVALUATED_ELEMENTS);
  for (const element of candidates) {
    if (subjects.length >= MAX_SUBJECTS) break;
    const entry = entryFor(element, cache);
    if (!entry || elements.has(entry.selector)) continue;
    subjects.push(entry);
    elements.set(entry.selector, element);
  }
  return {
    baseline: {
      version: 1,
      documentToken: DOCUMENT_TOKEN,
      url: document.URL,
      capturedAt: Date.now(),
      zoomFactor: rounded(zoomFactor),
      viewportWidth: Math.round(window.innerWidth),
      viewportHeight: Math.round(window.innerHeight),
      subjects,
      truncated: candidates.length >= MAX_EVALUATED_ELEMENTS || subjects.length >= MAX_SUBJECTS,
    },
    elements,
    cache,
  };
}

export function captureTextResizeBaseline(
  zoomFactor: number,
  document: Document = window.document,
): TextResizeBaseline {
  return captureInternal(document, zoomFactor).baseline;
}

function comparableDocumentUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!/^#!?\//.test(url.hash)) url.hash = '';
    return url.href;
  } catch {
    return value;
  }
}

function rectIntersection(first: TextResizeRectSnapshot, second: TextResizeRectSnapshot): number {
  const width = Math.max(0, Math.min(first.left + first.width, second.left + second.width) - Math.max(first.left, second.left));
  const height = Math.max(0, Math.min(first.top + first.height, second.top + second.height) - Math.max(first.top, second.top));
  return width * height;
}

function meaningfullyOverlaps(first: TextResizeRectSnapshot, second: TextResizeRectSnapshot): boolean {
  const intersection = rectIntersection(first, second);
  const smallerArea = Math.min(first.width * first.height, second.width * second.height);
  return intersection > 12 && smallerArea > 0 && intersection / smallerArea >= 0.1;
}

function signal(
  kind: TextResizeEvidence['kind'],
  baseline: TextResizeSubjectSnapshot,
  context: Required<Pick<TextResizeContext, 'zoomFactor' | 'baseline'>>,
  detail: string,
  current?: TextResizeSubjectSnapshot,
  currentElement?: Element,
  additions: Partial<TextResizeEvidence> = {},
): TextResizeSignal {
  return {
    selector: baseline.selector,
    ...(currentElement ? { currentElement } : {}),
    detail,
    evidence: {
      kind,
      baselineZoomFactor: context.baseline.zoomFactor,
      currentZoomFactor: context.zoomFactor,
      requiredScale: 2,
      baselineRect: baseline.rect,
      ...(current ? { currentRect: current.rect } : {}),
      label: baseline.label,
      ...additions,
    },
  };
}

export function evaluateResizeText(
  context: TextResizeContext | undefined,
  document: Document = window.document,
): TextResizeEvaluation {
  const zoomFactor = context?.zoomFactor;
  if (zoomFactor == null || !Number.isFinite(zoomFactor)) {
    return { assessment: { phase: 'zoom-unavailable', requiredZoomFactor: 2 }, signals: [] };
  }

  if (near(zoomFactor, BASELINE_ZOOM)) {
    return {
      assessment: {
        phase: context?.baseline ? 'baseline-captured' : 'baseline-required',
        currentZoomFactor: rounded(zoomFactor),
        requiredZoomFactor: 2,
        ...(context?.baseline ? {
          baselineZoomFactor: context.baseline.zoomFactor,
          baselineCapturedAt: context.baseline.capturedAt,
          subjectsCaptured: context.baseline.subjects.length,
          truncated: context.baseline.truncated,
        } : {}),
      },
      signals: [],
    };
  }

  if (!near(zoomFactor, TARGET_ZOOM)) {
    return {
      assessment: {
        phase: 'target-zoom-required',
        currentZoomFactor: rounded(zoomFactor),
        requiredZoomFactor: 2,
        ...(context?.baseline ? {
          baselineZoomFactor: context.baseline.zoomFactor,
          baselineCapturedAt: context.baseline.capturedAt,
          subjectsCaptured: context.baseline.subjects.length,
          truncated: context.baseline.truncated,
        } : {}),
      },
      signals: [],
    };
  }

  const baseline = context?.baseline;
  if (
    !baseline
    || !near(baseline.zoomFactor, BASELINE_ZOOM)
    || baseline.documentToken !== DOCUMENT_TOKEN
    || comparableDocumentUrl(baseline.url) !== comparableDocumentUrl(document.URL)
  ) {
    return {
      assessment: {
        phase: 'baseline-required',
        currentZoomFactor: rounded(zoomFactor),
        requiredZoomFactor: 2,
      },
      signals: [],
    };
  }

  const resolvedContext = { zoomFactor: rounded(zoomFactor), baseline };
  const current = captureInternal(document, zoomFactor);
  const currentBySelector = new Map(current.baseline.subjects.map((entry) => [entry.selector, entry]));
  const currentBySignature = new Map<string, number>();
  const baselineBySignature = new Map<string, number>();
  for (const entry of current.baseline.subjects) {
    currentBySignature.set(entry.signature, (currentBySignature.get(entry.signature) ?? 0) + 1);
  }
  for (const entry of baseline.subjects) {
    baselineBySignature.set(entry.signature, (baselineBySignature.get(entry.signature) ?? 0) + 1);
  }

  const signals: TextResizeSignal[] = [];
  const matched: Array<{ baseline: TextResizeSubjectSnapshot; current: TextResizeSubjectSnapshot; element: Element }> = [];

  for (const before of baseline.subjects) {
    if (signals.length >= MAX_SIGNALS) break;
    let after = currentBySelector.get(before.selector);
    let element = current.elements.get(before.selector);
    if (!after || !element) {
      try {
        const resolved = document.querySelector(before.selector) ?? undefined;
        const resolvedEntry = resolved ? entryFor(resolved, current.cache) : undefined;
        if (resolved && resolvedEntry) {
          after = resolvedEntry;
          element = resolved;
        }
      } catch {
        // A detached or dynamically rewritten selector remains an unavailable candidate.
      }
    }
    if (!after || !element) {
      const replacementCount = currentBySignature.get(before.signature) ?? 0;
      const originalCount = baselineBySignature.get(before.signature) ?? 0;
      if (replacementCount >= originalCount) continue;
      try {
        const hiddenOriginal = document.querySelector(before.selector);
        if (hiddenOriginal && hasRenderedDisclosureCandidate(hiddenOriginal, document, current.cache)) continue;
      } catch {
        // Keep the bounded review when the original selector can no longer be resolved.
      }
      signals.push(signal(
        'content-unavailable',
        before,
        resolvedContext,
        `${before.selector} exposed ${JSON.stringify(before.label)} at 100% but no equivalent rendered text or control was observed at 200%. Review responsive replacements before treating this as content or functionality loss.`,
      ));
      continue;
    }

    matched.push({ baseline: before, current: after, element });
    if (before.kind === 'control' && before.accessibleName && !after.accessibleName) {
      signals.push(signal(
        'control-name-lost',
        before,
        resolvedContext,
        `${before.selector} had the accessible name ${JSON.stringify(before.accessibleName)} at 100% but no non-empty name was observed at 200%.`,
        after,
        element,
      ));
      continue;
    }

    if (!before.clippedBy && after.clippedBy) {
      signals.push(signal(
        'clipped-content',
        before,
        resolvedContext,
        `${before.selector} was not clipped at 100% but is clipped by ${after.clippedBy} at 200%.`,
        after,
        element,
        { clippedBy: after.clippedBy },
      ));
      continue;
    }

    if (!before.transformed && !after.transformed && before.fontSizePx > 0 && after.fontSizePx > 0) {
      const observedScale = rounded((after.fontSizePx * zoomFactor) / (before.fontSizePx * baseline.zoomFactor));
      if (observedScale < TARGET_ZOOM - SCALE_TOLERANCE) {
        signals.push(signal(
          'insufficient-enlargement',
          before,
          resolvedContext,
          `${before.selector} reached an observed effective text scale of ${observedScale}:1 at 200% instead of the expected 2:1. Review responsive font-size overrides and alternate text-resize mechanisms.`,
          after,
          element,
          { observedScale },
        ));
      }
    }
  }

  const overlapCandidates = matched.slice(0, MAX_OVERLAP_SUBJECTS);
  const reportedPairs = new Set<string>();
  for (let firstIndex = 0; firstIndex < overlapCandidates.length && signals.length < MAX_SIGNALS; firstIndex += 1) {
    const first = overlapCandidates[firstIndex]!;
    for (let secondIndex = firstIndex + 1; secondIndex < overlapCandidates.length && signals.length < MAX_SIGNALS; secondIndex += 1) {
      const second = overlapCandidates[secondIndex]!;
      if (first.element.contains(second.element) || second.element.contains(first.element)) continue;
      if (meaningfullyOverlaps(first.baseline.rect, second.baseline.rect)) continue;
      if (!meaningfullyOverlaps(first.current.rect, second.current.rect)) continue;
      const pairKey = [first.current.selector, second.current.selector].sort().join('|');
      if (reportedPairs.has(pairKey)) continue;
      reportedPairs.add(pairKey);
      signals.push(signal(
        'overlapping-content',
        first.baseline,
        resolvedContext,
        `${first.current.selector} and ${second.current.selector} did not overlap at 100% but overlap at 200%. Review whether either text or control is obscured or unusable.`,
        first.current,
        first.element,
        { overlappingWith: second.current.selector },
      ));
    }
  }

  return {
    assessment: {
      phase: 'comparison-complete',
      currentZoomFactor: rounded(zoomFactor),
      baselineZoomFactor: baseline.zoomFactor,
      baselineCapturedAt: baseline.capturedAt,
      requiredZoomFactor: 2,
      subjectsCaptured: baseline.subjects.length,
      subjectsCompared: matched.length,
      truncated: baseline.truncated || current.baseline.truncated,
    },
    signals,
  };
}
