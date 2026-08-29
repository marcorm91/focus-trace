import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { activationBelongsToPanelWindow } from '../entrypoints/sidepanel/hooks/window-session';

describe('sidepanel window session isolation', () => {
  it('accepts tab activations only from the sidepanel owner window', () => {
    expect(activationBelongsToPanelWindow(10, 10)).toBe(true);
    expect(activationBelongsToPanelWindow(10, 11)).toBe(false);
    expect(activationBelongsToPanelWindow(undefined, 10)).toBe(false);
  });

  it('captures the owner window from the initial current-window active tab', () => {
    const hookSource = readFileSync(
      resolve(process.cwd(), 'entrypoints/sidepanel/hooks/useSidepanelSession.ts'),
      'utf8',
    );
    expect(hookSource).toContain('activeTabForCurrentWindow');
    expect(hookSource).toContain('panelWindowRef.current = windowId');
    expect(hookSource).toContain('activationBelongsToPanelWindow(panelWindowRef.current, windowId)');
  });

  it('keeps transient runtime state separate from persistent FocusTrace Memory', () => {
    const background = readFileSync(resolve(process.cwd(), 'entrypoints/background.ts'), 'utf8');
    const memoryStorage = readFileSync(resolve(process.cwd(), 'lib/focus-memory/storage.ts'), 'utf8');
    expect(background).toContain('browser.storage.session');
    expect(background).toContain('session:${tabId}');
    expect(memoryStorage).toContain('browser.storage.local');
  });
});
