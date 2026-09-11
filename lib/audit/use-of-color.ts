import type { UseOfColorEvidence } from '../../shared/types';
import {
  colorToRgb,
  compositeColor,
  contrastRatio,
  effectiveBackground,
  parseCssColor,
  type RgbaColor,
} from './contrast';
import { isProgrammaticallyHidden, selectorFor } from './dom';
import { scopedElements, type ScanRoot } from './scan-elements';

const REQUIRED_LINK_TEXT_RATIO = 3;
const MAX_EVALUATED_LINKS = 2_000;
const MAX_REVIEW_SIGNALS = 50;
const PROSE_CONTEXT_SELECTOR = 'p, li, dd, dt, figcaption, blockquote';
const NON_PROSE_ANCESTOR_SELECTOR = 'nav, [role="navigation"], [role="menu"], [role="menubar"], [role="toolbar"]';
const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"]';
const GRAPHIC_SELECTOR = 'img, svg, canvas';
const TEXT_NODE = 3;
const SHOW_TEXT = 4;

interface RenderedColor {
  foreground: RgbaColor;
  background: RgbaColor;
}

interface TextSample {
  owner: Element;
}

interface EvaluationCache {
  contextTextNodes: WeakMap<Element, Text[]>;
  linkElements: WeakMap<HTMLAnchorElement, Element[]>;
  renderedColors: WeakMap<Element, RenderedColor | null>;
}

export interface UseOfColorEvaluation {
  status: 'pass' | 'review';
  element: HTMLAnchorElement;
  context: Element;
  detail?: string;
  evidence?: UseOfColorEvidence;
}

function normalizedText(node: Node): string {
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function hasHumanText(node: Node): boolean {
  return /[0-9A-Za-z\u00c0-\uffff]/.test(normalizedText(node));
}

function textNodes(root: Element): Text[] {
  const document = root.ownerDocument;
  const walker = document.createTreeWalker(root, SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === TEXT_NODE && hasHumanText(current)) nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function rendered(element: Element, requireProgrammaticExposure = true): boolean {
  if (!element.isConnected || (requireProgrammaticExposure && isProgrammaticallyHidden(element))) return false;
  let current: Element | null = element;
  while (current) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (style.getPropertyValue('content-visibility') === 'hidden') return false;
    const opacity = Number.parseFloat(style.opacity || '1');
    if (Number.isFinite(opacity) && opacity <= 0) return false;
    current = current.parentElement;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function belongsToRoot(root: ScanRoot, element: Element): boolean {
  return root instanceof Document || root === element || root.contains(element);
}

function proseContext(root: ScanRoot, link: HTMLAnchorElement): Element | undefined {
  if (link.closest(NON_PROSE_ANCESTOR_SELECTOR)) return undefined;
  const context = link.closest(PROSE_CONTEXT_SELECTOR);
  if (!context || !belongsToRoot(root, context)) return undefined;
  return context;
}

function ownerFor(node: Text): Element | undefined {
  return node.parentElement ?? undefined;
}

function visibleLinkTextOwner(link: HTMLAnchorElement): Element | undefined {
  for (const node of textNodes(link)) {
    const owner = ownerFor(node);
    if (owner && !isProgrammaticallyHidden(owner)) return owner;
  }
  return undefined;
}

function surroundingSamples(context: Element, link: HTMLAnchorElement, cache: EvaluationCache): TextSample[] {
  let nodes = cache.contextTextNodes.get(context);
  if (!nodes) {
    nodes = textNodes(context);
    cache.contextTextNodes.set(context, nodes);
  }
  const linkIndexes = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => link.contains(node));
  if (!linkIndexes.length) return [];

  const firstIndex = linkIndexes[0]!.index;
  const lastIndex = linkIndexes[linkIndexes.length - 1]!.index;
  const candidates: TextSample[] = [];
  const addCandidate = (node: Text | undefined) => {
    if (!node) return;
    const owner = ownerFor(node);
    if (!owner || link.contains(owner) || isProgrammaticallyHidden(owner)) return;
    if (owner.closest(INTERACTIVE_SELECTOR)) return;
    if (!candidates.some((candidate) => candidate.owner === owner)) candidates.push({ owner });
  };

  for (let index = firstIndex - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (node && !link.contains(node)) {
      addCandidate(node);
      if (candidates.length) break;
    }
  }
  for (let index = lastIndex + 1; index < nodes.length; index += 1) {
    const before = candidates.length;
    const node = nodes[index];
    if (node && !link.contains(node)) addCandidate(node);
    if (candidates.length > before) break;
  }
  return candidates;
}

function renderedTextColor(element: Element, cache: EvaluationCache): RenderedColor | undefined {
  const cached = cache.renderedColors.get(element);
  if (cached !== undefined) return cached ?? undefined;
  const style = getComputedStyle(element);
  const foreground = parseCssColor(style.color);
  const backgroundResult = effectiveBackground(element);
  if (!foreground || !backgroundResult.color) {
    cache.renderedColors.set(element, null);
    return undefined;
  }
  const color = {
    foreground: foreground.a < 0.999
      ? compositeColor(foreground, backgroundResult.color)
      : foreground,
    background: backgroundResult.color,
  };
  cache.renderedColors.set(element, color);
  return color;
}

function colorsEqual(first: RgbaColor, second: RgbaColor, tolerance = 0.5): boolean {
  return Math.abs(first.r - second.r) <= tolerance
    && Math.abs(first.g - second.g) <= tolerance
    && Math.abs(first.b - second.b) <= tolerance
    && Math.abs(first.a - second.a) <= 0.01;
}

function numericFontWeight(value: string): number {
  if (value === 'bold' || value === 'bolder') return 700;
  if (value === 'normal' || value === 'lighter') return 400;
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : 400;
}

function textDecorationLines(element: Element, boundary: Element): Set<string> {
  const lines = new Set<string>();
  let current: Element | null = element;
  while (current) {
    const value = getComputedStyle(current).textDecorationLine?.trim().toLowerCase();
    for (const line of value?.split(/\s+/) ?? []) {
      if (line && line !== 'none') lines.add(line);
    }
    if (current === boundary) break;
    current = current.parentElement;
  }
  return lines;
}

function setsDiffer(first: Set<string>, second: Set<string>): boolean {
  if (first.size !== second.size) return true;
  return [...first].some((value) => !second.has(value));
}

function visibleBorderOrOutline(style: CSSStyleDeclaration): boolean {
  const sides = ['Top', 'Right', 'Bottom', 'Left'] as const;
  for (const side of sides) {
    const borderStyle = style[`border${side}Style`];
    const borderWidth = Number.parseFloat(style[`border${side}Width`]);
    const borderColor = parseCssColor(style[`border${side}Color`]);
    if (borderStyle !== 'none' && borderStyle !== 'hidden' && borderWidth > 0 && (!borderColor || borderColor.a > 0)) {
      return true;
    }
  }
  const outlineWidth = Number.parseFloat(style.outlineWidth);
  const outlineColor = parseCssColor(style.outlineColor);
  return style.outlineStyle !== 'none'
    && style.outlineStyle !== 'hidden'
    && outlineWidth > 0
    && (!outlineColor || outlineColor.a > 0);
}

function boundedLinkElements(link: HTMLAnchorElement, cache: EvaluationCache): Element[] {
  let elements = cache.linkElements.get(link);
  if (!elements) {
    elements = [link, ...link.querySelectorAll('*')].slice(0, 20);
    cache.linkElements.set(link, elements);
  }
  return elements;
}

function hasGeneratedContent(link: HTMLAnchorElement, cache: EvaluationCache): boolean {
  if (navigator.userAgent.toLowerCase().includes('jsdom')) return false;
  for (const element of boundedLinkElements(link, cache)) {
    for (const pseudo of ['::before', '::after']) {
      try {
        const style = getComputedStyle(element, pseudo);
        const content = style.content?.trim();
        if (content && content !== 'none' && content !== 'normal' && content !== '""' && content !== "''") return true;
      } catch {
        return true;
      }
    }
  }
  return false;
}

function hasVisibleGraphic(link: HTMLAnchorElement, cache: EvaluationCache): boolean {
  return boundedLinkElements(link, cache).some((element) =>
    element !== link && element.matches(GRAPHIC_SELECTOR) && rendered(element, false));
}

function hasVisibleBoundary(link: HTMLAnchorElement, cache: EvaluationCache): boolean {
  return boundedLinkElements(link, cache).some((element) => {
    const style = getComputedStyle(element);
    return visibleBorderOrOutline(style) || Boolean(style.boxShadow && style.boxShadow !== 'none');
  });
}

function hasPersistentNonColorCue(
  link: HTMLAnchorElement,
  linkTextOwner: Element,
  surroundingTextOwner: Element,
  context: Element,
  cache: EvaluationCache,
): boolean {
  const linkTextStyle = getComputedStyle(linkTextOwner);
  const surroundingStyle = getComputedStyle(surroundingTextOwner);

  if (setsDiffer(textDecorationLines(linkTextOwner, context), textDecorationLines(surroundingTextOwner, context))) {
    return true;
  }
  if (numericFontWeight(linkTextStyle.fontWeight) !== numericFontWeight(surroundingStyle.fontWeight)) return true;
  const linkFontSize = Number.parseFloat(linkTextStyle.fontSize);
  const surroundingFontSize = Number.parseFloat(surroundingStyle.fontSize);
  if (Number.isFinite(linkFontSize) && Number.isFinite(surroundingFontSize) && Math.abs(linkFontSize - surroundingFontSize) >= 0.5) {
    return true;
  }
  for (const property of ['fontFamily', 'fontStyle', 'fontStretch', 'fontVariantCaps', 'letterSpacing', 'textTransform'] as const) {
    if (linkTextStyle[property] !== surroundingStyle[property]) return true;
  }
  if (hasVisibleBoundary(link, cache)) return true;
  if (hasGeneratedContent(link, cache) || hasVisibleGraphic(link, cache)) return true;
  return false;
}

function evaluationForLink(
  root: ScanRoot,
  link: HTMLAnchorElement,
  cache: EvaluationCache,
): UseOfColorEvaluation | undefined {
  if (!rendered(link)) return undefined;
  const context = proseContext(root, link);
  const linkTextOwner = visibleLinkTextOwner(link);
  if (!context || !linkTextOwner) return undefined;

  const linkColor = renderedTextColor(linkTextOwner, cache);
  if (!linkColor) return undefined;
  const samples = surroundingSamples(context, link, cache);
  let passObserved = false;
  let review: UseOfColorEvaluation | undefined;

  for (const sample of samples) {
    const surroundingColor = renderedTextColor(sample.owner, cache);
    if (!surroundingColor) continue;
    if (!colorsEqual(linkColor.background, surroundingColor.background)) continue;
    if (colorsEqual(linkColor.foreground, surroundingColor.foreground)) continue;

    const ratio = Number(contrastRatio(linkColor.foreground, surroundingColor.foreground).toFixed(2));
    if (hasPersistentNonColorCue(link, linkTextOwner, sample.owner, context, cache) || ratio + Number.EPSILON >= REQUIRED_LINK_TEXT_RATIO) {
      passObserved = true;
      continue;
    }

    const evidence: UseOfColorEvidence = {
      kind: 'inline-link',
      contextSelector: selectorFor(context),
      surroundingTextSelector: selectorFor(sample.owner),
      linkColor: colorToRgb(linkColor.foreground),
      surroundingTextColor: colorToRgb(surroundingColor.foreground),
      contrastRatio: ratio,
      requiredRatio: REQUIRED_LINK_TEXT_RATIO,
      persistentVisualCue: 'none-observed',
    };
    const target = selectorFor(link);
    const candidate: UseOfColorEvaluation = {
      status: 'review',
      element: link,
      context,
      evidence,
      detail: `${target} is an inline link in ${evidence.contextSelector}. Its rendered text color ${evidence.linkColor} differs from adjacent text ${evidence.surroundingTextColor} by ${ratio}:1, below the 3:1 lightness difference, and no persistent non-color visual cue was observed.`,
    };
    if (!review || ratio < (review.evidence?.contrastRatio ?? Number.POSITIVE_INFINITY)) review = candidate;
  }

  return review ?? (passObserved ? { status: 'pass', element: link, context } : undefined);
}

export function evaluateInlineLinkUseOfColor(root: ScanRoot = document): UseOfColorEvaluation[] {
  const evaluations: UseOfColorEvaluation[] = [];
  let reviews = 0;
  const cache: EvaluationCache = {
    contextTextNodes: new WeakMap(),
    linkElements: new WeakMap(),
    renderedColors: new WeakMap(),
  };
  const links = scopedElements<HTMLAnchorElement>(root, 'a[href]').slice(0, MAX_EVALUATED_LINKS);
  for (const link of links) {
    const evaluation = evaluationForLink(root, link, cache);
    if (!evaluation) continue;
    if (evaluation.status === 'review') {
      if (reviews >= MAX_REVIEW_SIGNALS) continue;
      reviews += 1;
    }
    evaluations.push(evaluation);
  }
  return evaluations;
}
