import { FOCUS_VISIBLE_RULE } from '../../shared/focus-visible-rules';
import type { ElementSnapshot, RuntimeEvent } from '../../shared/types';

type PendingRuntimeEvent = Omit<RuntimeEvent, 'id' | 'timestamp'>;

export interface FocusVisibleRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FocusVisiblePixelFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface FocusVisibleViewportState {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
}

export interface FocusVisibleBaseline {
  selector: string;
  region: FocusVisibleRegion;
  viewport: FocusVisibleViewportState;
  first: FocusVisiblePixelFrame;
  second: FocusVisiblePixelFrame;
}

export interface FocusVisibleComparison {
  outcome: 'changed' | 'unchanged' | 'inconclusive';
  changedPixels: number;
  unstablePixels: number;
  totalPixels: number;
}

const DEFAULT_MARGIN_CSS_PX = 32;

export function focusVisibleRegionFromRect(
  rect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'>,
  viewportWidth: number,
  viewportHeight: number,
  margin = DEFAULT_MARGIN_CSS_PX,
): FocusVisibleRegion | undefined {
  if (rect.width <= 0 || rect.height <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return undefined;
  if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth || rect.top >= viewportHeight) return undefined;

  const left = Math.max(0, rect.left - margin);
  const top = Math.max(0, rect.top - margin);
  const right = Math.min(viewportWidth, rect.right + margin);
  const bottom = Math.min(viewportHeight, rect.bottom + margin);
  if (right <= left || bottom <= top) return undefined;

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

export function cropFocusVisibleFrame(
  frame: FocusVisiblePixelFrame,
  region: FocusVisibleRegion,
  viewportWidthCss: number,
  viewportHeightCss: number,
): FocusVisiblePixelFrame | undefined {
  if (frame.width <= 0 || frame.height <= 0 || viewportWidthCss <= 0 || viewportHeightCss <= 0) return undefined;
  const scaleX = frame.width / viewportWidthCss;
  const scaleY = frame.height / viewportHeightCss;
  const left = Math.max(0, Math.floor(region.left * scaleX));
  const top = Math.max(0, Math.floor(region.top * scaleY));
  const right = Math.min(frame.width, Math.ceil((region.left + region.width) * scaleX));
  const bottom = Math.min(frame.height, Math.ceil((region.top + region.height) * scaleY));
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return undefined;

  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = ((top + y) * frame.width + left) * 4;
    const sourceEnd = sourceStart + width * 4;
    data.set(frame.data.subarray(sourceStart, sourceEnd), y * width * 4);
  }
  return { width, height, data };
}

function pixelEquals(dataA: Uint8ClampedArray, dataB: Uint8ClampedArray, offset: number): boolean {
  return dataA[offset] === dataB[offset]
    && dataA[offset + 1] === dataB[offset + 1]
    && dataA[offset + 2] === dataB[offset + 2]
    && dataA[offset + 3] === dataB[offset + 3];
}

export function compareFocusVisibleSamples(
  baselineFirst: FocusVisiblePixelFrame,
  baselineSecond: FocusVisiblePixelFrame,
  focusedFirst: FocusVisiblePixelFrame,
  focusedSecond: FocusVisiblePixelFrame,
): FocusVisibleComparison {
  const frames = [baselineFirst, baselineSecond, focusedFirst, focusedSecond];
  if (frames.some((frame) => frame.width !== baselineFirst.width || frame.height !== baselineFirst.height)) {
    return { outcome: 'inconclusive', changedPixels: 0, unstablePixels: 0, totalPixels: 0 };
  }

  const totalPixels = baselineFirst.width * baselineFirst.height;
  let changedPixels = 0;
  let unstablePixels = 0;

  for (let offset = 0; offset < baselineFirst.data.length; offset += 4) {
    const baselineStable = pixelEquals(baselineFirst.data, baselineSecond.data, offset);
    const focusedStable = pixelEquals(focusedFirst.data, focusedSecond.data, offset);
    if (!baselineStable || !focusedStable) {
      unstablePixels += 1;
      continue;
    }
    if (!pixelEquals(baselineFirst.data, focusedFirst.data, offset)) changedPixels += 1;
  }

  if (changedPixels > 0) return { outcome: 'changed', changedPixels, unstablePixels, totalPixels };
  if (unstablePixels > 0) return { outcome: 'inconclusive', changedPixels, unstablePixels, totalPixels };
  return { outcome: 'unchanged', changedPixels, unstablePixels, totalPixels };
}

export function viewportStateMatches(
  baseline: FocusVisibleViewportState,
  current: FocusVisibleViewportState,
): boolean {
  return baseline.width === current.width
    && baseline.height === current.height
    && baseline.scrollX === current.scrollX
    && baseline.scrollY === current.scrollY;
}

export function createFocusVisibleReviewEvent(input: {
  element: ElementSnapshot;
  region: FocusVisibleRegion;
  totalPixels: number;
}): PendingRuntimeEvent {
  const { element, region, totalPixels } = input;
  return {
    kind: 'focus',
    severity: FOCUS_VISIBLE_RULE.severity,
    outcome: 'review',
    ruleId: FOCUS_VISIBLE_RULE.id,
    references: FOCUS_VISIBLE_RULE.references,
    title: FOCUS_VISIBLE_RULE.title,
    detail: `After a real Tab focus transition, two stable before-focus captures and two stable focused captures showed no pixel-color change in the local ${Math.round(region.width)} × ${Math.round(region.height)} CSS px comparison region around ${element.selector} (${totalPixels} device pixels compared). Review the indicator manually: FocusTrace intentionally does not treat this bounded local comparison as an automatic WCAG failure because ACT oj04fd permits a focus indication elsewhere in the viewport.`,
    element,
  };
}
