export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface TextContrastEvaluation {
  status: 'pass' | 'fail' | 'review' | 'inapplicable';
  ratio?: number;
  requiredRatio?: number;
  foreground?: string;
  background?: string;
  fontSizePx?: number;
  fontWeight?: number;
  largeText?: boolean;
  reason?: string;
}

const WHITE: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseChannel(value: string): number | undefined {
  const token = value.trim();
  if (token.endsWith('%')) {
    const percent = Number.parseFloat(token);
    return Number.isFinite(percent) ? clamp((percent / 100) * 255, 0, 255) : undefined;
  }
  const numeric = Number.parseFloat(token);
  return Number.isFinite(numeric) ? clamp(numeric, 0, 255) : undefined;
}

function parseAlpha(value: string | undefined): number | undefined {
  if (value == null) return 1;
  const token = value.trim();
  if (token.endsWith('%')) {
    const percent = Number.parseFloat(token);
    return Number.isFinite(percent) ? clamp(percent / 100, 0, 1) : undefined;
  }
  const numeric = Number.parseFloat(token);
  return Number.isFinite(numeric) ? clamp(numeric, 0, 1) : undefined;
}

export function parseCssColor(value: string): RgbaColor | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hex = normalized.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3 || hex.length === 4
      ? [...hex].map((character) => character + character).join('')
      : hex;
    if (expanded.length !== 6 && expanded.length !== 8) return undefined;
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      a: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
  }

  const functional = normalized.match(/^rgba?\((.*)\)$/i)?.[1];
  if (!functional) return undefined;
  const slashParts = functional.split('/').map((part) => part.trim());
  const colorPart = slashParts[0];
  if (!colorPart) return undefined;
  const colorTokens = colorPart.includes(',')
    ? colorPart.split(',').map((part) => part.trim())
    : colorPart.split(/\s+/).filter(Boolean);
  if (colorTokens.length < 3) return undefined;

  let alphaToken = slashParts[1];
  if (!alphaToken && colorTokens.length >= 4) alphaToken = colorTokens[3];
  const r = parseChannel(colorTokens[0]!);
  const g = parseChannel(colorTokens[1]!);
  const b = parseChannel(colorTokens[2]!);
  const a = parseAlpha(alphaToken);
  if (r == null || g == null || b == null || a == null) return undefined;
  return { r, g, b, a };
}

export function compositeColor(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const outputAlpha = foreground.a + background.a * (1 - foreground.a);
  if (outputAlpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (front: number, back: number) =>
    (front * foreground.a + back * background.a * (1 - foreground.a)) / outputAlpha;
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: outputAlpha,
  };
}

function linearChannel(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: RgbaColor): number {
  return 0.2126 * linearChannel(color.r) + 0.7152 * linearChannel(color.g) + 0.0722 * linearChannel(color.b);
}

export function contrastRatio(first: RgbaColor, second: RgbaColor): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function textContrastRequirement(fontSizePx: number, fontWeight: number): { largeText: boolean; requiredRatio: number } {
  const largeText = fontSizePx >= 24 || (fontSizePx >= 18.6667 && fontWeight >= 700);
  return { largeText, requiredRatio: largeText ? 3 : 4.5 };
}

function numericFontWeight(value: string): number {
  if (value === 'bold' || value === 'bolder') return 700;
  if (value === 'normal' || value === 'lighter') return 400;
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : 400;
}

function colorLabel(color: RgbaColor): string {
  const r = Math.round(color.r);
  const g = Math.round(color.g);
  const b = Math.round(color.b);
  if (color.a >= 0.999) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${Number(color.a.toFixed(3))})`;
}

function complexVisualReason(style: CSSStyleDeclaration): string | undefined {
  if (style.backgroundImage && style.backgroundImage !== 'none') return 'A background image or gradient affects the rendered background.';
  const opacity = Number.parseFloat(style.opacity || '1');
  if (Number.isFinite(opacity) && opacity < 0.999) return 'Element or ancestor opacity affects the rendered colors.';
  if (style.mixBlendMode && style.mixBlendMode !== 'normal') return 'mix-blend-mode affects the rendered colors.';
  if (style.filter && style.filter !== 'none') return 'A CSS filter affects the rendered colors.';
  return undefined;
}

function effectiveBackground(element: Element): { color?: RgbaColor; reason?: string } {
  const layers: RgbaColor[] = [];
  let current: Element | null = element;
  while (current) {
    const style = getComputedStyle(current);
    const complex = complexVisualReason(style);
    if (complex) return { reason: complex };
    const background = parseCssColor(style.backgroundColor);
    if (!background) return { reason: `Background color ${JSON.stringify(style.backgroundColor)} could not be resolved.` };
    if (background.a > 0) layers.push(background);
    current = current.parentElement;
  }

  let result = WHITE;
  for (const layer of layers.reverse()) result = compositeColor(layer, result);
  return { color: result };
}

export function evaluateTextContrastForElement(element: Element): TextContrastEvaluation {
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
    return { status: 'inapplicable' };
  }

  const foreground = parseCssColor(style.color);
  // Browsers normally resolve computed colors to rgb/rgba. If an environment leaves
  // a system color keyword unresolved, do not manufacture a conformance result.
  if (!foreground) return { status: 'inapplicable', reason: `Text color ${JSON.stringify(style.color)} could not be resolved.` };

  const fontSizePx = Number.parseFloat(style.fontSize);
  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) return { status: 'inapplicable' };
  const fontWeight = numericFontWeight(style.fontWeight);
  const requirement = textContrastRequirement(fontSizePx, fontWeight);

  const complexOnText = complexVisualReason(style);
  if (complexOnText) {
    return {
      status: 'review',
      requiredRatio: requirement.requiredRatio,
      foreground: colorLabel(foreground),
      fontSizePx,
      fontWeight,
      largeText: requirement.largeText,
      reason: complexOnText,
    };
  }

  const backgroundResult = effectiveBackground(element);
  if (!backgroundResult.color) {
    return {
      status: 'review',
      requiredRatio: requirement.requiredRatio,
      foreground: colorLabel(foreground),
      fontSizePx,
      fontWeight,
      largeText: requirement.largeText,
      reason: backgroundResult.reason ?? 'The rendered background could not be resolved reliably.',
    };
  }

  const renderedForeground = foreground.a < 0.999
    ? compositeColor(foreground, backgroundResult.color)
    : foreground;
  const ratio = contrastRatio(renderedForeground, backgroundResult.color);
  const roundedRatio = Number(ratio.toFixed(2));

  return {
    status: ratio + Number.EPSILON >= requirement.requiredRatio ? 'pass' : 'fail',
    ratio: roundedRatio,
    requiredRatio: requirement.requiredRatio,
    foreground: colorLabel(renderedForeground),
    background: colorLabel(backgroundResult.color),
    fontSizePx,
    fontWeight,
    largeText: requirement.largeText,
  };
}

export function elementHasRenderedText(element: Element): boolean {
  if ([...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()))) return true;
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    return ['button', 'submit', 'reset'].includes(type) && Boolean(element.value.trim());
  }
  return false;
}
