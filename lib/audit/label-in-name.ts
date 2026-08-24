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

export interface LabelInNameEvaluation {
  element: Element;
  visibleLabel: string;
  accessibleName: string;
  matches: boolean;
}

function normalise(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function comparisonValue(value: string): string {
  return normalise(value).toLocaleLowerCase();
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

  for (const element of [...document.querySelectorAll('button, a[href], [role]')]) {
    const role = semanticRole(element);
    if (!role || !NAME_FROM_CONTENT_WIDGET_ROLES.has(role)) continue;
    if (isProgrammaticallyHidden(element)) continue;
    if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) continue;

    const visibleLabel = visibleTextLabel(element);
    if (!visibleLabel) continue;

    const accessibleName = accessibleNameDetails(element).name;
    const visible = comparisonValue(visibleLabel);
    const name = comparisonValue(accessibleName);

    evaluations.push({
      element,
      visibleLabel,
      accessibleName,
      matches: visible.length > 0 && name.includes(visible),
    });
  }

  return evaluations;
}
