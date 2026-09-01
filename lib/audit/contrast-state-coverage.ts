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

function inlineStyleFor(element: Element): CSSStyleDeclaration | undefined {
  return element instanceof HTMLElement || element instanceof SVGElement
    ? element.style
    : undefined;
}

function styleValue(
  computed: CSSStyleDeclaration,
  inline: CSSStyleDeclaration | undefined,
  property: string,
): string {
  return computed.getPropertyValue(property) || inline?.getPropertyValue(property) || '';
}

function clipsAllRenderedContent(
  computed: CSSStyleDeclaration,
  inline: CSSStyleDeclaration | undefined,
): boolean {
  const clip = normalizedCssValue(computed.clip || inline?.clip);
  if (clip === 'rect(0px,0px,0px,0px)' || clip === 'rect(0,0,0,0)') return true;

  const clipPath = normalizedCssValue(styleValue(computed, inline, 'clip-path'));
  return clipPath === 'inset(50%)'
    || clipPath === 'inset(50%50%50%50%)'
    || clipPath === 'inset(100%)'
    || clipPath === 'circle(0px)'
    || clipPath === 'circle(0%)';
}

function fullyTransparentFilter(
  computed: CSSStyleDeclaration,
  inline: CSSStyleDeclaration | undefined,
): boolean {
  const filter = (computed.filter || inline?.filter || '').toLowerCase();
  return /opacity\(\s*(?:0(?:\.0+)?|0%)\s*\)/.test(filter);
}

function suppressesVisualRendering(element: Element): boolean {
  const computed = getComputedStyle(element);
  const inline = inlineStyleFor(element);

  if (computed.display === 'none') return true;
  if (styleValue(computed, inline, 'content-visibility').trim().toLowerCase() === 'hidden') return true;

  const opacity = Number.parseFloat(computed.opacity || inline?.opacity || '1');
  if (Number.isFinite(opacity) && opacity <= 0) return true;
  if (fullyTransparentFilter(computed, inline)) return true;
  if (clipsAllRenderedContent(computed, inline)) return true;

  const width = Number.parseFloat(computed.width || inline?.width || '');
  const height = Number.parseFloat(computed.height || inline?.height || '');
  const overflowX = (computed.overflowX || inline?.overflowX || computed.overflow || inline?.overflow || '').toLowerCase();
  const overflowY = (computed.overflowY || inline?.overflowY || computed.overflow || inline?.overflow || '').toLowerCase();
  if (width === 0 && height === 0 && ['hidden', 'clip'].includes(overflowX) && ['hidden', 'clip'].includes(overflowY)) {
    return true;
  }

  return false;
}

function hiddenByClosedDetails(element: Element): boolean {
  let current: Element | null = element;
  while (current?.parentElement) {
    const parentElement: Element = current.parentElement;
    if (parentElement instanceof HTMLDetailsElement && !parentElement.open) {
      const renderedSummary = [...parentElement.children].find((child) => child.tagName === 'SUMMARY');
      if (current !== renderedSummary) return true;
    }
    current = parentElement;
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
    if (suppressesVisualRendering(current)) return true;
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
