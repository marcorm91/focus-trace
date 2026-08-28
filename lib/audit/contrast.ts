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

export type TextContrastPseudo = '::before' | '::after' | '::placeholder';

export interface TextContrastSubject {
  subject: 'text' | 'input value' | 'textarea value' | 'selected option' | 'placeholder' | 'generated text';
  pseudo?: TextContrastPseudo;
}

export interface AccessibleColorSuggestion {
  hex: string;
  rgb: string;
  ratio: number;
  direction: 'darker' | 'lighter';
}

const WHITE: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };

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

function integerColor(color: RgbaColor): RgbaColor {
  return {
    r: Math.round(clamp(color.r, 0, 255)),
    g: Math.round(clamp(color.g, 0, 255)),
    b: Math.round(clamp(color.b, 0, 255)),
    a: color.a,
  };
}

export function colorToRgb(color: RgbaColor): string {
  const normalized = integerColor(color);
  if (normalized.a >= 0.999) return `rgb(${normalized.r}, ${normalized.g}, ${normalized.b})`;
  return `rgba(${normalized.r}, ${normalized.g}, ${normalized.b}, ${Number(normalized.a.toFixed(3))})`;
}

export function colorToHex(color: RgbaColor): string {
  const normalized = integerColor(color);
  const channel = (value: number) => value.toString(16).padStart(2, '0');
  const rgb = `#${channel(normalized.r)}${channel(normalized.g)}${channel(normalized.b)}`;
  if (normalized.a >= 0.999) return rgb;
  return `${rgb}${channel(Math.round(normalized.a * 255))}`;
}

function colorLabel(color: RgbaColor): string {
  return colorToRgb(color);
}

function mixToward(color: RgbaColor, target: RgbaColor, amount: number): RgbaColor {
  return integerColor({
    r: color.r + (target.r - color.r) * amount,
    g: color.g + (target.g - color.g) * amount,
    b: color.b + (target.b - color.b) * amount,
    a: 1,
  });
}

function rgbDistance(first: RgbaColor, second: RgbaColor): number {
  return Math.hypot(first.r - second.r, first.g - second.g, first.b - second.b);
}

function firstAccessibleToward(
  foreground: RgbaColor,
  background: RgbaColor,
  requiredRatio: number,
  target: RgbaColor,
  direction: AccessibleColorSuggestion['direction'],
): { color: RgbaColor; ratio: number; distance: number; direction: AccessibleColorSuggestion['direction'] } | undefined {
  if (contrastRatio(target, background) + Number.EPSILON < requiredRatio) return undefined;

  let previousKey = '';
  for (let step = 1; step <= 255; step += 1) {
    const candidate = mixToward(foreground, target, step / 255);
    const key = `${candidate.r},${candidate.g},${candidate.b}`;
    if (key === previousKey) continue;
    previousKey = key;
    const ratio = contrastRatio(candidate, background);
    if (ratio + Number.EPSILON >= requiredRatio) {
      return { color: candidate, ratio, distance: rgbDistance(foreground, candidate), direction };
    }
  }
  return undefined;
}

/**
 * Suggest the smallest deterministic sRGB adjustment toward black or white
 * that reaches the requested contrast against a resolved opaque background.
 * This deliberately avoids claiming a global perceptual nearest-color result.
 */
export function suggestAccessibleForeground(
  foregroundValue: string,
  backgroundValue: string,
  requiredRatio: number,
): AccessibleColorSuggestion | undefined {
  const foreground = parseCssColor(foregroundValue);
  const background = parseCssColor(backgroundValue);
  if (!foreground || !background || foreground.a < 0.999 || background.a < 0.999) return undefined;
  if (contrastRatio(foreground, background) + Number.EPSILON >= requiredRatio) {
    return {
      hex: colorToHex(foreground),
      rgb: colorToRgb(foreground),
      ratio: Number(contrastRatio(foreground, background).toFixed(2)),
      direction: 'darker',
    };
  }

  const darker = firstAccessibleToward(foreground, background, requiredRatio, BLACK, 'darker');
  const lighter = firstAccessibleToward(foreground, background, requiredRatio, WHITE, 'lighter');
  const candidates = [darker, lighter].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  candidates.sort((first, second) => first.distance - second.distance || first.ratio - second.ratio);
  const best = candidates[0];
  if (!best) return undefined;

  return {
    hex: colorToHex(best.color),
    rgb: colorToRgb(best.color),
    ratio: Number(best.ratio.toFixed(2)),
    direction: best.direction,
  };
}

export function complexVisualReason(style: CSSStyleDeclaration): string | undefined {
  if (style.backgroundImage && style.backgroundImage !== 'none') return 'A background image or gradient affects the rendered background.';
  const opacity = Number.parseFloat(style.opacity || '1');
  if (Number.isFinite(opacity) && opacity < 0.999) return 'Element or ancestor opacity affects the rendered colors.';
  if (style.mixBlendMode && style.mixBlendMode !== 'normal') return 'mix-blend-mode affects the rendered colors.';
  if (style.filter && style.filter !== 'none') return 'A CSS filter affects the rendered colors.';
  return undefined;
}

export function effectiveBackground(element: Element): { color?: RgbaColor; reason?: string } {
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

export function evaluateTextContrastForElement(
  element: Element,
  pseudo?: TextContrastPseudo,
): TextContrastEvaluation {
  // jsdom does not implement pseudo-element computed styles. Falling back to
  // the host control keeps unit tests deterministic; real extension contexts
  // always ask the browser for the actual ::placeholder style.
  const style = pseudo && !navigator.userAgent.toLowerCase().includes('jsdom')
    ? getComputedStyle(element, pseudo)
    : getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
    return { status: 'inapplicable' };
  }

  const fontSizePx = Number.parseFloat(style.fontSize);
  const fontWeight = numericFontWeight(style.fontWeight);
  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) {
    return {
      status: 'review',
      requiredRatio: 4.5,
      fontWeight,
      reason: `Text size ${JSON.stringify(style.fontSize)} could not be resolved.`,
    };
  }
  const requirement = textContrastRequirement(fontSizePx, fontWeight);

  const foreground = parseCssColor(style.color);
  // Computed colors normally serialize to rgb/rgba. Preserve unresolved system
  // colors and future color syntaxes as review evidence instead of silently
  // dropping visible text from the scan.
  if (!foreground) {
    return {
      status: 'review',
      requiredRatio: requirement.requiredRatio,
      fontSizePx,
      fontWeight,
      largeText: requirement.largeText,
      reason: `Text color ${JSON.stringify(style.color)} could not be resolved.`,
    };
  }

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

  let resolvedBackground = backgroundResult.color;
  if (pseudo) {
    const pseudoBackground = parseCssColor(style.backgroundColor);
    if (!pseudoBackground) {
      return {
        status: 'review',
        requiredRatio: requirement.requiredRatio,
        foreground: colorLabel(foreground),
        fontSizePx,
        fontWeight,
        largeText: requirement.largeText,
        reason: `Pseudo-element background ${JSON.stringify(style.backgroundColor)} could not be resolved.`,
      };
    }
    if (pseudoBackground.a > 0) {
      resolvedBackground = compositeColor(pseudoBackground, resolvedBackground);
    }
  }

  const renderedForeground = foreground.a < 0.999
    ? compositeColor(foreground, resolvedBackground)
    : foreground;
  const ratio = contrastRatio(renderedForeground, resolvedBackground);
  const roundedRatio = Number(ratio.toFixed(2));

  return {
    status: ratio + Number.EPSILON >= requirement.requiredRatio ? 'pass' : 'fail',
    ratio: roundedRatio,
    requiredRatio: requirement.requiredRatio,
    foreground: colorLabel(renderedForeground),
    background: colorLabel(resolvedBackground),
    fontSizePx,
    fontWeight,
    largeText: requirement.largeText,
  };
}

const TEXT_VALUE_INPUT_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
]);

function hasDirectRenderedText(element: Element): boolean {
  if (
    element instanceof HTMLInputElement
    || element instanceof HTMLTextAreaElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLOptionElement
  ) return false;

  return [...element.childNodes].some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );
}

/**
 * Returns every independently styled text surface rendered by an element.
 * Form values are not DOM text nodes, and placeholders use their own pseudo
 * style, so treating them explicitly prevents visible copy from disappearing
 * from contrast coverage.
 */
export function textContrastSubjectsForElement(element: Element): TextContrastSubject[] {
  const subjects: TextContrastSubject[] = [];
  if (hasDirectRenderedText(element)) subjects.push({ subject: 'text' });

  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    if (['button', 'submit', 'reset'].includes(type) && element.value.trim()) {
      subjects.push({ subject: 'input value' });
    } else if (TEXT_VALUE_INPUT_TYPES.has(type)) {
      if (element.value.trim()) subjects.push({ subject: 'input value' });
      else if (element.placeholder.trim()) subjects.push({ subject: 'placeholder', pseudo: '::placeholder' });
    }
  } else if (element instanceof HTMLTextAreaElement) {
    if (element.value.trim()) subjects.push({ subject: 'textarea value' });
    else if (element.placeholder.trim()) subjects.push({ subject: 'placeholder', pseudo: '::placeholder' });
  } else if (element instanceof HTMLSelectElement) {
    const selectedText = [...element.selectedOptions]
      .map((option) => option.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (selectedText) subjects.push({ subject: 'selected option' });
  }

  if (!navigator.userAgent.toLowerCase().includes('jsdom')) {
    for (const pseudo of ['::before', '::after'] as const) {
      const style = getComputedStyle(element, pseudo);
      const content = style.content?.trim();
      if (!content || content === 'none' || content === 'normal' || content === '""' || content === "''") continue;
      subjects.push({ subject: 'generated text', pseudo });
    }
  }

  return subjects;
}

export function elementHasRenderedText(element: Element): boolean {
  return textContrastSubjectsForElement(element).length > 0;
}
