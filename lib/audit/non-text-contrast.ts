import {
  colorToRgb,
  complexVisualReason,
  compositeColor,
  contrastRatio,
  effectiveBackground,
  parseCssColor,
  type RgbaColor,
} from './contrast';
import { semanticRole } from './dom';

export type NonTextContrastKind = 'ui-boundary' | 'graphic' | 'focus-indicator';

export interface NonTextContrastEvaluation {
  status: 'pass' | 'fail' | 'review' | 'inapplicable';
  kind: NonTextContrastKind;
  subject: string;
  requiredRatio: 3;
  ratio?: number;
  foreground?: string;
  background?: string;
  reason?: string;
}

export interface NonTextContrastFinding {
  element: Element;
  evaluation: NonTextContrastEvaluation;
}

const REQUIRED_RATIO = 3 as const;
const INTERACTIVE_ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'link',
  'listbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
]);
const BOUNDARY_RELEVANT_ROLES = new Set([
  'checkbox',
  'combobox',
  'listbox',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'textbox',
]);
const SVG_SHAPES = 'path, circle, rect, line, polyline, polygon, ellipse, use';

function roundedRatio(value: number): number {
  return Number(value.toFixed(2));
}

function renderedColor(color: RgbaColor, background: RgbaColor): RgbaColor {
  return color.a < 0.999 ? compositeColor(color, background) : color;
}

function isDisabled(element: Element): boolean {
  if (element.getAttribute('aria-disabled')?.trim().toLowerCase() === 'true') return true;
  return element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
    ? element.disabled
    : false;
}

function visibleTextOutsideSvg(element: Element): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const chunks: string[] = [];
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !parent.closest('svg') && parent.getAttribute('aria-hidden') !== 'true') {
      const style = getComputedStyle(parent);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse') {
        const value = node.textContent?.replace(/\s+/g, ' ').trim();
        if (value) chunks.push(value);
      }
    }
    node = walker.nextNode();
  }
  return chunks.join(' ').trim();
}

function isInteractiveContainer(element: Element): boolean {
  const role = semanticRole(element);
  return Boolean(role && INTERACTIVE_ROLES.has(role));
}

function owningInteractiveControl(element: Element): Element | undefined {
  let current = element.parentElement;
  while (current) {
    if (isInteractiveContainer(current)) return current;
    current = current.parentElement;
  }
  return undefined;
}

function simpleSvgColor(svg: SVGElement): { color?: RgbaColor; reason?: string; subject?: string } {
  const shapes = [...svg.querySelectorAll(SVG_SHAPES)];
  const targets: Element[] = shapes.length ? shapes : [svg];
  const colors = new Map<string, { color: RgbaColor; subject: string }>();

  for (const target of targets) {
    const style = getComputedStyle(target);
    const opacity = Number.parseFloat(style.opacity || '1');
    if (Number.isFinite(opacity) && opacity < 0.999) {
      return { reason: 'Graphic opacity affects the rendered non-text color.' };
    }

    const fill = style.fill && style.fill !== 'none' ? parseCssColor(style.fill) : undefined;
    if (style.fill && style.fill !== 'none' && !fill) {
      return { reason: `Graphic fill ${JSON.stringify(style.fill)} could not be resolved.` };
    }
    if (fill && fill.a > 0) {
      const key = colorToRgb(fill);
      colors.set(key, { color: fill, subject: 'icon fill' });
    }

    const strokeWidth = Number.parseFloat(style.strokeWidth || '0');
    const stroke = strokeWidth > 0 && style.stroke && style.stroke !== 'none'
      ? parseCssColor(style.stroke)
      : undefined;
    if (strokeWidth > 0 && style.stroke && style.stroke !== 'none' && !stroke) {
      return { reason: `Graphic stroke ${JSON.stringify(style.stroke)} could not be resolved.` };
    }
    if (stroke && stroke.a > 0) {
      const key = colorToRgb(stroke);
      colors.set(key, { color: stroke, subject: 'icon stroke' });
    }
  }

  if (colors.size === 0) return { reason: 'No simple SVG fill or stroke color could be resolved.' };
  if (colors.size > 1) return { reason: 'The graphic uses multiple visible colors, so a single deterministic contrast ratio would be misleading.' };
  const only = [...colors.values()][0]!;
  return { color: only.color, subject: only.subject };
}

function evaluateGraphic(svg: SVGElement, control?: Element): NonTextContrastEvaluation {
  const backgroundTarget = control ?? svg;
  const backgroundResult = effectiveBackground(backgroundTarget);
  if (!backgroundResult.color) {
    return {
      status: 'review',
      kind: 'graphic',
      subject: 'graphic',
      requiredRatio: REQUIRED_RATIO,
      reason: backgroundResult.reason ?? 'The adjacent background could not be resolved reliably.',
    };
  }

  const graphic = simpleSvgColor(svg);
  if (!graphic.color) {
    return {
      status: 'review',
      kind: 'graphic',
      subject: graphic.subject ?? 'graphic',
      requiredRatio: REQUIRED_RATIO,
      background: colorToRgb(backgroundResult.color),
      reason: graphic.reason,
    };
  }

  const rendered = renderedColor(graphic.color, backgroundResult.color);
  const ratio = contrastRatio(rendered, backgroundResult.color);
  const deterministicFailure = Boolean(control && !visibleTextOutsideSvg(control));

  return {
    status: ratio + Number.EPSILON >= REQUIRED_RATIO
      ? 'pass'
      : deterministicFailure
        ? 'fail'
        : 'review',
    kind: 'graphic',
    subject: graphic.subject ?? 'graphic',
    requiredRatio: REQUIRED_RATIO,
    ratio: roundedRatio(ratio),
    foreground: colorToRgb(rendered),
    background: colorToRgb(backgroundResult.color),
    ...(ratio + Number.EPSILON < REQUIRED_RATIO && !deterministicFailure
      ? { reason: 'The graphic is below 3:1, but FocusTrace cannot prove that this graphical object is required to understand the content.' }
      : {}),
  };
}

function visibleBorderColors(style: CSSStyleDeclaration): RgbaColor[] {
  const sides = ['Top', 'Right', 'Bottom', 'Left'] as const;
  const colors: RgbaColor[] = [];
  for (const side of sides) {
    const width = Number.parseFloat(style[`border${side}Width`]);
    const borderStyle = style[`border${side}Style`];
    if (!(width > 0) || borderStyle === 'none' || borderStyle === 'hidden') continue;
    const color = parseCssColor(style[`border${side}Color`]);
    if (color && color.a > 0) colors.push(color);
  }
  return colors;
}

function evaluateUiBoundary(element: Element): NonTextContrastEvaluation | undefined {
  const role = semanticRole(element);
  if (!role || !INTERACTIVE_ROLES.has(role) || role === 'link' || isDisabled(element)) return undefined;
  const hasVisibleText = Boolean(visibleTextOutsideSvg(element));
  if (hasVisibleText && !BOUNDARY_RELEVANT_ROLES.has(role)) return undefined;

  const style = getComputedStyle(element);
  const complex = complexVisualReason(style);
  if (complex) {
    return {
      status: 'review',
      kind: 'ui-boundary',
      subject: 'component visual boundary',
      requiredRatio: REQUIRED_RATIO,
      reason: complex,
    };
  }

  const outsideTarget = element.parentElement ?? document.body;
  if (!outsideTarget) return undefined;
  const outsideResult = effectiveBackground(outsideTarget);
  if (!outsideResult.color) {
    return {
      status: 'review',
      kind: 'ui-boundary',
      subject: 'component visual boundary',
      requiredRatio: REQUIRED_RATIO,
      reason: outsideResult.reason ?? 'The adjacent color outside the component could not be resolved.',
    };
  }
  const outside = outsideResult.color;

  const candidates: Array<{ subject: string; color: RgbaColor; ratio: number }> = [];
  const background = parseCssColor(style.backgroundColor);
  if (background && background.a > 0) {
    const rendered = renderedColor(background, outside);
    candidates.push({ subject: 'component fill', color: rendered, ratio: contrastRatio(rendered, outside) });
  }

  const borders = visibleBorderColors(style);
  const uniqueBorders = new Map<string, RgbaColor>();
  borders.forEach((color) => uniqueBorders.set(colorToRgb(color), color));
  if (uniqueBorders.size === 1) {
    const border = renderedColor([...uniqueBorders.values()][0]!, outside);
    candidates.push({ subject: 'component border', color: border, ratio: contrastRatio(border, outside) });
  } else if (uniqueBorders.size > 1) {
    return {
      status: 'review',
      kind: 'ui-boundary',
      subject: 'component border',
      requiredRatio: REQUIRED_RATIO,
      background: colorToRgb(outside),
      reason: 'Different border colors are used around the component, so a single deterministic boundary ratio would be misleading.',
    };
  }

  if (!candidates.length) return undefined;
  candidates.sort((first, second) => second.ratio - first.ratio);
  const best = candidates[0]!;
  if (best.ratio + Number.EPSILON >= REQUIRED_RATIO) {
    return {
      status: 'pass',
      kind: 'ui-boundary',
      subject: best.subject,
      requiredRatio: REQUIRED_RATIO,
      ratio: roundedRatio(best.ratio),
      foreground: colorToRgb(best.color),
      background: colorToRgb(outside),
    };
  }

  return {
    status: 'review',
    kind: 'ui-boundary',
    subject: best.subject,
    requiredRatio: REQUIRED_RATIO,
    ratio: roundedRatio(best.ratio),
    foreground: colorToRgb(best.color),
    background: colorToRgb(outside),
    reason: 'The measured component cue is below 3:1, but whether this border/fill is required to identify the component or its state depends on visual context.',
  };
}

function evaluateObservedFocusIndicator(element: Element): NonTextContrastEvaluation | undefined {
  if (document.activeElement !== element || element === document.body || element === document.documentElement) return undefined;
  const style = getComputedStyle(element);
  const width = Number.parseFloat(style.outlineWidth || '0');
  if (!(width > 0) || style.outlineStyle === 'none') {
    if (style.boxShadow && style.boxShadow !== 'none') {
      return {
        status: 'review',
        kind: 'focus-indicator',
        subject: 'observed focus indicator',
        requiredRatio: REQUIRED_RATIO,
        reason: 'The focused element uses box-shadow as part of its current focus appearance; FocusTrace does not reduce complex shadows to a single contrast ratio.',
      };
    }
    return undefined;
  }
  if (style.outlineStyle === 'auto') return undefined;

  const outsideTarget = element.parentElement ?? document.body;
  if (!outsideTarget) return undefined;
  const backgroundResult = effectiveBackground(outsideTarget);
  const outline = parseCssColor(style.outlineColor);
  if (!backgroundResult.color || !outline) {
    return {
      status: 'review',
      kind: 'focus-indicator',
      subject: 'observed focus indicator',
      requiredRatio: REQUIRED_RATIO,
      reason: backgroundResult.reason ?? `Outline color ${JSON.stringify(style.outlineColor)} could not be resolved.`,
    };
  }

  const rendered = renderedColor(outline, backgroundResult.color);
  const ratio = contrastRatio(rendered, backgroundResult.color);
  if (ratio + Number.EPSILON < REQUIRED_RATIO && style.boxShadow && style.boxShadow !== 'none') {
    return {
      status: 'review',
      kind: 'focus-indicator',
      subject: 'observed focus indicator',
      requiredRatio: REQUIRED_RATIO,
      ratio: roundedRatio(ratio),
      foreground: colorToRgb(rendered),
      background: colorToRgb(backgroundResult.color),
      reason: 'The outline is below 3:1, but an additional box-shadow focus cue is present and may contribute to the visible indicator.',
    };
  }

  return {
    status: ratio + Number.EPSILON >= REQUIRED_RATIO ? 'pass' : 'fail',
    kind: 'focus-indicator',
    subject: 'observed focus outline',
    requiredRatio: REQUIRED_RATIO,
    ratio: roundedRatio(ratio),
    foreground: colorToRgb(rendered),
    background: colorToRgb(backgroundResult.color),
  };
}

export function evaluateNonTextContrast(): NonTextContrastFinding[] {
  const findings: NonTextContrastFinding[] = [];
  const controls = [...document.querySelectorAll('button, input, select, textarea, [role]')]
    .filter((element) => isInteractiveContainer(element));

  for (const control of controls) {
    if (isDisabled(control)) continue;
    const svgs = [...control.querySelectorAll('svg')];
    const iconOnly = svgs.length > 0 && !visibleTextOutsideSvg(control);
    if (iconOnly) {
      const evaluation = svgs.length === 1
        ? evaluateGraphic(svgs[0]!, control)
        : {
            status: 'review' as const,
            kind: 'graphic' as const,
            subject: 'control icons',
            requiredRatio: REQUIRED_RATIO,
            reason: 'The control contains multiple SVG graphics, so FocusTrace cannot choose a single identifying visual cue reliably.',
          };
      findings.push({ element: control, evaluation });
    } else {
      const boundary = evaluateUiBoundary(control);
      if (boundary) findings.push({ element: control, evaluation: boundary });
    }
  }

  for (const svg of [...document.querySelectorAll<SVGElement>('svg[role="img"]')]) {
    if (owningInteractiveControl(svg)) continue;
    findings.push({ element: svg, evaluation: evaluateGraphic(svg) });
  }

  const active = document.activeElement;
  if (active && active instanceof Element) {
    const focusIndicator = evaluateObservedFocusIndicator(active);
    if (focusIndicator) findings.push({ element: active, evaluation: focusIndicator });
  }

  return findings;
}
