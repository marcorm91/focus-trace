import { describe, expect, it } from 'vitest';
import {
  adjacentUiScale,
  DEFAULT_UI_SCALE,
  normalizeUiScale,
} from '../shared/ui-scale';

describe('FocusTrace UI scale', () => {
  it('normalizes supported values and falls back safely', () => {
    expect(normalizeUiScale(100)).toBe(100);
    expect(normalizeUiScale('120')).toBe(120);
    expect(normalizeUiScale(115)).toBe(DEFAULT_UI_SCALE);
    expect(normalizeUiScale(undefined)).toBe(DEFAULT_UI_SCALE);
  });

  it('steps through the supported range without exceeding its bounds', () => {
    expect(adjacentUiScale(100, -1)).toBe(100);
    expect(adjacentUiScale(100, 1)).toBe(110);
    expect(adjacentUiScale(120, 1)).toBe(130);
    expect(adjacentUiScale(130, 1)).toBe(130);
  });
});
