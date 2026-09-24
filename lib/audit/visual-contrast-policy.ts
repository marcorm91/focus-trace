import { RULES } from '../../shared/rule-catalog';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { resolveComposedSelector } from './composed-tree';
import { parseCssColor } from './contrast';

const CONTRAST_RULE_IDS = new Set([RULES.textContrast.id, RULES.nonTextContrast.id]);
const MAX_STACK_CHECKS = 100;
const MAX_SIBLING_BACKDROPS = 12;
const MAX_DESCENDANT_BACKDROPS = 24;
const MAX_BACKDROP_ANCESTORS = 8;
const MAX_BACKDROP_STYLE_CHECKS = 800;
const STYLE_BUDGET_REASON = 'The per-scan visual-backdrop style budget was reached before this contrast candidate could be verified safely. Review the composed pixels manually.';
const LOCAL_SEARCH_BUDGET_REASON = 'The bounded visual-backdrop search reached its local ancestor, sibling or descendant limit before FocusTrace could exclude a separately stacked backdrop safely. Review the composed pixels manually.';

function computedStyleFor(element: Element, pseudo?: string): CSSStyleDeclaration {
  const view = element.ownerDocument.defaultView;
  if (!view) return getComputedStyle(element, pseudo);
  return view.getComputedStyle(element, pseudo);
}

interface BackdropScanContext {
  styleChecks: number;
  exhausted: boolean;
  localTruncated: boolean;
  styleCache: WeakMap<Element, CSSStyleDeclaration>;
  paintedCache: WeakMap<Element, boolean>;
  pseudoBackdropCache: WeakMap<Element, string | null>;
  rectCache: WeakMap<Element, DOMRect>;
}

function createBackdropScanContext(): BackdropScanContext {
  return {
    styleChecks: 0,
    exhausted: false,
    localTruncated: false,
    styleCache: new WeakMap(),
    paintedCache: new WeakMap(),
    pseudoBackdropCache: new WeakMap(),
    rectCache: new WeakMap(),
  };
}

function styleFor(element: Element, context: BackdropScanContext): CSSStyleDeclaration | undefined {
  const cached = context.styleCache.get(element);
  if (cached) return cached;
  if (context.styleChecks >= MAX_BACKDROP_STYLE_CHECKS) {
    context.exhausted = true;
    return undefined;
  }
  context.styleChecks += 1;
  const style = computedStyleFor(element);
  context.styleCache.set(element, style);
  return style;
}

function pseudoStyleFor(
  element: Element,
  pseudo: '::before' | '::after',
  context: BackdropScanContext,
): CSSStyleDeclaration | undefined {
  if (context.styleChecks >= MAX_BACKDROP_STYLE_CHECKS) {
    context.exhausted = true;
    return undefined;
  }
  context.styleChecks += 1;
  return computedStyleFor(element, pseudo);
}

function rectFor(element: Element, context: BackdropScanContext): DOMRect {
  const cached = context.rectCache.get(element);
  if (cached) return cached;
  const rect = element.getBoundingClientRect();
  context.rectCache.set(element, rect);
  return rect;
}

function stylePaintsBackground(style: CSSStyleDeclaration): boolean {
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  const opacity = Number.parseFloat(style.opacity || '1');
  if (Number.isFinite(opacity) && opacity <= 0) return false;
  if (style.backgroundImage && style.backgroundImage !== 'none') return true;
  const color = style.backgroundColor.trim().toLowerCase();
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return false;
  const parsed = parseCssColor(color);
  return parsed == null || parsed.a > 0;
}

function paintedBackground(element: Element, context: BackdropScanContext): boolean {
  const cached = context.paintedCache.get(element);
  if (cached != null) return cached;
  const style = styleFor(element, context);
  if (!style) return false;
  const tag = element.tagName.toLowerCase();
  const painted = ['img', 'video', 'canvas', 'svg'].includes(tag)
    ? style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
    : tag === 'picture' && element.querySelector('img')
      ? style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
      : stylePaintsBackground(style);
  context.paintedCache.set(element, painted);
  return painted;
}

function targetsFor(issue: ScanIssue, document: Document): Element[] | undefined {
  const targets: Element[] = [];
  const seen = new Set<Element>();
  for (const selector of issue.targets) {
    if (!selector) return undefined;
    try {
      const element = resolveComposedSelector(selector, document);
      if (!element) return undefined;
      if (!seen.has(element)) {
        seen.add(element);
        targets.push(element);
      }
    } catch {
      return undefined;
    }
  }
  return targets.length ? targets : undefined;
}

function coversPoint(rect: DOMRect, x: number, y: number): boolean {
  return rect.width > 0
    && rect.height > 0
    && x >= rect.left
    && x <= rect.right
    && y >= rect.top
    && y <= rect.bottom;
}

function numericZIndex(style: CSSStyleDeclaration): number | undefined {
  const token = style.zIndex.trim().toLowerCase();
  if (!token || token === 'auto') return undefined;
  const value = Number.parseInt(token, 10);
  return Number.isFinite(value) ? value : undefined;
}

function zeroInset(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === '0px' || normalized === '0';
}

function fillsContainingBlock(style: CSSStyleDeclaration): boolean {
  if (style.position !== 'absolute' && style.position !== 'fixed') return false;
  const inset = style.getPropertyValue('inset').trim().toLowerCase();
  if (inset === '0' || inset === '0px') return true;
  return zeroInset(style.top)
    && zeroInset(style.right)
    && zeroInset(style.bottom)
    && zeroInset(style.left);
}

function lowerStackedSibling(
  candidateStyle: CSSStyleDeclaration,
  targetStyle: CSSStyleDeclaration,
  parentStyle: CSSStyleDeclaration,
): boolean {
  if (candidateStyle.position !== 'absolute' && candidateStyle.position !== 'fixed') return false;
  if (parentStyle.position === 'static') return false;
  const candidateZ = numericZIndex(candidateStyle);
  const targetZ = numericZIndex(targetStyle);
  return candidateZ != null && targetZ != null && candidateZ < targetZ;
}

function descendantPaintedBackdropReason(
  candidate: Element,
  x: number,
  y: number,
  context: BackdropScanContext,
): string | undefined {
  const walker = candidate.ownerDocument.createTreeWalker(candidate, 1);
  let inspected = 0;
  let descendant = walker.nextNode() as Element | null;

  while (descendant && inspected < MAX_DESCENDANT_BACKDROPS) {
    inspected += 1;
    if (paintedBackground(descendant, context)) {
      const style = styleFor(descendant, context);
      if (!style) return undefined;

      if (fillsContainingBlock(style)) {
        return 'A painted descendant inside a sibling branch fills its containing block, so that sibling subtree can provide the visual backdrop independently of the target ancestor background chain.';
      }

      const rect = rectFor(descendant, context);
      if (coversPoint(rect, x, y)) {
        return 'A painted descendant inside a sibling branch overlaps the target at its measured center point, so the effective rendered background cannot be reduced safely to the target ancestor background chain.';
      }
    }
    if (context.exhausted) return undefined;
    descendant = walker.nextNode() as Element | null;
  }

  if (descendant) context.localTruncated = true;
  return undefined;
}
function positionedSiblingBackdropReason(
  element: Element,
  x: number,
  y: number,
  context: BackdropScanContext,
): string | undefined {
  const parent = element.parentElement;
  if (!parent) return undefined;
  const targetStyle = styleFor(element, context);
  const parentStyle = styleFor(parent, context);
  if (!targetStyle || !parentStyle) return undefined;

  let inspected = 0;
  for (const candidate of parent.children) {
    if (candidate === element) continue;
    if (inspected >= MAX_SIBLING_BACKDROPS) break;
    inspected += 1;

    const style = styleFor(candidate, context);
    if (!style) return undefined;
    const candidatePainted = paintedBackground(candidate, context);

    if (['absolute', 'fixed', 'sticky', 'relative'].includes(style.position)
      && candidatePainted) {
      if (fillsContainingBlock(style)) {
        return 'A painted absolute/fixed sibling uses zero inset on every side, so it fills its containing block and participates in the target backdrop. The effective contrast background cannot be reduced safely to the target ancestor chain.';
      }

      const rect = rectFor(candidate, context);
      if (coversPoint(rect, x, y)) {
        return 'A positioned painted sibling overlaps this target at its measured center point. Its final stacking/compositing relationship cannot be reconstructed safely from the target ancestor chain, so the effective contrast background remains ambiguous.';
      }

      if (lowerStackedSibling(style, targetStyle, parentStyle)) {
        return 'A painted absolute/fixed sibling has a lower authored stacking level than this target inside the same positioned container. Layout engines or test environments that cannot expose reliable paint geometry still require this backdrop relationship to be treated as ambiguous rather than as the ancestor background.';
      }
    }

    if (candidate.children.length > 0) {
      const descendantReason = descendantPaintedBackdropReason(candidate, x, y, context);
      if (descendantReason) return descendantReason;
      if (context.exhausted) return undefined;
    }
  }

  if (parent.children.length - 1 > inspected) context.localTruncated = true;
  return undefined;
}
function ownPseudoBackdropReason(
  element: Element,
  context: BackdropScanContext,
): string | undefined {
  const cached = context.pseudoBackdropCache.get(element);
  if (cached !== undefined) return cached ?? undefined;

  for (const pseudo of ['::before', '::after'] as const) {
    let style: CSSStyleDeclaration | undefined;
    try {
      style = pseudoStyleFor(element, pseudo, context);
    } catch {
      continue;
    }
    if (!style) break;

    const content = style.content.trim().toLowerCase();
    if (!content || content === 'none' || content === 'normal') continue;
    if (!stylePaintsBackground(style)) continue;
    if (style.position !== 'absolute' && style.position !== 'fixed') continue;
    if (!fillsContainingBlock(style)) continue;

    const reason = `A painted ${pseudo} pseudo-element on the target or one of its ancestors fills its containing block, so the rendered backdrop cannot be reduced safely to ordinary ancestor background-color values.`;
    context.pseudoBackdropCache.set(element, reason);
    return reason;
  }

  context.pseudoBackdropCache.set(element, null);
  return undefined;
}

function generatedPseudoBackdropReason(
  element: Element,
  context: BackdropScanContext,
): string | undefined {
  let current: Element | null = element;
  let inspected = 0;

  while (current && inspected < MAX_BACKDROP_ANCESTORS) {
    const reason = ownPseudoBackdropReason(current, context);
    if (reason) return reason;
    if (context.exhausted) return undefined;
    current = current.parentElement;
    inspected += 1;
  }

  if (current) context.localTruncated = true;
  return undefined;
}
function ancestorSiblingBackdropReason(
  element: Element,
  x: number,
  y: number,
  context: BackdropScanContext,
): string | undefined {
  let branch: Element | null = element;
  let inspected = 0;

  while (branch && inspected < MAX_BACKDROP_ANCESTORS) {
    const reason = positionedSiblingBackdropReason(branch, x, y, context);
    if (reason) {
      return inspected === 0
        ? reason
        : `${reason} The painted layer belongs to an ancestor-level stacking context rather than the text element's direct parent.`;
    }
    if (context.exhausted) return undefined;
    branch = branch.parentElement;
    inspected += 1;
  }

  if (branch) context.localTruncated = true;
  return undefined;
}

function stackedBackdropReason(
  element: Element,
  context: BackdropScanContext,
): string | undefined {
  const document = element.ownerDocument;
  const view = document.defaultView;
  const rect = rectFor(element, context);
  const hasGeometry = rect.width > 0 && rect.height > 0;
  const viewportWidth = view?.innerWidth ?? document.documentElement.clientWidth;
  const viewportHeight = view?.innerHeight ?? document.documentElement.clientHeight;

  if (hasGeometry && typeof document.elementsFromPoint === 'function') {
    const points = [
      [0.5, 0.5],
      [0.2, 0.2],
      [0.8, 0.2],
      [0.2, 0.8],
      [0.8, 0.8],
    ] as const;

    for (const [horizontal, vertical] of points) {
      const x = rect.left + rect.width * horizontal;
      const y = rect.top + rect.height * vertical;
      // Hit testing is viewport-relative: clamping offscreen points samples
      // unrelated pixels at the viewport edge.
      if (x < 0 || y < 0 || x >= viewportWidth || y >= viewportHeight) continue;
      const stack = document.elementsFromPoint(x, y);
      const ownIndex = stack.findIndex((candidate) => candidate === element || element.contains(candidate));
      if (ownIndex < 0) continue;

      for (const candidate of stack.slice(ownIndex + 1)) {
        if (candidate === document.documentElement || candidate === document.body) continue;
        if (element.contains(candidate) || candidate.contains(element)) continue;
        if (!paintedBackground(candidate, context)) continue;
        return 'A separately stacked painted element is rendered behind this target, so the effective contrast background cannot be reduced safely to the target ancestor chain.';
      }
      if (context.exhausted) return undefined;
    }
  }

  const x = hasGeometry ? rect.left + rect.width / 2 : 0;
  const y = hasGeometry ? rect.top + rect.height / 2 : 0;

  const pseudoReason = generatedPseudoBackdropReason(element, context);
  if (pseudoReason) return pseudoReason;

  const siblingReason = ancestorSiblingBackdropReason(element, x, y, context);
  if (siblingReason) return siblingReason;

  return context.localTruncated ? LOCAL_SEARCH_BUDGET_REASON : undefined;
}

export function downgradeUncertainStackingContrast(
  result: ScanResult,
  document: Document = window.document,
): void {
  const retained: ScanIssue[] = [];
  const downgraded: ScanIssue[] = [];
  const context = createBackdropScanContext();
  let checked = 0;

  for (const issue of result.issues) {
    if (!CONTRAST_RULE_IDS.has(issue.ruleId)) {
      retained.push(issue);
      continue;
    }
    let budgetExhausted = checked >= MAX_STACK_CHECKS || context.exhausted;
    let reason: string | undefined = budgetExhausted
      ? context.exhausted
        ? STYLE_BUDGET_REASON
        : 'The per-scan limit of 100 contrast backdrop checks was reached. The effective rendered background of this remaining candidate was not verified; review the composed pixels manually.'
      : undefined;
    if (!budgetExhausted) {
      checked += 1;
      context.localTruncated = false;
      const targets = targetsFor(issue, document);
      if (!targets) {
        reason = 'The contrast target could not be resolved for backdrop verification. Review the current element and composed pixels manually.';
      }
      for (const element of targets ?? []) {
        reason = stackedBackdropReason(element, context);
        if (reason || context.exhausted) break;
      }
      if (reason === LOCAL_SEARCH_BUDGET_REASON) budgetExhausted = true;
      if (!reason && context.exhausted) {
        budgetExhausted = true;
        reason = STYLE_BUDGET_REASON;
      }
    }
    if (!reason) {
      retained.push(issue);
      continue;
    }

    const contrast = issue.contrast ? { ...issue.contrast } : undefined;
    if (contrast) {
      delete contrast.ratio;
      delete contrast.background;
      contrast.reason = reason;
    }

    downgraded.push({
      ...issue,
      outcome: 'review',
      ...(contrast ? { contrast } : {}),
      description: budgetExhausted
        ? 'FocusTrace measured a contrast candidate, but the backdrop verification budget was exhausted. Review the actual composed pixels before treating this as a WCAG failure.'
        : 'FocusTrace measured a contrast candidate, but the effective rendered background could not be verified safely. Review the actual composed pixels before treating this as a WCAG failure.',
      evidence: issue.evidence ? `${issue.evidence} ${reason}` : reason,
    });

    const ruleResult = result.ruleResults?.find((entry) => entry.ruleId === issue.ruleId);
    if (ruleResult) {
      ruleResult.failures = Math.max(0, ruleResult.failures - 1);
      ruleResult.reviews += 1;
    }
  }

  if (downgraded.length) {
    result.issues = retained;
    result.review.push(...downgraded);
  }
}
