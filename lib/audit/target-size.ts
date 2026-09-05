import { selectorFor, semanticRole } from './dom';

export const TARGET_SIZE_MINIMUM_CSS_PX = 24;
const TARGET_SPACING_RADIUS_CSS_PX = TARGET_SIZE_MINIMUM_CSS_PX / 2;
const ROUNDED_RECT_SAFE_MINIMUM_CSS_PX = TARGET_SIZE_MINIMUM_CSS_PX * Math.SQRT2;

const POINTER_TARGET_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[role]',
  '[tabindex]',
  '[onclick]',
  '[onmousedown]',
  '[onmouseup]',
  '[onpointerdown]',
  '[onpointerup]',
  '[ontouchstart]',
  '[ontouchend]',
].join(',');

const POINTER_ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'radio',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'treeitem',
]);

const NATIVE_POINTER_TAGS = new Set(['A', 'AREA', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY']);
const USER_AGENT_SIZED_CONTROL_TAGS = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);
const POINTER_SIGNAL_ATTRIBUTES = [
  'onclick',
  'onmousedown',
  'onmouseup',
  'onpointerdown',
  'onpointerup',
  'ontouchstart',
  'ontouchend',
] as const;

export type TargetSizeStatus = 'pass' | 'review';
export type TargetSizeMethod = 'size' | 'spacing' | 'inline-exception' | 'review';
type SizeKnowledge = 'meets' | 'undersized' | 'unknown';

export interface TargetSizeEvaluation {
  element: Element;
  status: TargetSizeStatus;
  method: TargetSizeMethod;
  width: number;
  height: number;
  detail: string;
  neighbor?: Element;
}

interface RectSnapshot {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface TargetSnapshot {
  element: Element;
  rect: RectSnapshot;
  sizeKnowledge: SizeKnowledge;
}

type ScanRoot = Document | Element;

function normalizedRole(element: Element): string | null {
  return semanticRole(element)?.trim().toLowerCase() ?? null;
}

function isDisabledTarget(element: Element): boolean {
  try {
    if (element.matches(':disabled')) return true;
  } catch {
    // Non-HTML elements can reject some selectors in older engines.
  }
  return element.getAttribute('aria-disabled')?.trim().toLowerCase() === 'true';
}

function hasPointerSignal(element: Element): boolean {
  return POINTER_SIGNAL_ATTRIBUTES.some((attribute) => element.hasAttribute(attribute));
}

function isSemanticPointerTarget(element: Element): boolean {
  if (NATIVE_POINTER_TAGS.has(element.tagName)) {
    if ((element.tagName === 'A' || element.tagName === 'AREA') && !element.hasAttribute('href')) return false;
    if (element.tagName === 'INPUT' && element.getAttribute('type')?.trim().toLowerCase() === 'hidden') return false;
    return true;
  }
  const role = normalizedRole(element);
  if (role && POINTER_ROLES.has(role)) return true;
  if (hasPointerSignal(element)) return true;

  const tabindex = Number.parseInt(element.getAttribute('tabindex') ?? '', 10);
  if (Number.isFinite(tabindex) && tabindex >= 0) {
    return getComputedStyle(element).cursor === 'pointer';
  }
  return false;
}

function rectSnapshot(element: Element): RectSnapshot | undefined {
  const rect = element.getBoundingClientRect();
  const width = Number.isFinite(rect.width) ? rect.width : rect.right - rect.left;
  const height = Number.isFinite(rect.height) ? rect.height : rect.bottom - rect.top;
  if (!(width > 0) || !(height > 0)) return undefined;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.left + width,
    bottom: rect.top + height,
    width,
    height,
    centerX: rect.left + width / 2,
    centerY: rect.top + height / 2,
  };
}

function isRenderedPointerTarget(element: Element): boolean {
  if (isDisabledTarget(element)) return false;
  if (element.closest('[inert]')) return false;
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  if (style.pointerEvents === 'none') return false;
  return rectSnapshot(element) != null;
}

function borderRadiusValues(style: CSSStyleDeclaration): number[] {
  return [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
    style.borderRadius,
  ].flatMap((value) => value.split(/\s+/).map((part) => Number.parseFloat(part)).filter(Number.isFinite));
}

function hasNonRectangularAuthorShape(element: Element, rect: RectSnapshot): boolean {
  const style = getComputedStyle(element);
  const clipPath = style.clipPath || style.getPropertyValue('-webkit-clip-path');
  if (clipPath && clipPath !== 'none') return true;
  if (style.transform && style.transform !== 'none') return true;
  if (element.namespaceURI === 'http://www.w3.org/2000/svg') return true;

  const radii = borderRadiusValues(style);
  if (!radii.some((radius) => radius > 0)) return false;

  // Even a circle can contain a 24px axis-aligned square once its diameter
  // reaches 24 * sqrt(2). This is a deliberately conservative sufficient
  // condition for rounded targets without pretending every rounded box has
  // identical geometry.
  return Math.min(rect.width, rect.height) < ROUNDED_RECT_SAFE_MINIMUM_CSS_PX;
}

function sizeKnowledgeFor(element: Element, rect: RectSnapshot): SizeKnowledge {
  if (rect.width < TARGET_SIZE_MINIMUM_CSS_PX || rect.height < TARGET_SIZE_MINIMUM_CSS_PX) return 'undersized';
  if (!hasNonRectangularAuthorShape(element, rect)) return 'meets';
  return 'unknown';
}

function targetElements(root: ScanRoot): Element[] {
  const descendants = [...root.querySelectorAll(POINTER_TARGET_SELECTOR)];
  const candidates = root instanceof Element && root.matches(POINTER_TARGET_SELECTOR)
    ? [root, ...descendants]
    : descendants;
  return candidates.filter((element, index) => candidates.indexOf(element) === index)
    .filter(isSemanticPointerTarget)
    .filter(isRenderedPointerTarget);
}

function hasNonTargetSentenceText(element: Element): boolean {
  const paragraph = element.closest('p');
  if (!paragraph) return false;
  for (const node of paragraph.childNodes) {
    if (node === element) continue;
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
    if (node instanceof Element && !isSemanticPointerTarget(node) && node.textContent?.trim()) return true;
  }
  return false;
}

function hasInlineException(element: Element): boolean {
  const style = getComputedStyle(element);
  return style.display === 'inline' && hasNonTargetSentenceText(element);
}

function circlesOverlap(a: RectSnapshot, b: RectSnapshot): boolean {
  const dx = a.centerX - b.centerX;
  const dy = a.centerY - b.centerY;
  const minimumCenterDistance = TARGET_SIZE_MINIMUM_CSS_PX;
  return (dx * dx) + (dy * dy) < minimumCenterDistance * minimumCenterDistance;
}

function circleIntersectsRect(circle: RectSnapshot, rect: RectSnapshot): boolean {
  const nearestX = Math.max(rect.left, Math.min(circle.centerX, rect.right));
  const nearestY = Math.max(rect.top, Math.min(circle.centerY, rect.bottom));
  const dx = circle.centerX - nearestX;
  const dy = circle.centerY - nearestY;
  return (dx * dx) + (dy * dy) < TARGET_SPACING_RADIUS_CSS_PX * TARGET_SPACING_RADIUS_CSS_PX;
}

function spacingConflict(subject: TargetSnapshot, allTargets: TargetSnapshot[]): TargetSnapshot | undefined {
  for (const other of allTargets) {
    if (other.element === subject.element) continue;

    if (other.sizeKnowledge === 'undersized') {
      if (circlesOverlap(subject.rect, other.rect)) return other;
      continue;
    }

    // A target known to meet the size requirement is compared against its
    // target rectangle. For complex geometry whose 24px square fit is unknown,
    // use the bounding rectangle conservatively instead of incorrectly treating
    // it as an undersized 24px circle and risking a false PASS.
    if (circleIntersectsRect(subject.rect, other.rect)) return other;
  }
  return undefined;
}

function rounded(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export function evaluateTargetSize(root: ScanRoot = document): TargetSizeEvaluation[] {
  // Spacing is document-contextual: when a component is scanned, targets just
  // outside the selected component can still invalidate its spacing exception.
  const allTargets = targetElements(document).map((element): TargetSnapshot | undefined => {
    const rect = rectSnapshot(element);
    if (!rect) return undefined;
    return { element, rect, sizeKnowledge: sizeKnowledgeFor(element, rect) };
  }).filter((entry): entry is TargetSnapshot => entry != null);

  const subjectSet = new Set(targetElements(root));
  return allTargets.filter(({ element }) => subjectSet.has(element)).map((subject) => {
    const { element, rect } = subject;
    const size = `${rounded(rect.width)} × ${rounded(rect.height)} CSS px`;

    if (hasInlineException(element)) {
      return {
        element,
        status: 'pass',
        method: 'inline-exception',
        width: rect.width,
        height: rect.height,
        detail: `Target measures ${size} and is inline with surrounding non-target text in a paragraph, so the modeled inline exception applies.`,
      };
    }

    if (subject.sizeKnowledge === 'meets') {
      return {
        element,
        status: 'pass',
        method: 'size',
        width: rect.width,
        height: rect.height,
        detail: `Target measures ${size} and contains a deterministically verifiable ${TARGET_SIZE_MINIMUM_CSS_PX} × ${TARGET_SIZE_MINIMUM_CSS_PX} CSS px area.`,
      };
    }

    const conflict = spacingConflict(subject, allTargets);
    if (!conflict) {
      return {
        element,
        status: 'pass',
        method: 'spacing',
        width: rect.width,
        height: rect.height,
        detail: `Target measures ${size}; its ${TARGET_SIZE_MINIMUM_CSS_PX} CSS px spacing circle does not intersect another observed pointer target.`,
      };
    }

    const neighbor = selectorFor(conflict.element);
    const userAgentSizedControl = USER_AGENT_SIZED_CONTROL_TAGS.has(element.tagName);
    return {
      element,
      status: 'review',
      method: 'review',
      width: rect.width,
      height: rect.height,
      neighbor: conflict.element,
      detail: `Target measures ${size}; its ${TARGET_SIZE_MINIMUM_CSS_PX} CSS px spacing circle intersects ${neighbor}. ${userAgentSizedControl ? 'The user-agent-control exception may apply if the author has not modified the native target size. ' : ''}Equivalent or essential exceptions may also apply, so FocusTrace does not mark this as an automatic WCAG failure.`,
    };
  });
}
