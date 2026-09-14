import { RULES } from '../../shared/rule-catalog';
import type { ScanIssue, ScanResult } from '../../shared/types';

const CONTRAST_RULE_IDS = new Set([RULES.textContrast.id, RULES.nonTextContrast.id]);
const MAX_STACK_CHECKS = 100;

function paintedBackground(element: Element): boolean {
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  if (style.backgroundImage && style.backgroundImage !== 'none') return true;
  const color = style.backgroundColor.trim().toLowerCase();
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return false;
  const alpha = color.match(/rgba?\([^\)]*[,\s/]\s*([\d.]+)\s*\)$/)?.[1];
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

function stackedBackdropReason(element: Element, document: Document): string | undefined {
  if (typeof document.elementsFromPoint !== 'function') return undefined;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;
  const x = Math.min(Math.max(rect.left + rect.width / 2, 0), Math.max(0, window.innerWidth - 1));
  const y = Math.min(Math.max(rect.top + rect.height / 2, 0), Math.max(0, window.innerHeight - 1));
  const stack = document.elementsFromPoint(x, y);
  const ownIndex = stack.findIndex((candidate) => candidate === element || element.contains(candidate));
  if (ownIndex < 0) return undefined;

  for (const candidate of stack.slice(ownIndex + 1)) {
    if (candidate === document.documentElement || candidate === document.body) continue;
    if (element.contains(candidate) || candidate.contains(element)) continue;
    if (!paintedBackground(candidate)) continue;
    return 'A separately stacked painted element is rendered behind this target, so the effective contrast background cannot be reduced safely to the target ancestor chain.';
  }
  return undefined;
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
