import { isProgrammaticallyHidden, selectorFor } from '../audit/dom';

export interface FocusWalkCandidate {
  element: HTMLElement | SVGElement;
  selector: string;
  tabIndex: number;
  documentOrder: number;
}

const COMPONENT_FOCUS_SCOPE_ATTRIBUTE = 'data-focustrace-focus-component';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

function isDisabled(element: Element): boolean {
  if (element instanceof HTMLButtonElement) return element.disabled;
  if (element instanceof HTMLInputElement) return element.disabled || element.type.toLowerCase() === 'hidden';
  if (element instanceof HTMLSelectElement) return element.disabled;
  if (element instanceof HTMLTextAreaElement) return element.disabled;
  if (element instanceof HTMLOptGroupElement) return element.disabled;
  if (element instanceof HTMLOptionElement) return element.disabled;
  return element.getAttribute('aria-disabled')?.trim().toLowerCase() === 'true';
}

function hasRenderedBox(element: Element): boolean {
  const rects = element.getClientRects();
  if (rects.length === 0) return false;
  return [...rects].some((rect) => rect.width > 0 && rect.height > 0);
}

function isVisibleFocusable(element: Element): element is HTMLElement | SVGElement {
  if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return false;
  if (!element.isConnected) return false;
  if (isDisabled(element)) return false;
  if (isProgrammaticallyHidden(element)) return false;
  if (!hasRenderedBox(element)) return false;
  return element.tabIndex >= 0;
}

function activeComponentFocusRoot(): ParentNode | null {
  const raw = document.documentElement.getAttribute(COMPONENT_FOCUS_SCOPE_ATTRIBUTE);
  if (!raw) return document;

  try {
    const parsed = JSON.parse(raw) as { selector?: unknown };
    if (typeof parsed.selector !== 'string' || !parsed.selector) return null;
    return document.querySelector(parsed.selector);
  } catch {
    return null;
  }
}

export function focusWalkCandidates(root?: ParentNode): FocusWalkCandidate[] {
  const effectiveRoot = root ?? activeComponentFocusRoot();
  if (!effectiveRoot) return [];

  const descendants = [...effectiveRoot.querySelectorAll(FOCUSABLE_SELECTOR)];
  const all = effectiveRoot instanceof Element && effectiveRoot.matches(FOCUSABLE_SELECTOR)
    ? [effectiveRoot, ...descendants]
    : descendants;
  const candidates = all
    .map((element, documentOrder) => ({ element, documentOrder }))
    .filter((item): item is { element: HTMLElement | SVGElement; documentOrder: number } => isVisibleFocusable(item.element));

  return candidates
    .map(({ element, documentOrder }) => ({
      element,
      selector: selectorFor(element),
      tabIndex: element.tabIndex,
      documentOrder,
    }))
    .sort((a, b) => {
      const aPositive = a.tabIndex > 0;
      const bPositive = b.tabIndex > 0;
      if (aPositive && bPositive && a.tabIndex !== b.tabIndex) return a.tabIndex - b.tabIndex;
      if (aPositive !== bPositive) return aPositive ? -1 : 1;
      return a.documentOrder - b.documentOrder;
    });
}

export function sequentialFocusPosition(
  element: Element,
  root: ParentNode = document,
): { index: number; size: number } | undefined {
  const candidates = focusWalkCandidates(root);
  const index = candidates.findIndex((candidate) => candidate.element === element);
  if (index < 0) return undefined;
  return { index: index + 1, size: candidates.length };
}

export function isFocusWalkCandidateStillUsable(element: Element): element is HTMLElement | SVGElement {
  return isVisibleFocusable(element);
}
