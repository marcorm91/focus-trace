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

function authoredInlineStyleValues(element: Element, property: string): string[] {
  const declaration = element.getAttribute('style');
  if (!declaration) return [];

  const values: string[] = [];
  for (const chunk of declaration.split(';')) {
    const separator = chunk.indexOf(':');
    if (separator < 0) continue;
    if (chunk.slice(0, separator).trim().toLowerCase() !== property) continue;
    const value = chunk.slice(separator + 1).trim();
    if (value) values.push(value);
  }
  return values;
}

function styleValues(
  element: Element,
  computed: CSSStyleDeclaration,
  inline: CSSStyleDeclaration | undefined,
  property: string,
): string[] {
  const computedValue = computed.getPropertyValue(property).trim();
  const inlineValue = inline?.getPropertyValue(property).trim() ?? '';
  // Some DOM implementations drop legacy or newer declarations from the CSSOM
  // even though browsers preserve them. Fall back to the authored inline value
  // only when the inline CSSOM did not expose that property.
  const authoredFallback = inlineValue ? [] : authoredInlineStyleValues(element, property);
  return [...new Set([computedValue, inlineValue, ...authoredFallback].filter(Boolean))];
}

function isZeroLegacyClip(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/px/g, '')
    .replace(/[,\s]+/g, ',');
  return normalized === 'rect(0,0,0,0)';
}

function clipsAllRenderedContent(
  element: Element,
  computed: CSSStyleDeclaration,
  inline: CSSStyleDeclaration | undefined,
): boolean {
  const clipValues = [computed.clip, inline?.clip, ...styleValues(element, computed, inline, 'clip')]
    .filter((value): value is string => Boolean(value?.trim()));
  if (clipValues.some(isZeroLegacyClip)) return true;

  const clipPaths = styleValues(element, computed, inline, 'clip-path').map(normalizedCssValue);
  return clipPaths.some((clipPath) => clipPath === 'inset(50%)'
    || clipPath === 'inset(50%50%50%50%)'
    || clipPath === 'inset(100%)'
    || clipPath === 'circle(0px)'
    || clipPath === 'circle(0%)');
}

function fullyTransparentFilter(
  element: Element,
  computed: CSSStyleDeclaration,
  inline: CSSStyleDeclaration | undefined,
): boolean {
  return styleValues(element, computed, inline, 'filter').some((filter) =>
    /opacity\(\s*(?:0(?:\.0+)?|0%)\s*\)/.test(filter.toLowerCase()),
  );
}

function hasZeroNumericStyle(
  element: Element,
  computed: CSSStyleDeclaration,
  inline: CSSStyleDeclaration | undefined,
  property: string,
): boolean {
  return styleValues(element, computed, inline, property).some((value) => {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) && numeric <= 0;
  });
}

function hasClippingOverflow(
  element: Element,
  computed: CSSStyleDeclaration,
  inline: CSSStyleDeclaration | undefined,
  axis: 'x' | 'y',
): boolean {
  const axisProperty = axis === 'x' ? 'overflow-x' : 'overflow-y';
  return [
    ...styleValues(element, computed, inline, axisProperty),
    ...styleValues(element, computed, inline, 'overflow'),
  ].some((value) => ['hidden', 'clip'].includes(value.toLowerCase()));
}

function suppressesVisualRendering(element: Element): boolean {
  const computed = getComputedStyle(element);
  const inline = inlineStyleFor(element);

  if (element.hasAttribute('hidden') || computed.display === 'none') return true;
  if (['hidden', 'collapse'].includes(computed.visibility)) return true;
  if (styleValues(element, computed, inline, 'content-visibility')
    .some((value) => value.toLowerCase() === 'hidden')) return true;

  if (hasZeroNumericStyle(element, computed, inline, 'opacity')) return true;
  if (fullyTransparentFilter(element, computed, inline)) return true;
  if (clipsAllRenderedContent(element, computed, inline)) return true;

  const zeroWidth = hasZeroNumericStyle(element, computed, inline, 'width');
  const zeroHeight = hasZeroNumericStyle(element, computed, inline, 'height');
  if (zeroWidth && zeroHeight
    && hasClippingOverflow(element, computed, inline, 'x')
    && hasClippingOverflow(element, computed, inline, 'y')) {
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
