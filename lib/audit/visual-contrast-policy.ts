import { RULES } from '../../shared/rule-catalog';
import type { ScanIssue, ScanResult } from '../../shared/types';

const CONTRAST_RULE_IDS = new Set([RULES.textContrast.id, RULES.nonTextContrast.id]);
const MAX_STACK_CHECKS = 100;
const MAX_SIBLING_BACKDROPS = 50;

function paintedBackground(element: Element): boolean {
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  if (style.backgroundImage && style.backgroundImage !== 'none') return true;
  const color = style.backgroundColor.trim().toLowerCase();
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return false;
  const alpha = color.match(/rgba?\([^)]*[,\s/]\s*([\d.]+)\s*\)$/)?.[1];
  return alpha == null || Number.parseFloat(alpha) > 0;
}

function targetsFor(issue: ScanIssue, document: Document): Element[] {
  const targets: Element[] = [];
  const seen = new Set<Element>();
  for (const selector of issue.targets) {
    if (!selector) continue;
    try {
      const element = document.querySelector(selector);
      if (element && !seen.has(element)) {
        seen.add(element);
        targets.push(element);
      }
    } catch {
      // Invalid or pseudo-element-like selectors are not resolvable DOM targets.
    }
  }
  return targets;
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

function positionedSiblingBackdropReason(element: Element, x: number, y: number): string | undefined {
  const parent = element.parentElement;
  if (!parent) return undefined;
  const targetStyle = getComputedStyle(element);
  const parentStyle = getComputedStyle(parent);

  let inspected = 0;
  for (const candidate of parent.children) {
    if (candidate === element) continue;
    if (inspected >= MAX_SIBLING_BACKDROPS) break;
    inspected += 1;

    const style = getComputedStyle(candidate);
    if (!['absolute', 'fixed', 'sticky', 'relative'].includes(style.position)) continue;
    if (!paintedBackground(candidate)) continue;

    if (fillsContainingBlock(style)) {
      return 'A painted absolute/fixed sibling uses zero inset on every side, so it fills its containing block and participates in the target backdrop. The effective contrast background cannot be reduced safely to the target ancestor chain.';
    }

    const rect = candidate.getBoundingClientRect();
    if (coversPoint(rect, x, y)) {
      return 'A positioned painted sibling overlaps this target at its measured center point. Its final stacking/compositing relationship cannot be reconstructed safely from the target ancestor chain, so the effective contrast background remains ambiguous.';
    }

    if (lowerStackedSibling(style, targetStyle, parentStyle)) {
      return 'A painted absolute/fixed sibling has a lower authored stacking level than this target inside the same positioned container. Layout engines or test environments that cannot expose reliable paint geometry still require this backdrop relationship to be treated as ambiguous rather than as the ancestor background.';
    }
  }
  return undefined;
}

function stackedBackdropReason(element: Element, document: Document): string | undefined {
  const rect = element.getBoundingClientRect();
  const hasGeometry = rect.width > 0 && rect.height > 0;
  const x = hasGeometry
    ? Math.min(Math.max(rect.left + rect.width / 2, 0), Math.max(0, window.innerWidth - 1))
    : 0;
  const y = hasGeometry
    ? Math.min(Math.max(rect.top + rect.height / 2, 0), Math.max(0, window.innerHeight - 1))
    : 0;

  if (hasGeometry && typeof document.elementsFromPoint === 'function') {
    const stack = document.elementsFromPoint(x, y);
    const ownIndex = stack.findIndex((candidate) => candidate === element || element.contains(candidate));
    if (ownIndex >= 0) {
      for (const candidate of stack.slice(ownIndex + 1)) {
        if (candidate === document.documentElement || candidate === document.body) continue;
        if (element.contains(candidate) || candidate.contains(element)) continue;
        if (!paintedBackground(candidate)) continue;
        return 'A separately stacked painted element is rendered behind this target, so the effective contrast background cannot be reduced safely to the target ancestor chain.';
      }
    }
  }

  return positionedSiblingBackdropReason(element, x, y);
}

export function downgradeUncertainStackingContrast(
  result: ScanResult,
  document: Document = window.document,
): void {
  const retained: ScanIssue[] = [];
  const downgraded: ScanIssue[] = [];
  let checked = 0;

  for (const issue of result.issues) {
    if (!CONTRAST_RULE_IDS.has(issue.ruleId) || checked >= MAX_STACK_CHECKS) {
      retained.push(issue);
      continue;
    }
    checked += 1;

    let reason: string | undefined;
    for (const element of targetsFor(issue, document)) {
      reason = stackedBackdropReason(element, document);
      if (reason) break;
    }
    if (!reason) {
      retained.push(issue);
      continue;
    }

    downgraded.push({
      ...issue,
      outcome: 'review',
      description: 'FocusTrace measured a contrast candidate, but a separately stacked painted backdrop makes the effective rendered background ambiguous. Review the actual composed pixels before treating this as a WCAG failure.',
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