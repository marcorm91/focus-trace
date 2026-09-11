import type { ReflowEvidence } from '../../shared/types';
import { selectorFor } from './dom';
import { scopedElements } from './scan-elements';

const HORIZONTAL_REFLOW_WIDTH = 320;
const VERTICAL_REFLOW_HEIGHT = 256;
const GEOMETRY_TOLERANCE = 2;
const MAX_OVERFLOW_TARGETS = 6;
const MAX_CLIPPED_SIGNALS = 8;
const MAX_EVALUATED_ELEMENTS = 10_000;

const REFLOW_EXCEPTION_SELECTOR = [
  'table',
  '[role="table"]',
  '[role="grid"]',
  'canvas',
  'svg',
  'video',
  'iframe',
  'object',
  'embed',
  '[role="application"]',
].join(',');

const NON_CONTENT_TAGS = new Set(['head', 'meta', 'link', 'style', 'script', 'template', 'noscript', 'br', 'wbr']);
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

export interface ReflowSignal {
  kind: ReflowEvidence['kind'];
  target: Element;
  targets: Element[];
  detail: string;
  evidence: ReflowEvidence;
}

export interface ReflowEvaluation {
  status: 'inapplicable' | 'pass' | 'review';
  signals: ReflowSignal[];
  evidence: Omit<ReflowEvidence, 'kind' | 'axis'> & { axis: ReflowEvidence['axis'] };
}

function finiteDimension(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function writingModeFor(document: Document): string {
  const root = document.documentElement;
  const rootMode = getComputedStyle(root).writingMode?.trim();
  if (rootMode) return rootMode;
  const bodyMode = document.body ? getComputedStyle(document.body).writingMode?.trim() : '';
  return bodyMode || 'horizontal-tb';
}

function isVerticalWritingMode(writingMode: string): boolean {
  return /^(?:vertical|sideways)-/i.test(writingMode);
}

function documentMetrics(document: Document) {
  const root = document.documentElement;
  const body = document.body;
  const viewportWidth = finiteDimension(window.innerWidth, root.clientWidth);
  const viewportHeight = finiteDimension(window.innerHeight, root.clientHeight);
  const clientWidth = finiteDimension(root.clientWidth, viewportWidth);
  const clientHeight = finiteDimension(root.clientHeight, viewportHeight);
  const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0, clientWidth);
  const scrollHeight = Math.max(root.scrollHeight, body?.scrollHeight ?? 0, clientHeight);
  return { viewportWidth, viewportHeight, clientWidth, clientHeight, scrollWidth, scrollHeight };
}

function visuallyRendered(element: Element): boolean {
  if (!element.isConnected || NON_CONTENT_TAGS.has(element.tagName.toLowerCase())) return false;
  let current: Element | null = element;
  while (current) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (style.getPropertyValue('content-visibility') === 'hidden') return false;
    if (Number.parseFloat(style.opacity || '1') === 0) return false;
    current = current.parentElement;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > GEOMETRY_TOLERANCE && rect.height > GEOMETRY_TOLERANCE;
}

function inKnownTwoDimensionalException(element: Element): boolean {
  return element.closest(REFLOW_EXCEPTION_SELECTOR) != null;
}

function protrudesAcrossReflowAxis(
  element: Element,
  axis: ReflowEvidence['axis'],
  clientWidth: number,
  clientHeight: number,
): boolean {
  const rect = element.getBoundingClientRect();
  if (axis === 'horizontal') {
    const left = rect.left + window.scrollX;
    const right = rect.right + window.scrollX;
    return left < -GEOMETRY_TOLERANCE || right > clientWidth + GEOMETRY_TOLERANCE;
  }
  const top = rect.top + window.scrollY;
  const bottom = rect.bottom + window.scrollY;
  return top < -GEOMETRY_TOLERANCE || bottom > clientHeight + GEOMETRY_TOLERANCE;
}

function terminalProtrudingElements(
  document: Document,
  elements: Element[],
  axis: ReflowEvidence['axis'],
  clientWidth: number,
  clientHeight: number,
): Element[] {
  const protruding = elements.filter((element) =>
    visuallyRendered(element)
    && element !== document.documentElement
    && element !== document.body
    && protrudesAcrossReflowAxis(element, axis, clientWidth, clientHeight));
  const candidates = new Set(protruding);
  const withProtrudingDescendant = new Set<Element>();
  for (const element of protruding) {
    let ancestor = element.parentElement;
    while (ancestor) {
      if (candidates.has(ancestor)) withProtrudingDescendant.add(ancestor);
      ancestor = ancestor.parentElement;
    }
  }
  return protruding.filter((element) => !withProtrudingDescendant.has(element));
}

function directText(element: Element): string {
  return [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsObservableContent(element: Element): boolean {
  if (element.matches(INTERACTIVE_SELECTOR)) return true;
  if (element instanceof HTMLImageElement) return element.alt.trim().length > 0;
  return directText(element).length > 0;
}

function isInsideInteractiveTarget(element: Element): boolean {
  const interactive = element.parentElement?.closest(INTERACTIVE_SELECTOR);
  return interactive != null && interactive.contains(element);
}

function effectiveOverflow(style: CSSStyleDeclaration, axis: 'x' | 'y'): string {
  const axisValue = axis === 'x' ? style.overflowX : style.overflowY;
  const shorthand = style.overflow.trim().toLowerCase();
  const normalizedAxis = axisValue.trim().toLowerCase();
  if ((!normalizedAxis || normalizedAxis === 'visible') && (shorthand === 'hidden' || shorthand === 'clip')) {
    return shorthand;
  }
  return normalizedAxis || shorthand || 'visible';
}

interface ClipObservation {
  ancestor: Element;
  axis: ReflowEvidence['axis'];
  pixels: number;
  clipping: 'partial' | 'complete';
  overflowValue: string;
}

function clippedByUnscrollableAncestor(element: Element): ClipObservation | undefined {
  const rect = element.getBoundingClientRect();
  let ancestor = element.parentElement;
  while (ancestor) {
    const ancestorRect = ancestor.getBoundingClientRect();
    if (ancestorRect.width > GEOMETRY_TOLERANCE && ancestorRect.height > GEOMETRY_TOLERANCE) {
      const style = getComputedStyle(ancestor);
      const overflowX = effectiveOverflow(style, 'x');
      const overflowY = effectiveOverflow(style, 'y');
      const hiddenX = overflowX === 'hidden' || overflowX === 'clip';
      const hiddenY = overflowY === 'hidden' || overflowY === 'clip';
      const lostX = hiddenX
        ? Math.max(0, ancestorRect.left - rect.left) + Math.max(0, rect.right - ancestorRect.right)
        : 0;
      const lostY = hiddenY
        ? Math.max(0, ancestorRect.top - rect.top) + Math.max(0, rect.bottom - ancestorRect.bottom)
        : 0;

      if (lostX > GEOMETRY_TOLERANCE || lostY > GEOMETRY_TOLERANCE) {
        const axis = lostX >= lostY ? 'horizontal' : 'vertical';
        const pixels = axis === 'horizontal' ? lostX : lostY;
        const intersectionWidth = Math.max(0, Math.min(rect.right, ancestorRect.right) - Math.max(rect.left, ancestorRect.left));
        const intersectionHeight = Math.max(0, Math.min(rect.bottom, ancestorRect.bottom) - Math.max(rect.top, ancestorRect.top));
        const clipping = intersectionWidth <= GEOMETRY_TOLERANCE || intersectionHeight <= GEOMETRY_TOLERANCE
          ? 'complete'
          : 'partial';
        return {
          ancestor,
          axis,
          pixels: Math.round(pixels),
          clipping,
          overflowValue: axis === 'horizontal' ? overflowX : overflowY,
        };
      }
    }
    ancestor = ancestor.parentElement;
  }
  return undefined;
}

function clippedContentSignals(
  elements: Element[],
  baseEvidence: ReflowEvaluation['evidence'],
): ReflowSignal[] {
  const signals: ReflowSignal[] = [];
  for (const element of elements) {
    if (signals.length >= MAX_CLIPPED_SIGNALS) break;
    if (
      !visuallyRendered(element)
      || !containsObservableContent(element)
      || isInsideInteractiveTarget(element)
      || inKnownTwoDimensionalException(element)
    ) continue;
    const observation = clippedByUnscrollableAncestor(element);
    if (!observation) continue;
    const target = selectorFor(element);
    const clippedBy = selectorFor(observation.ancestor);
    signals.push({
      kind: 'clipped-content',
      target: element,
      targets: [element],
      detail: `At a ${baseEvidence.viewportWidth} × ${baseEvidence.viewportHeight} CSS px viewport, ${target} is ${observation.clipping}ly clipped by ${clippedBy} using overflow-${observation.axis === 'horizontal' ? 'x' : 'y'}: ${observation.overflowValue}; approximately ${observation.pixels} CSS px are not observable on the ${observation.axis} axis.`,
      evidence: {
        ...baseEvidence,
        kind: 'clipped-content',
        axis: observation.axis,
        clippedBy,
        clippedPixels: observation.pixels,
        clipping: observation.clipping,
      },
    });
  }
  return signals;
}

export function evaluateReflow(document: Document = window.document): ReflowEvaluation {
  const metrics = documentMetrics(document);
  const writingMode = writingModeFor(document);
  const axis: ReflowEvidence['axis'] = isVerticalWritingMode(writingMode) ? 'vertical' : 'horizontal';
  const baseEvidence: ReflowEvaluation['evidence'] = {
    writingMode,
    axis,
    viewportWidth: metrics.viewportWidth,
    viewportHeight: metrics.viewportHeight,
    scrollWidth: metrics.scrollWidth,
    scrollHeight: metrics.scrollHeight,
  };
  const applicable = axis === 'horizontal'
    ? metrics.viewportWidth <= HORIZONTAL_REFLOW_WIDTH
    : metrics.viewportHeight <= VERTICAL_REFLOW_HEIGHT;
  if (!applicable) return { status: 'inapplicable', signals: [], evidence: baseEvidence };

  const elements = scopedElements(document, '*').slice(0, MAX_EVALUATED_ELEMENTS);
  const signals: ReflowSignal[] = [];
  const overflowPixels = axis === 'horizontal'
    ? Math.max(0, metrics.scrollWidth - metrics.clientWidth)
    : Math.max(0, metrics.scrollHeight - metrics.clientHeight);

  if (overflowPixels > GEOMETRY_TOLERANCE) {
    const terminal = terminalProtrudingElements(document, elements, axis, metrics.clientWidth, metrics.clientHeight);
    const targets = terminal.filter((element) => !inKnownTwoDimensionalException(element)).slice(0, MAX_OVERFLOW_TARGETS);
    if (targets.length > 0 || terminal.length === 0) {
      const fallback = document.body ?? document.documentElement;
      const findingTargets = targets.length > 0 ? targets : [fallback];
      const targetSummary = findingTargets.map(selectorFor).join(', ');
      signals.push({
        kind: 'document-overflow',
        target: findingTargets[0] ?? fallback,
        targets: findingTargets,
        detail: `At a ${metrics.viewportWidth} × ${metrics.viewportHeight} CSS px viewport (${writingMode}), the document ${axis === 'horizontal' ? 'width' : 'height'} is ${axis === 'horizontal' ? metrics.scrollWidth : metrics.scrollHeight} CSS px and requires approximately ${Math.round(overflowPixels)} CSS px of ${axis} scrolling. Non-exempt protruding target${findingTargets.length === 1 ? '' : 's'}: ${targetSummary}. Review whether any two-dimensional layout exception is essential.`,
        evidence: {
          ...baseEvidence,
          kind: 'document-overflow',
          axis,
          overflowPixels: Math.round(overflowPixels),
        },
      });
    }
  }

  signals.push(...clippedContentSignals(elements, baseEvidence));
  return { status: signals.length > 0 ? 'review' : 'pass', signals, evidence: baseEvidence };
}
