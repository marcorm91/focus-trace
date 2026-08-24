import { afterEach, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  clearFocusPathInPage,
  showFocusPathInPage,
} from '../lib/runtime/focus-path-overlay';

type DomGlobals = typeof globalThis & {
  window: Window;
  document: Document;
  Event: typeof Event;
};

let dom: JSDOM | undefined;
const previous = {
  window: (globalThis as Partial<DomGlobals>).window,
  document: (globalThis as Partial<DomGlobals>).document,
  Event: (globalThis as Partial<DomGlobals>).Event,
};

function installDom(): void {
  dom = new JSDOM(
    '<!doctype html><html><body><button id="first">First</button><button id="second">Second</button></body></html>',
    { pretendToBeVisual: true },
  );
  const globals = globalThis as DomGlobals;
  globals.window = dom.window as unknown as Window;
  globals.document = dom.window.document;
  globals.Event = dom.window.Event as unknown as typeof Event;

  Object.defineProperty(dom.window.Element.prototype, 'scrollIntoView', {
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
  if (dom) clearFocusPathInPage();
  dom?.window.close();
  dom = undefined;

  const globals = globalThis as Partial<DomGlobals>;
  if (previous.window) globals.window = previous.window;
  else delete globals.window;
  if (previous.document) globals.document = previous.document;
  else delete globals.document;
  if (previous.Event) globals.Event = previous.Event;
  else delete globals.Event;
});

describe('focus path page overlay', () => {
  it('shows recorded positions, reports missing targets and never moves focus', () => {
    installDom();
    const first = document.querySelector<HTMLButtonElement>('#first')!;
    first.focus();
    const activeBeforeInspection = document.activeElement;

    const result = showFocusPathInPage([
      { selector: '#first', label: 'First', orders: [1, 3] },
      { selector: '#second', label: 'Second', orders: [2] },
      { selector: '#removed', label: 'Removed', orders: [4] },
    ], '#second');

    expect(result).toEqual({ found: 2, missing: 1 });
    expect(document.activeElement).toBe(activeBeforeInspection);

    const overlays = [...document.querySelectorAll('[data-focustrace-focus-target]')];
    expect(overlays[0]?.textContent).toBe('1 · 3');
    expect(overlays[1]?.textContent).toBe('2');
    expect((overlays[1] as HTMLElement).style.border).toContain('4px');
    expect((overlays[2] as HTMLElement).style.display).toBe('none');

    expect(clearFocusPathInPage()).toEqual({ removed: true });
    expect(document.querySelector('[data-focustrace-focus-path]')).toBeNull();
  });
});
