// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  compareFocusVisibleSamples,
  createFocusVisibleReviewEvent,
  cropFocusVisibleFrame,
  focusVisibleRegionFromRect,
  viewportStateMatches,
  type FocusVisiblePixelFrame,
} from '../lib/runtime/focus-visible';
import { FOCUS_VISIBLE_RULE } from '../shared/focus-visible-rules';

function frame(width: number, height: number, value = 0): FocusVisiblePixelFrame {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }
  return { width, height, data };
}

function setPixel(sample: FocusVisiblePixelFrame, index: number, value: number) {
  const offset = index * 4;
  sample.data[offset] = value;
  sample.data[offset + 1] = value;
  sample.data[offset + 2] = value;
}

describe('WCAG 2.4.7 focus-visible pixel evidence', () => {
  it('defines a bounded visible comparison region and ignores off-viewport targets', () => {
    expect(focusVisibleRegionFromRect({ left: 100, top: 80, right: 180, bottom: 120, width: 80, height: 40 }, 800, 600)).toEqual({
      left: 68,
      top: 48,
      width: 144,
      height: 104,
    });
    expect(focusVisibleRegionFromRect({ left: 900, top: 80, right: 980, bottom: 120, width: 80, height: 40 }, 800, 600)).toBeUndefined();
  });

  it('maps a CSS-pixel region onto screenshot device pixels without resampling', () => {
    const source = frame(4, 4);
    for (let index = 0; index < 16; index += 1) setPixel(source, index, index);
    const crop = cropFocusVisibleFrame(source, { left: 1, top: 1, width: 1, height: 1 }, 2, 2);
    expect(crop).toMatchObject({ width: 2, height: 2 });
    expect(crop?.data[0]).toBe(10);
    expect(crop?.data[4]).toBe(11);
    expect(crop?.data[8]).toBe(14);
    expect(crop?.data[12]).toBe(15);
  });

  it('accepts a stable pixel change as visible-focus evidence', () => {
    const beforeA = frame(2, 2, 10);
    const beforeB = frame(2, 2, 10);
    const afterA = frame(2, 2, 10);
    const afterB = frame(2, 2, 10);
    setPixel(afterA, 2, 40);
    setPixel(afterB, 2, 40);

    expect(compareFocusVisibleSamples(beforeA, beforeB, afterA, afterB)).toEqual({
      outcome: 'changed',
      changedPixels: 1,
      unstablePixels: 0,
      totalPixels: 4,
    });
  });

  it('refuses to call a dynamic crop unchanged when either state is unstable', () => {
    const beforeA = frame(2, 2, 10);
    const beforeB = frame(2, 2, 10);
    const afterA = frame(2, 2, 10);
    const afterB = frame(2, 2, 10);
    setPixel(afterB, 0, 20);

    expect(compareFocusVisibleSamples(beforeA, beforeB, afterA, afterB)).toEqual({
      outcome: 'inconclusive',
      changedPixels: 0,
      unstablePixels: 1,
      totalPixels: 4,
    });
  });

  it('returns unchanged only when all compared pixels are stable and identical', () => {
    const beforeA = frame(2, 2, 10);
    const beforeB = frame(2, 2, 10);
    const afterA = frame(2, 2, 10);
    const afterB = frame(2, 2, 10);
    expect(compareFocusVisibleSamples(beforeA, beforeB, afterA, afterB).outcome).toBe('unchanged');
  });

  it('invalidates a baseline after viewport or scroll movement', () => {
    const baseline = { width: 800, height: 600, scrollX: 0, scrollY: 120 };
    expect(viewportStateMatches(baseline, { ...baseline })).toBe(true);
    expect(viewportStateMatches(baseline, { ...baseline, scrollY: 121 })).toBe(false);
    expect(viewportStateMatches(baseline, { ...baseline, width: 799 })).toBe(false);
  });

  it('keeps missing local pixel change as REVIEW, not automatic FAIL', () => {
    const event = createFocusVisibleReviewEvent({
      element: { tag: 'button', selector: '#save', name: 'Save' },
      region: { left: 10, top: 20, width: 100, height: 60 },
      totalPixels: 24_000,
    });
    expect(event).toMatchObject({
      kind: 'focus',
      ruleId: 'FT-RUNTIME-010',
      outcome: 'review',
      severity: 'serious',
    });
    expect(event.references?.map((reference) => reference.id)).toEqual(['2.4.7', 'oj04fd']);
    expect(event.detail).toContain('real Tab focus transition');
    expect(event.detail).toContain('does not treat this bounded local comparison as an automatic WCAG failure');
  });

  it('documents the external rule contract and current ACT identifier', () => {
    expect(FOCUS_VISIBLE_RULE).toMatchObject({ id: 'FT-RUNTIME-010', severity: 'serious' });
    expect(FOCUS_VISIBLE_RULE.references.find((reference) => reference.type === 'WCAG')).toMatchObject({
      id: '2.4.7',
      level: 'AA',
      status: 'normative',
    });
    expect(FOCUS_VISIBLE_RULE.references.find((reference) => reference.type === 'ACT')).toMatchObject({
      id: 'oj04fd',
      status: 'informative',
    });
  });
});
