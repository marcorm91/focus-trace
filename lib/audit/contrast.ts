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
  targetRatio: number;
  perceptualDelta: number;
}

export interface AccessibleTextColorSuggestions {
  aa?: AccessibleColorSuggestion;
  aaa?: AccessibleColorSuggestion;
}

interface OklabColor {
  l: number;
  a: number;
  b: number;
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

function parseUnitChannel(value: string): number | undefined {
  const token = value.trim();
  if (token.endsWith('%')) {
    const percent = Number.parseFloat(token);
    return Number.isFinite(percent) ? clamp(percent / 100, 0, 1) : undefined;
  }
  const numeric = Number.parseFloat(token);
  return Number.isFinite(numeric) ? clamp(numeric, 0, 1) : undefined;
}

function parseAlpha(value: string | undefined): number | undefined {
  if (value == null) return 1;
  return parseUnitChannel(value);
}

function gammaChannel(value: number): number {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

function oklabToRawSrgb(color: OklabColor): { r: number; g: number; b: number } {
  const lRoot = color.l + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const mRoot = color.l - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const sRoot = color.l - 0.0894841775 * color.a - 1.291485548 * color.b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return {
    r: gammaChannel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: gammaChannel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: gammaChannel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

function rawSrgbInGamut(color: { r: number; g: number; b: number }): boolean {
  return color.r >= -1e-7 && color.r <= 1 + 1e-7
    && color.g >= -1e-7 && color.g <= 1 + 1e-7
    && color.b >= -1e-7 && color.b <= 1 + 1e-7;
}

function oklabToRgba(color: OklabColor, alpha = 1): RgbaColor {
  const raw = oklabToRawSrgb(color);
  return {
    r: clamp(raw.r, 0, 1) * 255,
    g: clamp(raw.g, 0, 1) * 255,
    b: clamp(raw.b, 0, 1) * 255,
    a: alpha,
  };
}

function parseOklabFunction(value: string): RgbaColor | undefined {
  const match = value.match(/^oklab\((.*)\)$/i)?.[1];
  if (!match) return undefined;
  const slashParts = match.split('/').map((part) => part.trim());
  const tokens = slashParts[0]?.split(/\s+/).filter(Boolean) ?? [];
  if (tokens.length !== 3) return undefined;
  const l = parseUnitChannel(tokens[0]!);
  const a = Number.parseFloat(tokens[1]!);
  const b = Number.parseFloat(tokens[2]!);
  const alpha = parseAlpha(slashParts[1]);
  if (l == null || !Number.isFinite(a) || !Number.isFinite(b) || alpha == null) return undefined;
  return oklabToRgba({ l, a, b }, alpha);
}

function parseOklchFunction(value: string): RgbaColor | undefined {
  const match = value.match(/^oklch\((.*)\)$/i)?.[1];
  if (!match) return undefined;
  const slashParts = match.split('/').map((part) => part.trim());
  const tokens = slashParts[0]?.split(/\s+/).filter(Boolean) ?? [];
  if (tokens.length !== 3) return undefined;
  const l = parseUnitChannel(tokens[0]!);
  const c = Number.parseFloat(tokens[1]!);
  const h = Number.parseFloat(tokens[2]!);
  const alpha = parseAlpha(slashParts[1]);
  if (l == null || !Number.isFinite(c) || !Number.isFinite(h) || alpha == null) return undefined;
  const radians = h * Math.PI / 180;
  return oklabToRgba({ l, a: c * Math.cos(radians), b: c * Math.sin(radians) }, alpha);
}

function parseSrgbColorFunction(value: string): RgbaColor | undefined {
  const match = value.match(/^color\(srgb\s+(.+)\)$/i)?.[1];
  if (!match) return undefined;
  const slashParts = match.split('/').map((part) => part.trim());
  const tokens = slashParts[0]?.split(/\s+/).filter(Boolean) ?? [];
  if (tokens.length !== 3) return undefined;
  const r = parseUnitChannel(tokens[0]!);
  const g = parseUnitChannel(tokens[1]!);
  const b = parseUnitChannel(tokens[2]!);
  const a = parseAlpha(slashParts[1]);
  if (r == null || g == null || b == null || a == null) return undefined;
  return { r: r * 255, g: g * 255, b: b * 255, a };
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
  if (functional) {
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

  return parseSrgbColorFunction(normalized)
    ?? parseOklabFunction(normalized)
    ?? parseOklchFunction(normalized);
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

export function textContrastTargets(largeText: boolean): { aa: number; aaa: number } {
  return largeText ? { aa: 3, aaa: 4.5 } : { aa: 4.5, aaa: 7 };
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

function rgbToOklab(color: RgbaColor): OklabColor {
  const r = linearChannel(color.r);
  const g = linearChannel(color.g);
  const b = linearChannel(color.b);
  const lRoot = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mRoot = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const sRoot = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

function oklabDistance(first: OklabColor, second: OklabColor): number {
  return Math.hypot(first.l - second.l, first.a - second.a, first.b - second.b);
}

function gamutMappedLightness(origin: OklabColor, lightness: number): RgbaColor {
  const target = { ...origin, l: clamp(lightness, 0, 1) };
  if (rawSrgbInGamut(oklabToRawSrgb(target))) return integerColor(oklabToRgba(target));

  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 18; iteration += 1) {
    const scale = (low + high) / 2;
    const candidate = {
      l: target.l,
      a: target.a * scale,
      b: target.b * scale,
    };
    if (rawSrgbInGamut(oklabToRawSrgb(candidate))) low = scale;
    else high = scale;
  }
  return integerColor(oklabToRgba({
    l: target.l,
    a: target.a * low,
    b: target.b * low,
  }));
}

function accessibleCandidateInDirection(
  foreground: RgbaColor,
  background: RgbaColor,
  requiredRatio: number,
  direction: AccessibleColorSuggestion['direction'],
): { color: RgbaColor; ratio: number; distance: number } | undefined {
  const origin = rgbToOklab(foreground);
  const targetLightness = direction === 'darker' ? 0 : 1;
  const extreme = gamutMappedLightness(origin, targetLightness);
  if (contrastRatio(extreme, background) + Number.EPSILON < requiredRatio) return undefined;

  let inaccessible = origin.l;
  let accessible = targetLightness;
  for (let iteration = 0; iteration < 22; iteration += 1) {
    const middle = (inaccessible + accessible) / 2;
    const candidate = gamutMappedLightness(origin, middle);
    if (contrastRatio(candidate, background) + Number.EPSILON >= requiredRatio) accessible = middle;
    else inaccessible = middle;
  }

  let color = gamutMappedLightness(origin, accessible);
  let ratio = contrastRatio(color, background);
  if (ratio + Number.EPSILON < requiredRatio) {
    const step = direction === 'darker' ? -0.0005 : 0.0005;
    let lightness = accessible;
    for (let attempt = 0; attempt < 64 && ratio + Number.EPSILON < requiredRatio; attempt += 1) {
      lightness = clamp(lightness + step, 0, 1);
      color = gamutMappedLightness(origin, lightness);
      ratio = contrastRatio(color, background);
    }
  }
  if (ratio + Number.EPSILON < requiredRatio) return undefined;

  return {
    color,
    ratio,
    distance: oklabDistance(origin, rgbToOklab(color)),
  };
}

/**
 * Suggest the smallest deterministic perceptual adjustment that reaches the
 * requested contrast. FocusTrace changes OKLCH lightness first and preserves
 * hue/chroma as far as the sRGB gamut permits, then compares darker/lighter
 * candidates using OKLab distance.
 */
export function suggestAccessibleForeground(
  foregroundValue: string,
  backgroundValue: string,
  requiredRatio: number,
): AccessibleColorSuggestion | undefined {
  const foreground = parseCssColor(foregroundValue);
  const background = parseCssColor(backgroundValue);
  if (!foreground || !background || foreground.a < 0.999 || background.a < 0.999) return undefined;

  const currentRatio = contrastRatio(foreground, background);
  if (currentRatio + Number.EPSILON >= requiredRatio) {
    const direction = relativeLuminance(foreground) <= relativeLuminance(background) ? 'darker' : 'lighter';
    return {
      hex: colorToHex(foreground),
      rgb: colorToRgb(foreground),
      ratio: Number(currentRatio.toFixed(2)),
      direction,
      targetRatio: requiredRatio,
      perceptualDelta: 0,
    };
  }

  const darker = accessibleCandidateInDirection(foreground, background, requiredRatio, 'darker');
  const lighter = accessibleCandidateInDirection(foreground, background, requiredRatio, 'lighter');
  const candidates = [
    ...(darker ? [{ ...darker, direction: 'darker' as const }] : []),
    ...(lighter ? [{ ...lighter, direction: 'lighter' as const }] : []),
  ];
  candidates.sort((first, second) => first.distance - second.distance || first.ratio - second.ratio);
  const best = candidates[0];
  if (!best) return undefined;

  return {
    hex: colorToHex(best.color),
    rgb: colorToRgb(best.color),
    ratio: Number(best.ratio.toFixed(2)),
    direction: best.direction,
    targetRatio: requiredRatio,
    perceptualDelta: Number(best.distance.toFixed(4)),
  };
}

export function suggestAccessibleTextColors(
  foregroundValue: string,
  backgroundValue: string,
  largeText: boolean,
): AccessibleTextColorSuggestions {
  const targets = textContrastTargets(largeText);
  return {
    aa: suggestAccessibleForeground(foregroundValue, backgroundValue, targets.aa),
    aaa: suggestAccessibleForeground(foregroundValue, backgroundValue, targets.aaa),
  };
}

function complexVisualReasonInternal(style: CSSStyleDeclaration, includeOpacity: boolean): string | undefined {
  if (style.backgroundImage && style.backgroundImage !== 'none') return 'A background image or gradient affects the rendered background.';
  if (includeOpacity) {
    const opacity = Number.parseFloat(style.opacity || '1');
    if (Number.isFinite(opacity) && opacity < 0.999) return 'Element or ancestor opacity affects the rendered colors.';
  }
  if (style.mixBlendMode && style.mixBlendMode !== 'normal') return 'mix-blend-mode affects the rendered colors.';
  if (style.filter && style.filter !== 'none') return 'A CSS filter affects the rendered colors.';
  return undefined;
}

export function complexVisualReason(style: CSSStyleDeclaration): string | undefined {
  return complexVisualReasonInternal(style, true);
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

function opacityAdjustedTextColors(
  element: Element,
  style: CSSStyleDeclaration,
  foreground: RgbaColor,
  opacity: number,
): { foreground?: RgbaColor; background?: RgbaColor; reason?: string } {
  const complex = complexVisualReasonInternal(style, false);
  if (complex) return { reason: complex };

  const backdropResult = element.parentElement
    ? effectiveBackground(element.parentElement)
    : { color: WHITE };
  if (!backdropResult.color) {
    return { reason: backdropResult.reason ?? 'The backdrop behind the translucent element could not be resolved reliably.' };
  }

  const ownBackground = parseCssColor(style.backgroundColor);
  if (!ownBackground) {
    return { reason: `Background color ${JSON.stringify(style.backgroundColor)} could not be resolved.` };
  }

  const internalBackground = compositeColor(ownBackground, backdropResult.color);
  const internalForeground = foreground.a < 0.999
    ? compositeColor(foreground, internalBackground)
    : foreground;
  const foregroundGroup = { ...internalForeground, a: opacity };
  const backgroundGroup = { ...internalBackground, a: opacity };
  return {
    foreground: compositeColor(foregroundGroup, backdropResult.color),
    background: compositeColor(backgroundGroup, backdropResult.color),
  };
}

function textEvaluation(
  foreground: RgbaColor,
  background: RgbaColor,
  requirement: { largeText: boolean; requiredRatio: number },
  fontSizePx: number,
  fontWeight: number,
): TextContrastEvaluation {
  const ratio = contrastRatio(foreground, background);
  return {
    status: ratio + Number.EPSILON >= requirement.requiredRatio ? 'pass' : 'fail',
    ratio: Number(ratio.toFixed(2)),
    requiredRatio: requirement.requiredRatio,
    foreground: colorLabel(foreground),
    background: colorLabel(background),
    fontSizePx,
    fontWeight,
    largeText: requirement.largeText,
  };
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
  // Preserve genuinely unresolved system colors and unsupported future color
  // syntaxes as review evidence instead of silently dropping visible text.
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

  const opacity = Number.parseFloat(style.opacity || '1');
  if (!pseudo && Number.isFinite(opacity) && opacity < 0.999) {
    const adjusted = opacityAdjustedTextColors(element, style, foreground, clamp(opacity, 0, 1));
    if (!adjusted.foreground || !adjusted.background) {
      return {
        status: 'review',
        requiredRatio: requirement.requiredRatio,
        foreground: colorLabel(foreground),
        fontSizePx,
        fontWeight,
        largeText: requirement.largeText,
        reason: adjusted.reason ?? 'Element opacity could not be composited reliably.',
      };
    }
    return textEvaluation(adjusted.foreground, adjusted.background, requirement, fontSizePx, fontWeight);
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
  return textEvaluation(renderedForeground, resolvedBackground, requirement, fontSizePx, fontWeight);
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
    if (['submit', 'reset'].includes(type)) {
      // Browsers render localized default labels even when value is omitted.
      subjects.push({ subject: 'input value' });
    } else if (type === 'button' && element.value.trim()) {
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
