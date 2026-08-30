import { describe, expect, it } from 'vitest';
import { rovingTabTarget } from '../lib/ui/roving-tabs';

const tabs = [
  { id: 'first' as const },
  { id: 'disabled' as const, disabled: true },
  { id: 'third' as const },
  { id: 'fourth' as const },
];

describe('roving tabs', () => {
  it('moves with horizontal arrow keys, wraps and skips disabled tabs', () => {
    expect(rovingTabTarget(tabs, 'first', 'ArrowRight')).toBe('third');
    expect(rovingTabTarget(tabs, 'third', 'ArrowLeft')).toBe('first');
    expect(rovingTabTarget(tabs, 'fourth', 'ArrowRight')).toBe('first');
    expect(rovingTabTarget(tabs, 'first', 'ArrowLeft')).toBe('fourth');
  });

  it('supports Home and End without treating vertical arrows as horizontal tab navigation', () => {
    expect(rovingTabTarget(tabs, 'third', 'Home')).toBe('first');
    expect(rovingTabTarget(tabs, 'first', 'End')).toBe('fourth');
    expect(rovingTabTarget(tabs, 'first', 'ArrowDown')).toBeUndefined();
  });

  it('supports vertical orientation when a future tab surface needs it', () => {
    expect(rovingTabTarget(tabs, 'first', 'ArrowDown', 'vertical')).toBe('third');
    expect(rovingTabTarget(tabs, 'third', 'ArrowUp', 'vertical')).toBe('first');
  });
});
