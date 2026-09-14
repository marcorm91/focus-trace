export type ViewportZoomOutcome = 'fail' | 'review' | 'pass';

export interface ViewportZoomEvaluation {
  element: HTMLMetaElement;
  outcome: ViewportZoomOutcome;
  kind: '200-percent' | 'large-scale';
  detail: string;
}

export interface OrientationLockEvaluation {
  element: Element;
  outcome: 'review';
  orientation: 'portrait' | 'landscape';
  property: 'transform' | 'rotate';
  value: string;
  angleDegrees: number;
  detail: string;
}

interface ViewportDirective {
  name: string;
  value: string;
}

const MAX_STYLE_SHEETS = 100;
const MAX_RULES = 5_000;
const MAX_MATCHED_ELEMENTS = 50;
const QUARTER_TURN_TOLERANCE = 2;

export function parseViewportDirectives(content: string): ViewportDirective[] {
  return content
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return { name: part.toLowerCase(), value: '' };
      return {
        name: part.slice(0, separator).trim().toLowerCase(),
        value: part.slice(separator + 1).trim().toLowerCase(),
      };
    });
}

function lastDirective(directives: ViewportDirective[], name: string): ViewportDirective | undefined {
  return [...directives].reverse().find((directive) => directive.name === name);
}

function viewportScale(value: string): number | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'yes') return 1;
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) return undefined;
  if (numeric < 0) return undefined;
  return numeric;
}

export function evaluateViewportZoom(document: Document = window.document): ViewportZoomEvaluation[] {
  const evaluations: ViewportZoomEvaluation[] = [];
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="viewport" i][content]')];

  for (const element of metas) {
    const content = element.getAttribute('content') ?? '';
    const directives = parseViewportDirectives(content);
    const userScalable = lastDirective(directives, 'user-scalable');
    const maximumScale = lastDirective(directives, 'maximum-scale');
    if (!userScalable && !maximumScale) continue;

    const scale = maximumScale ? viewportScale(maximumScale.value) : undefined;
    const blocksScaling = userScalable?.value === 'no';
    const blocksTwoTimes = scale != null && scale < 2;
    const unresolvedScale = Boolean(maximumScale && maximumScale.value && scale == null && !/^[-]/.test(maximumScale.value));

    if (blocksScaling || blocksTwoTimes) {
      const reasons = [
        ...(blocksScaling ? ['user-scalable=no'] : []),
        ...(blocksTwoTimes ? [`maximum-scale=${maximumScale?.value ?? ''} resolves below 2`] : []),
      ];
      evaluations.push({
        element,
        outcome: 'fail',
        kind: '200-percent',
        detail: `Viewport metadata restricts the ACT-observable 200% zoom expectation: ${reasons.join('; ')}.`,
      });
    } else if (unresolvedScale) {
      evaluations.push({
        element,
        outcome: 'review',
        kind: '200-percent',
        detail: `maximum-scale=${JSON.stringify(maximumScale?.value)} could not be resolved conservatively; review the user agent's effective zoom behavior.`,
      });
    } else {
      evaluations.push({
        element,
        outcome: 'pass',
        kind: '200-percent',
        detail: 'The observed viewport directives do not block the ACT-observable 200% zoom expectation.',
      });
    }

    if (blocksScaling || blocksTwoTimes || unresolvedScale) continue;
    if (scale != null && scale >= 2 && scale < 5) {
      evaluations.push({
        element,
        outcome: 'review',
        kind: 'large-scale',
        detail: `maximum-scale=${maximumScale?.value} permits 200% zoom but limits larger enlargement below the 5× compatibility review threshold.`,
      });
    } else {
      evaluations.push({
        element,
        outcome: 'pass',
        kind: 'large-scale',
        detail: scale == null
          ? 'No finite maximum-scale restriction was observed for larger enlargement.'
          : `maximum-scale=${maximumScale?.value} permits at least 5× enlargement.`,
      });
    }
  }

  return evaluations;
}

function angleToDegrees(token: string): number | undefined {
  const match = token.trim().toLowerCase().match(/^(-?(?:\d+\.?\d*|\.\d+))(deg|rad|grad|turn)$/);
  if (!match) return undefined;
  const value = Number.parseFloat(match[1]!);
  if (!Number.isFinite(value)) return undefined;
  switch (match[2]) {
    case 'deg': return value;
    case 'rad': return value * 180 / Math.PI;
    case 'grad': return value * 0.9;
    case 'turn': return value * 360;
    default: return undefined;
  }
}

function rotationFromTransform(value: string): number | undefined {
  const normalized = value.trim();
  const rotate = normalized.match(/(?:^|\s)rotate(?:z)?\(\s*([^\)]+)\s*\)/i)?.[1];
  if (rotate) return angleToDegrees(rotate);

  const matrix = normalized.match(/matrix\(\s*([^\)]+)\s*\)/i)?.[1];
  if (matrix) {
    const parts = matrix.split(',').map((part) => Number.parseFloat(part.trim()));
    if (parts.length === 6 && parts.every(Number.isFinite)) {
      return Math.atan2(parts[1]!, parts[0]!) * 180 / Math.PI;
    }
  }

  const matrix3d = normalized.match(/matrix3d\(\s*([^\)]+)\s*\)/i)?.[1];
  if (matrix3d) {
    const parts = matrix3d.split(',').map((part) => Number.parseFloat(part.trim()));
    if (parts.length === 16 && parts.every(Number.isFinite)) {
      return Math.atan2(parts[1]!, parts[0]!) * 180 / Math.PI;
    }
  }
  return undefined;
}

function quarterTurn(angle: number): boolean {
  const normalized = ((angle % 360) + 360) % 360;
  return Math.abs(normalized - 90) <= QUARTER_TURN_TOLERANCE
    || Math.abs(normalized - 270) <= QUARTER_TURN_TOLERANCE;
}

function mediaOrientation(condition: string): 'portrait' | 'landscape' | undefined {
  const match = condition.toLowerCase().match(/\(\s*orientation\s*:\s*(portrait|landscape)\s*\)/);
  return match?.[1] as 'portrait' | 'landscape' | undefined;
}

function rendered(element: Element): boolean {
  if (!element.isConnected) return false;
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  return true;
}

function collectOrientationRules(
  rules: CSSRuleList,
  document: Document,
  evaluations: OrientationLockEvaluation[],
  counter: { value: number },
  inheritedOrientation?: 'portrait' | 'landscape',
): void {
  for (const rule of [...rules]) {
    if (counter.value >= MAX_RULES || evaluations.length >= MAX_MATCHED_ELEMENTS) return;
    counter.value += 1;

    if (rule instanceof CSSMediaRule) {
      const orientation = mediaOrientation(rule.conditionText) ?? inheritedOrientation;
      collectOrientationRules(rule.cssRules, document, evaluations, counter, orientation);
      continue;
    }

    if (!(rule instanceof CSSStyleRule) || !inheritedOrientation) continue;
    const candidates: Array<{ property: 'transform' | 'rotate'; value: string; angle?: number }> = [];
    const transform = rule.style.transform?.trim();
    if (transform && transform !== 'none') candidates.push({ property: 'transform', value: transform, angle: rotationFromTransform(transform) });
    const rotate = rule.style.getPropertyValue('rotate').trim();
    if (rotate && rotate !== 'none') candidates.push({ property: 'rotate', value: rotate, angle: angleToDegrees(rotate) });
    if (!candidates.length) continue;

    let elements: Element[];
    try {
      elements = [...document.querySelectorAll(rule.selectorText)].slice(0, MAX_MATCHED_ELEMENTS - evaluations.length);
    } catch {
      continue;
    }

    for (const element of elements) {
      if (!rendered(element)) continue;
      for (const candidate of candidates) {
        if (candidate.angle == null || !quarterTurn(candidate.angle)) continue;
        evaluations.push({
          element,
          outcome: 'review',
          orientation: inheritedOrientation,
          property: candidate.property,
          value: candidate.value,
          angleDegrees: Math.round(candidate.angle * 100) / 100,
          detail: `${candidate.property}=${JSON.stringify(candidate.value)} applies under (orientation: ${inheritedOrientation}) and resolves to an approximately quarter-turn Z-axis rotation. Review essential-orientation exceptions, page controls and script-driven alternatives.`,
        });
      }
    }
  }
}

function currentDocumentStyleSheets(document: Document): CSSStyleSheet[] {
  const attached = [...document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel~="stylesheet" i]')]
    .map((element) => element.sheet)
    .filter((sheet): sheet is CSSStyleSheet => sheet != null);
  const adopted = 'adoptedStyleSheets' in document ? [...document.adoptedStyleSheets] : [];
  return [...new Set([...attached, ...adopted])].slice(0, MAX_STYLE_SHEETS);
}

export function evaluateOrientationLock(document: Document = window.document): OrientationLockEvaluation[] {
  const evaluations: OrientationLockEvaluation[] = [];
  const counter = { value: 0 };
  for (const sheet of currentDocumentStyleSheets(document)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    collectOrientationRules(rules, document, evaluations, counter);
    if (counter.value >= MAX_RULES || evaluations.length >= MAX_MATCHED_ELEMENTS) break;
  }
  return evaluations;
}
