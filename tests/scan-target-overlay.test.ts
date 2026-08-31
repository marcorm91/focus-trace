// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { locateScanTargetInPage } from '../lib/runtime/scan-target-overlay';

function installFixture(): void {
  document.body.innerHTML = '<main><section id="card"><span>Broken item</span></section></main>';

  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });

  const target = document.querySelector('#card')!;
  Object.defineProperty(target, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      top: 20,
      left: 30,
      right: 150,
      bottom: 70,
      width: 120,
      height: 50,
      x: 30,
      y: 20,
      toJSON: () => ({}),
    }),
  });
}

afterEach(() => {
  document.querySelector('[data-focustrace-scan-highlight]')?.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  delete (Element.prototype as { scrollIntoView?: Element['scrollIntoView'] }).scrollIntoView;
});

describe('scan target page overlay', () => {
  it('strongly highlights a matched target without returning hidden DOM content', () => {
    installFixture();

    const result = locateScanTargetInPage('#card');

    expect(result).toEqual({
      found: true,
      selector: '#card',
      rendered: true,
    });
    expect(document.activeElement).toBe(document.querySelector('#card'));
    expect(document.querySelector('#card')?.hasAttribute('tabindex')).toBe(false);

    const overlay = document.querySelector<HTMLElement>('[data-focustrace-scan-highlight]');
    expect(overlay).not.toBeNull();
    expect(overlay?.dataset.focustraceTone).toBe('inspect');
    expect(overlay?.textContent).toContain('FocusTrace · section');
    expect(overlay?.textContent).toContain('Broken item');
    expect(overlay?.style.border).toContain('4px solid');
    expect(overlay?.style.boxShadow).not.toContain('100vmax');
    expect(overlay?.style.pointerEvents).toBe('none');
  });

  it('still works when serialized like chrome.scripting.executeScript', () => {
    installFixture();

    const injected = new Function(`return (${locateScanTargetInPage.toString()});`)() as typeof locateScanTargetInPage;
    const result = injected('#card', { focusTarget: false, durationMs: 0 });

    expect(result.found).toBe(true);
    expect(result.selector).toBe('#card');
    expect(result.rendered).toBe(true);
    expect(document.querySelector('[data-focustrace-scan-highlight]')).not.toBeNull();
  });

  it('reports a DOM-only target instead of drawing an invisible overlay', () => {
    installFixture();
    document.head.innerHTML = '<script id="metadata" charset="utf-8"></script>';
    const target = document.querySelector('#metadata')!;
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    expect(locateScanTargetInPage('#metadata')).toEqual({
      found: true,
      selector: '#metadata',
      rendered: false,
    });
    expect(document.querySelector('[data-focustrace-scan-highlight]')).toBeNull();
  });

  it('returns a miss for stale or invalid selectors without leaving overlays behind', () => {
    installFixture();

    expect(locateScanTargetInPage('#missing')).toEqual({ found: false, selector: '#missing', rendered: false });
    expect(locateScanTargetInPage('main >> broken')).toEqual({
      found: false,
      selector: 'main >> broken',
      rendered: false,
    });
    expect(document.querySelector('[data-focustrace-scan-highlight]')).toBeNull();
  });
});
