import { accessibleNameDetails, isProgrammaticallyHidden, semanticRole } from './dom';

const NAME_FROM_CONTENT_WIDGET_ROLES = new Set([
  'button',
  'checkbox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'switch',
  'tab',
  'treeitem',
]);

export type LabelInNameOutcome = 'pass' | 'warning' | 'fail';

export interface LabelInNameEvaluation {
  element: Element;
  visibleLabel: string;
  accessibleName: string;
  matches: boolean;
  outcome: LabelInNameOutcome;
  reason?: string;
}

function normalise(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function comparisonValue(value: string): string {
  return normalise(value).toLocaleLowerCase();
}

function comparisonTokens(value: string): string[] {
  return comparisonValue(value).match(/[\p{L}\p{N}]+/gu) ?? [];
}

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

function containsLetter(token: string): boolean {
  return /\p{L}/u.test(token);
}

function isAuxiliaryVisibleLabel(tokens: string[]): boolean {
  if (!tokens.length) return false;
  return tokens.every((token) => !containsLetter(token));
}

function sharedTokenRatio(visibleLabel: string, accessibleName: string): number {
  const visibleTokens = uniqueTokens(comparisonTokens(visibleLabel));
  if (!visibleTokens.length) return 0;

  const nameTokens = new Set(comparisonTokens(accessibleName));
  const shared = visibleTokens.filter((token) => nameTokens.has(token));
  return shared.length / visibleTokens.length;
}

function labelInNameOutcome(visibleLabel: string, accessibleName: string): { outcome: LabelInNameOutcome; reason?: string } {
  const visible = comparisonValue(visibleLabel);
  const name = comparisonValue(accessibleName);
  if (visible.length > 0 && name.includes(visible)) return { outcome: 'pass' };

  const visibleTokens = comparisonTokens(visibleLabel);
  if (isAuxiliaryVisibleLabel(visibleTokens)) {
    return {
      outcome: 'warning',
      reason: 'The visible text looks like auxiliary metadata, such as a counter or badge, rather than the primary control label.',
    };
  }

  const ratio = sharedTokenRatio(visibleLabel, accessibleName);
  if (ratio >= 0.5) {
    return {
      outcome: 'warning',
      reason: `The accessible name shares ${Math.round(ratio * 100)}% of the visible-label tokens, but the full visible label is not contained as written.`,
    };
  }

  return { outcome: 'fail' };
}

function isVisuallyHidden(element: Element): boolean {
  const style = getComputedStyle(element);
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse' ||
    style.getPropertyValue('content-visibility') === 'hidden'
  );
}

export function visibleTextLabel(element: Element): string {
  const pieces: string[] = [];

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pieces.push(node.textContent ?? '');
      return;
    }

    if (!(node instanceof Element) || isVisuallyHidden(node)) return;
    for (const child of node.childNodes) visit(child);
  };

  for (const child of element.childNodes) visit(child);
  return normalise(pieces.join(' '));
}

export function evaluateLabelInName(): LabelInNameEvaluation[] {
  const evaluations: LabelInNameEvaluation[] = [];

  for (const element of document.querySelectorAll('button, a[href], [role]')) {
    const role = semanticRole(element);
    if (!role || !NAME_FROM_CONTENT_WIDGET_ROLES.has(role)) continue;
    if (isProgrammaticallyHidden(element)) continue;
    if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) continue;

    const visibleLabel = visibleTextLabel(element);
    if (!visibleLabel) continue;

    const accessibleName = accessibleNameDetails(element).name;
    const { outcome, reason } = labelInNameOutcome(visibleLabel, accessibleName);

    evaluations.push({
      element,
      visibleLabel,
      accessibleName,
      matches: outcome === 'pass',
      outcome,
      ...(reason ? { reason } : {}),
    });
  }

  return evaluations;
}
