import { parseCssColor } from './contrast';
import { isDisabledUiComponent } from './dom';

export type ContrastStateName =
  | 'hover'
  | 'active'
  | 'focus'
  | 'focus-visible'
  | 'checked'
  | 'unchecked'
  | 'expanded'
  | 'collapsed'
  | 'selected'
  | 'unselected'
  | 'pressed'
  | 'unpressed';

function normalizedCssValue(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, '').toLowerCase();
}

function clipsAllRenderedContent(style: CSSStyleDeclaration): boolean {
  const clip = normalizedCssValue(style.clip);
  if (clip === 'rect(0px,0px,0px,0px)' || clip === 'rect(0,0,0,0)') return true;

  const clipPath = normalizedCssValue(
    style.getPropertyValue('clip-path') || (style as CSSStyleDeclaration & { clipPath?: string }).clipPath,
  );
  return clipPath === 'inset(50%)'
    || clipPath === 'inset(50%50%50%50%)'
    || clipPath === 'inset(100%)'
    || clipPath === 'circle(0px)'
    || clipPath === 'circle(0%)';
}

function fullyTransparentFilter(style: CSSStyleDeclaration): boolean {
  const filter = style.filter?.toLowerCase() ?? '';
  return /opacity\(\s*(?:0(?:\.0+)?|0%)\s*\)/.test(filter);
}

function suppressesVisualRendering(style: CSSStyleDeclaration): boolean {
  if (style.display === 'none') return true;
  if (style.getPropertyValue('content-visibility').trim().toLowerCase() === 'hidden') return true;

  const opacity = Number.parseFloat(style.opacity || '1');
  if (Number.isFinite(opacity) && opacity <= 0) return true;
  if (fullyTransparentFilter(style)) return true;
  if (clipsAllRenderedContent(style)) return true;

  const width = Number.parseFloat(style.width);
  const height = Number.parseFloat(style.height);
  const overflowX = (style.overflowX || style.overflow).toLowerCase();
  const overflowY = (style.overflowY || style.overflow).toLowerCase();
  if (width === 0 && height === 0 && ['hidden', 'clip'].includes(overflowX) && ['hidden', 'clip'].includes(overflowY)) {
    return true;
  }

  return false;
}

function hiddenByClosedDetails(element: Element): boolean {
  let current: Element | null = element;
  while (current?.parentElement) {
    const parent = current.parentElement;
    if (parent instanceof HTMLDetailsElement && !parent.open) {
      const renderedSummary = [...parent.children].find((child) => child.tagName === 'SUMMARY');
      if (current !== renderedSummary) return true;
    }
    current = parent;
  }
  return false;
}

/**
 * Returns whether text contrast is inapplicable in the element's current
 * rendered state. This intentionally does not use viewport intersection:
 * content below the fold or outside the current scroll position still needs
 * contrast once the user reaches it.
 */
export function isInactiveContrastElement(element: Element): boolean {
  if (isDisabledUiComponent(element) || hiddenByClosedDetails(element)) return true;

  const targetStyle = getComputedStyle(element);
  if (targetStyle.visibility === 'hidden' || targetStyle.visibility === 'collapse') return true;

  const fontSize = Number.parseFloat(targetStyle.fontSize);
  if (Number.isFinite(fontSize) && fontSize <= 0) return true;

  const textColor = parseCssColor(targetStyle.color);
  if (textColor && textColor.a <= 0) return true;

  let current: Element | null = element;
  while (current) {
    if (suppressesVisualRendering(getComputedStyle(current))) return true;
    current = current.parentElement;
  }

  return false;
}

/**
 * Describes only states that are active in the rendered DOM at scan time.
 *
 * FocusTrace deliberately does not infer contrast from authored selectors for
 * inactive states. Their final colors depend on the live cascade, inheritance,
 * compositing and application state, so treating CSS declarations as rendered
 * evidence creates false positives.
 */
export function observedContrastStates(element: Element): ContrastStateName[] {
  const states: ContrastStateName[] = [];
  const match = (selector: string) => {
    try { return element.matches(selector); } catch { return false; }
  };
  if (match(':hover')) states.push('hover');
  if (match(':active')) states.push('active');
  if (match(':focus-visible')) states.push('focus-visible');
  else if (match(':focus')) states.push('focus');

  const nativeCheckable = element instanceof HTMLInputElement
    && ['checkbox', 'radio'].includes(element.type.toLowerCase());
  if ((nativeCheckable && element.checked) || element.getAttribute('aria-checked') === 'true') states.push('checked');
  else if ((nativeCheckable && !element.checked) || element.getAttribute('aria-checked') === 'false') states.push('unchecked');

  if (element.getAttribute('aria-expanded') === 'true') states.push('expanded');
  else if (element.getAttribute('aria-expanded') === 'false') states.push('collapsed');
  if (element.getAttribute('aria-selected') === 'true') states.push('selected');
  else if (element.getAttribute('aria-selected') === 'false') states.push('unselected');
  if (element.getAttribute('aria-pressed') === 'true') states.push('pressed');
  else if (element.getAttribute('aria-pressed') === 'false') states.push('unpressed');
  return states;
}
