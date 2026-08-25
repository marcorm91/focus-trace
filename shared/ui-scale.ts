export const UI_SCALE_STORAGE_KEY = 'focustrace:ui-scale';

export const UI_SCALE_VALUES = [100, 110, 120, 130] as const;
export type UiScale = (typeof UI_SCALE_VALUES)[number];

export const DEFAULT_UI_SCALE: UiScale = 100;

export function normalizeUiScale(value: unknown): UiScale {
  const numeric = typeof value === 'number' ? value : Number(value);
  return UI_SCALE_VALUES.includes(numeric as UiScale)
    ? numeric as UiScale
    : DEFAULT_UI_SCALE;
}

export function adjacentUiScale(current: UiScale, direction: -1 | 1): UiScale {
  const index = UI_SCALE_VALUES.indexOf(current);
  const nextIndex = Math.min(
    UI_SCALE_VALUES.length - 1,
    Math.max(0, index + direction),
  );
  return UI_SCALE_VALUES[nextIndex] ?? DEFAULT_UI_SCALE;
}
