export type TextSpacingProperty = 'letter-spacing' | 'word-spacing' | 'line-height';

export interface TextSpacingEvaluation {
  element: HTMLElement;
  property: TextSpacingProperty;
  outcome: 'pass' | 'review';
  specifiedValue: string;
  computedValue: string;
  fontSizePx: number;
  requiredPx: number;
  observedPx?: number;
  detail: string;
}

const REQUIRED_RATIO: Record<TextSpacingProperty, number> = {
  'letter-spacing': 0.12,
  'word-spacing': 0.16,
  'line-height': 1.5,
};

const CSS_WIDE_INHERITING_VALUES = new Set(['inherit', 'unset', 'revert', 'revert-layer']);
const CODE_LIKE_SELECTOR = 'code, pre, samp, kbd, var';

function allElements(root: Document | Element): HTMLElement[] {
  const elements: HTMLElement[] = [];
  if (root instanceof HTMLElement) elements.push(root);
  for (const element of root.querySelectorAll('[style]')) {
    if (!(element instanceof HTMLElement) || elements.includes(element)) continue;
    elements.push(element);
  }
  return elements.filter((element) => element.hasAttribute('style'));
}

function transparentColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'transparent') return true;
  const rgba = normalized.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/);
  return rgba ? Number(rgba[1]) <= 0 : false;
}

function elementHasRenderedTextContext(element: HTMLElement): boolean {
  if (element.closest(CODE_LIKE_SELECTOR)) return false;
  let current: HTMLElement | null = element;
  while (current) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (Number(style.opacity) === 0) return false;
    current = current.parentElement;
  }
  const style = getComputedStyle(element);
  if (transparentColor(style.color)) return false;
  if (style.clipPath && style.clipPath !== 'none') return false;
  if (style.clip && style.clip !== 'auto') return false;
  return true;
}

function reachableRect(rect: DOMRect): boolean {
  if (rect.width <= 0 || rect.height <= 0) return false;
  const documentElement = document.documentElement;
  const maxWidth = Math.max(documentElement.scrollWidth, documentElement.clientWidth, window.innerWidth || 0);
  const maxHeight = Math.max(documentElement.scrollHeight, documentElement.clientHeight, window.innerHeight || 0);
  const left = rect.left + window.scrollX;
  const right = rect.right + window.scrollX;
  const top = rect.top + window.scrollY;
  const bottom = rect.bottom + window.scrollY;
  return right > 0 && bottom > 0 && left < maxWidth && top < maxHeight;
}

function rectsForTextNode(node: Text): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(node);
  const getClientRects = (range as Range & { getClientRects?: () => DOMRectList }).getClientRects;
  if (typeof getClientRects !== 'function') return [];
  return [...getClientRects.call(range)].filter(reachableRect);
}

function directVisibleTextNodes(element: HTMLElement): Text[] {
  if (!elementHasRenderedTextContext(element)) return [];
  return [...element.childNodes]
    .filter((node): node is Text => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()))
    .filter((node) => rectsForTextNode(node).length > 0);
}

function textNodeHasSoftWrap(node: Text, element: HTMLElement): boolean {
  const whiteSpace = getComputedStyle(element).whiteSpace;
  if (/^(?:pre|pre-wrap|pre-line|break-spaces)$/.test(whiteSpace) && /[\r\n]/.test(node.data)) return false;
  const lineTops: number[] = [];
  for (const rect of rectsForTextNode(node)) {
    if (!lineTops.some((top) => Math.abs(top - rect.top) < 1)) lineTops.push(rect.top);
    if (lineTops.length >= 2) return true;
  }
  return false;
}

function pxValue(value: string): number | undefined {
  const match = value.trim().match(/^(-?(?:\d+|\d*\.\d+))px$/i);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function computedSpacingPx(property: TextSpacingProperty, computedValue: string): number | undefined {
  if (computedValue === 'normal') {
    if (property === 'letter-spacing' || property === 'word-spacing') return 0;
    return undefined;
  }
  return pxValue(computedValue);
}

function applicableDeclaration(element: HTMLElement, property: TextSpacingProperty): string | undefined {
  const specifiedValue = element.style.getPropertyValue(property).trim();
  if (!specifiedValue || element.style.getPropertyPriority(property) !== 'important') return undefined;
  if (CSS_WIDE_INHERITING_VALUES.has(specifiedValue.toLowerCase())) return undefined;
  return specifiedValue;
}

function evaluateProperty(
  element: HTMLElement,
  property: TextSpacingProperty,
  visibleTextNodes: Text[],
): TextSpacingEvaluation | undefined {
  const specifiedValue = applicableDeclaration(element, property);
  if (!specifiedValue) return undefined;
  if (property === 'line-height' && !visibleTextNodes.some((node) => textNodeHasSoftWrap(node, element))) return undefined;

  const computed = getComputedStyle(element);
  const fontSizePx = pxValue(computed.fontSize);
  if (!fontSizePx || fontSizePx <= 0) return undefined;
  const computedValue = computed.getPropertyValue(property).trim();
  const requiredPx = fontSizePx * REQUIRED_RATIO[property];
  const observedPx = computedSpacingPx(property, computedValue);

  if (property === 'line-height' && computedValue === 'normal') {
    return {
      element,
      property,
      outcome: 'review',
      specifiedValue,
      computedValue,
      fontSizePx,
      requiredPx,
      detail: `Inline ${property}: ${specifiedValue} !important computes to normal on wrapped text; ACT 78fd32 treats normal line height as below the 1.5 × font-size expectation.`,
    };
  }
  if (observedPx == null) return undefined;

  const outcome = observedPx + 0.01 >= requiredPx ? 'pass' : 'review';
  const ratio = observedPx / fontSizePx;
  return {
    element,
    property,
    outcome,
    specifiedValue,
    computedValue,
    fontSizePx,
    requiredPx,
    observedPx,
    detail: `Inline ${property}: ${specifiedValue} !important; computed ${computedValue}; ${ratio.toFixed(3)} × font-size; required at least ${REQUIRED_RATIO[property].toFixed(2)} × font-size.`,
  };
}

export function evaluateTextSpacing(root: Document | Element): TextSpacingEvaluation[] {
  const evaluations: TextSpacingEvaluation[] = [];
  for (const element of allElements(root)) {
    const visibleTextNodes = directVisibleTextNodes(element);
    if (!visibleTextNodes.length) continue;
    for (const property of ['letter-spacing', 'word-spacing', 'line-height'] as const) {
      const evaluation = evaluateProperty(element, property, visibleTextNodes);
      if (evaluation) evaluations.push(evaluation);
    }
  }
  return evaluations;
}
