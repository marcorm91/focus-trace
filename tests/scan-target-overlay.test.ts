// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { locateScanTargetInPage } from '../lib/runtime/scan-target-overlay';

function rect(top: number, left = 30, width = 120, height = 50) {
  return {
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function installFixture(): void {
  document.body.innerHTML = '<main><section id="card"><span>Broken item</span></section></main>';

  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });

  const target = document.querySelector('#card')!;
  Object.defineProperty(target, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect(20),
  });
}

afterEach(() => {
  document.querySelector('[data-focustrace-scan-highlight]')?.remove();
  document.querySelector('[data-focustrace-structure-highlights]')?.remove();
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

  it('highlights all rendered targets for a Structure metric group', () => {
    document.body.innerHTML = '<main><ul id="one"><li>One</li></ul><ol id="two"><li>Two</li></ol></main>';
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    const one = document.querySelector('#one')!;
    const two = document.querySelector('#two')!;
    Object.defineProperty(one, 'getBoundingClientRect', { configurable: true, value: () => rect(20) });
    Object.defineProperty(two, 'getBoundingClientRect', { configurable: true, value: () => rect(100) });

    const groupSelector = `__focustrace_group__:${encodeURIComponent(JSON.stringify({
      selector: 'ul,ol',
      label: 'Listas',
    }))}`;
    const result = locateScanTargetInPage(groupSelector, { durationMs: 0, focusTarget: false });

    expect(result).toEqual({ found: true, selector: groupSelector, rendered: true });
    const group = document.querySelector<HTMLElement>('[data-focustrace-structure-highlights]');
    expect(group).not.toBeNull();
    expect(group?.children).toHaveLength(2);
    expect(group?.textContent).toContain('Listas · 2');
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
      value: () => rect(0, 0, 0, 0),
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
