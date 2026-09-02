// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearFocusWalkBackdropInPage,
  showFocusWalkBackdropInPage,
} from '../lib/runtime/focus-walk-backdrop';

afterEach(() => {
  clearFocusWalkBackdropInPage();
});

describe('automatic focus walk backdrop', () => {
  it('shows progress beyond the old 80-step limit and exposes cancellation', () => {
    const onCancel = vi.fn();
    const backdrop = showFocusWalkBackdropInPage(347, onCancel);

    backdrop.update(180, 347);

    expect(document.documentElement.textContent).toContain('Elemento 180 de 347');
    expect(document.documentElement.textContent).toContain('Foco 180/347');

    const cancelButton = document.querySelector<HTMLButtonElement>(
      '[data-focustrace-focus-walk-cancel]',
    );
    expect(cancelButton).not.toBeNull();

    cancelButton?.click();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(cancelButton?.disabled).toBe(true);
    expect(cancelButton?.textContent).toBe('Cancelando…');
    expect(document.querySelector('[data-focustrace-focus-walk-backdrop]')).not.toBeNull();

    backdrop.dispose();
    expect(document.querySelector('[data-focustrace-focus-walk-backdrop]')).toBeNull();
  });
});
