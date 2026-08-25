// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import {
  clearFocusPathInPage,
  showFocusPathInPage,
} from '../lib/runtime/focus-path-overlay';

function installFixture(): void {
  document.body.innerHTML = '<button id="first">First</button><button id="second">Second</button>';

  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  });

  for (const [index, element] of [...document.querySelectorAll('button')].entries()) {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 20 + index * 40,
        left: 30,
        right: 150,
        bottom: 50 + index * 40,
        width: 120,
        height: 30,
        x: 30,
        y: 20 + index * 40,
        toJSON: () => ({}),
      }),
    });
  }
}

afterEach(() => {
  clearFocusPathInPage();
  document.body.innerHTML = '';
  delete (Element.prototype as { scrollIntoView?: Element['scrollIntoView'] }).scrollIntoView;
});

describe('focus path page overlay', () => {
  it('shows recorded positions, reports missing targets and never moves focus', () => {
    installFixture();
    const first = document.querySelector<HTMLButtonElement>('#first')!;
    first.focus();
    const activeBeforeInspection = document.activeElement;

    const result = showFocusPathInPage([
      { selector: '#first', label: 'First', orders: [1, 3] },
      {
        selector: '#second',
        label: 'Second',
        orders: [2],
        tone: 'fail',
        status: 'Likely failure',
        detail: 'The button has no accessible name.',
        meta: 'button · Unnamed',
        findingCount: 2,
      },
      { selector: '#removed', label: 'Removed', orders: [4] },
    ], '#second');

    expect(result).toEqual({ found: 2, missing: 1 });
    expect(document.activeElement).toBe(activeBeforeInspection);

    const overlays = [...document.querySelectorAll('[data-focustrace-focus-target]')];
    expect(overlays[0]?.textContent).toBe('1 · 3');
    expect(overlays[0]?.querySelector('span')?.getAttribute('data-focustrace-placement')).toBe('below');
    expect(overlays[1]?.textContent).toBe('2');
    expect(overlays[1]?.querySelector('span')?.getAttribute('data-focustrace-placement')).toBe('above');
    expect((overlays[1] as HTMLElement).style.border).toContain('4px');
    expect((overlays[1] as HTMLElement).dataset.focustraceTone).toBe('fail');
    expect((overlays[2] as HTMLElement).style.display).toBe('none');

    const card = document.querySelector<HTMLElement>('[data-focustrace-inspector-card]');
    expect(card?.textContent).toContain('#2 / 4 · Second');
    expect(card?.dataset.focustracePlacement).toBe('below');
    expect(card?.textContent).toContain('Likely failure');
    expect(card?.textContent).toContain('The button has no accessible name.');
    expect(card?.textContent).toContain('2 linked findings');

    expect(clearFocusPathInPage()).toEqual({ removed: true });
    expect(document.querySelector('[data-focustrace-focus-path]')).toBeNull();
  });

  it('moves the inspector card above a target near the bottom edge', () => {
    installFixture();
    const second = document.querySelector('#second')!;
    Object.defineProperty(second, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 720,
        left: 30,
        right: 150,
        bottom: 750,
        width: 120,
        height: 30,
        x: 30,
        y: 720,
        toJSON: () => ({}),
      }),
    });

    showFocusPathInPage([
      { selector: '#second', label: 'Second', orders: [2] },
    ], '#second');

    const card = document.querySelector<HTMLElement>('[data-focustrace-inspector-card]');
    expect(card?.dataset.focustracePlacement).toBe('above');
    expect(Number.parseFloat(card?.style.top ?? '')).toBeGreaterThanOrEqual(12);
  });
});
