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

function targetFor(issue: ScanIssue, document: Document): Element | undefined {
  const selector = issue.targets[0];
  if (!selector) return undefined;
  try {
    return document.querySelector(selector) ?? undefined;
  } catch {
    return undefined;
  }
}

function coversPoint(rect: DOMRect, x: number, y: number): boolean {
  return rect.width > 0
    && rect.height > 0
    && x >= rect.left
    && x <= rect.right
    && y >= rect.top
    && y <= rect.bottom;
}

function zeroInset(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === '0px' || normalized === '0';
}

function fillsContainingBlock(style: CSSStyleDeclaration): boolean {
  if (style.position !== 'absolute' && style.position !== 'fixed') return false;
  return zeroInset(style.top)
    && zeroInset(style.right)
    && zeroInset(style.bottom)
    && zeroInset(style.left);
}

function positionedSiblingBackdropReason(element: Element, x: number, y: number): string | undefined {
  const parent = element.parentElement;
  if (!parent) return undefined;

  let inspected = 0;
  for (const candidate of parent.children) {
    if (candidate === element) continue;
    if (inspected >= MAX_SIBLING_BACKDROPS) break;
    inspected += 1;

    const style = getComputedStyle(candidate);
    if (!['absolute', 'fixed', 'sticky', 'relative'].includes(style.position)) continue;
    if (!paintedBackground(candidate)) continue;

    if (fillsContainingBlock(style)) {
      return 'A painted absolute/fixed sibling uses zero offsets on every side, so it fills its containing block and participates in the target backdrop. The effective contrast background cannot be reduced safely to the target ancestor chain.';
    }

    if (!coversPoint(candidate.getBoundingClientRect(), x, y)) continue;
    return 'A positioned painted sibling overlaps this target at its measured center point. Its final stacking/compositing relationship cannot be reconstructed safely from the target ancestor chain, so the effective contrast background remains ambiguous.';
  }
  return undefined;
}

function stackedBackdropReason(element: Element, document: Document): string | undefined {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return positionedSiblingBackdropReason(element, 0, 0);
  }
  const x = Math.min(Math.max(rect.left + rect.width / 2, 0), Math.max(0, window.innerWidth - 1));
  const y = Math.min(Math.max(rect.top + rect.height / 2, 0), Math.max(0, window.innerHeight - 1));

  if (typeof document.elementsFromPoint === 'function') {
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
    const element = targetFor(issue, document);
    const reason = element ? stackedBackdropReason(element, document) : undefined;
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