import { accessibleName, selectorFor } from '../audit/dom';
import type { ElementAttributesSnapshot, ElementSnapshot } from '../../shared/types';

function snapshotAttributes(element: Element): ElementAttributesSnapshot | undefined {
  const attributes: ElementAttributesSnapshot = {};
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledby = element.getAttribute('aria-labelledby');
  const ariaDescribedby = element.getAttribute('aria-describedby');
  const tabindex = element.getAttribute('tabindex');
  const type = element.getAttribute('type');

  if (ariaLabel) attributes.ariaLabel = ariaLabel;
  if (ariaLabelledby) attributes.ariaLabelledby = ariaLabelledby;
  if (ariaDescribedby) attributes.ariaDescribedby = ariaDescribedby;
  if (tabindex != null && tabindex !== '') {
    const parsed = Number(tabindex);
    if (Number.isFinite(parsed)) attributes.tabIndex = parsed;
  }
  if (type) attributes.type = type;
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') attributes.disabled = true;
  if (element instanceof HTMLAnchorElement && element.href) attributes.href = element.href;

  return Object.keys(attributes).length ? attributes : undefined;
}

export function snapshot(element: Element): ElementSnapshot {
  const result: ElementSnapshot = {
    tag: element.tagName.toLowerCase(),
    selector: selectorFor(element),
  };
  if (element.id) result.id = element.id;
  const role = element.getAttribute('role');
  if (role) result.role = role;
  const attributes = snapshotAttributes(element);
  if (attributes) result.attributes = attributes;
  try {
    const name = accessibleName(element);
    if (name) result.name = name;
  } catch {
    // A detached mutation target can disappear while its snapshot is being built.
  }
  return result;
}

export function actionTarget(element: Element): Element {
  return element.closest('button, a[href], input, select, textarea, [role="button"], [role="link"], [tabindex]') ?? element;
}

export function findDialogs(root: Node): Element[] {
  if (!(root instanceof Element)) return [];
  const dialogs: Element[] = [];
  if (root.matches('dialog[open], [role="dialog"], [role="alertdialog"]')) dialogs.push(root);
  dialogs.push(...root.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]'));
  return dialogs;
}

export function findSignificantAddedElements(root: Node): Element[] {
  if (!(root instanceof Element)) return [];
  const candidates = [
    ...(root.matches('dialog, [role="dialog"], [role="alertdialog"], [autofocus]') ? [root] : []),
    ...root.querySelectorAll('dialog, [role="dialog"], [role="alertdialog"], [autofocus]'),
  ];
  return [...new Set(candidates)].slice(0, 6);
}

export function isDialogOpen(dialog: Element): boolean {
  if (!dialog.isConnected) return false;
  if (dialog instanceof HTMLDialogElement) return dialog.open;
  const style = getComputedStyle(dialog);
  return style.display !== 'none' && style.visibility === 'visible' && dialog.matches('[role="dialog"], [role="alertdialog"]');
}

export function isModalDialog(dialog: Element): boolean {
  if (dialog.getAttribute('aria-modal')?.toLowerCase() === 'true') return true;
  if (dialog instanceof HTMLDialogElement) {
    try {
      return dialog.matches(':modal');
    } catch {
      return dialog.open;
    }
  }
  return false;
}

export function mayBeCompletelyObscured(element: Element): { obscured: boolean; evidence?: string } {
  const rect = element.getBoundingClientRect();
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(window.innerWidth, rect.right);
  const bottom = Math.min(window.innerHeight, rect.bottom);
  if (right <= left || bottom <= top) return { obscured: false };

  const inset = 1;
  const xs = [left + inset, (left + right) / 2, right - inset].filter((x) => x >= left && x <= right);
  const ys = [top + inset, (top + bottom) / 2, bottom - inset].filter((y) => y >= top && y <= bottom);
  const points = xs.flatMap((x) => ys.map((y) => ({ x, y })));
  if (!points.length) return { obscured: false };

  const blockers = new Map<Element, number>();
  const covered = points.every(({ x, y }) => {
    const topCandidate = document.elementsFromPoint(x, y)[0];
    if (topCandidate && (topCandidate === element || element.contains(topCandidate))) return false;
    if (topCandidate && !topCandidate.contains(element) && !element.contains(topCandidate)) {
      blockers.set(topCandidate, (blockers.get(topCandidate) ?? 0) + 1);
    }
    return true;
  });

  if (!covered) return { obscured: false };
  const blocker = [...blockers.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    obscured: true,
    evidence: blocker
      ? `All sampled points were covered. Most common covering element: ${selectorFor(blocker)}.`
      : 'All sampled points were covered by other rendered content.',
  };
}
