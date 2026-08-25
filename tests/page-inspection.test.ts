// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  actionTarget,
  findDialogs,
  findSignificantAddedElements,
  isDialogOpen,
  isModalDialog,
  mayBeCompletelyObscured,
  snapshot,
} from '../lib/runtime/page-inspection';

function mount(html: string): void {
  document.open();
  document.write(`<!doctype html><html><body>${html}</body></html>`);
  document.close();
}

afterEach(() => {
  vi.restoreAllMocks();
  mount('');
});

describe('runtime page inspection helpers', () => {
  it('builds element snapshots with selector, role and accessible name', () => {
    mount('<button id="save" aria-label="Save profile"></button>');

    expect(snapshot(document.querySelector('#save')!)).toEqual({
      tag: 'button',
      id: 'save',
      selector: '#save',
      name: 'Save profile',
      attributes: {
        ariaLabel: 'Save profile',
      },
    });
  });

  it('stores the element position in the sequential focus order', () => {
    mount('<button id="save">Save</button>');

    expect(snapshot(document.querySelector('#save')!, { index: 3, size: 8 })).toMatchObject({
      selector: '#save',
      tabOrderIndex: 3,
      tabOrderSize: 8,
    });
  });

  it('resolves action targets from nested event targets', () => {
    mount('<button id="save"><span id="label">Save</span></button><div id="plain"><span id="text">Text</span></div>');

    expect(actionTarget(document.querySelector('#label')!)).toBe(document.querySelector('#save'));
    expect(actionTarget(document.querySelector('#text')!)).toBe(document.querySelector('#text'));
  });

  it('finds open dialogs and significant added elements', () => {
    mount(`
      <section id="root">
        <dialog id="native" open></dialog>
        <div id="custom" role="dialog" aria-modal="true"></div>
        <input id="focus" autofocus>
      </section>
    `);
    const root = document.querySelector('#root')!;

    expect(findDialogs(root).map((element) => element.id)).toEqual(['native', 'custom']);
    expect(findSignificantAddedElements(root).map((element) => element.id)).toEqual(['native', 'custom', 'focus']);
  });

  it('detects open modal dialog semantics', () => {
    mount('<div id="dialog" role="dialog" aria-modal="true"></div><div id="closed" role="dialog" style="display: none"></div>');

    expect(isDialogOpen(document.querySelector('#dialog')!)).toBe(true);
    expect(isModalDialog(document.querySelector('#dialog')!)).toBe(true);
    expect(isDialogOpen(document.querySelector('#closed')!)).toBe(false);
  });

  it('reports a focused element as completely obscured when sampled points are covered', () => {
    mount('<button id="target">Target</button><div id="cover"></div>');
    const target = document.querySelector('#target')!;
    const cover = document.querySelector('#cover')!;

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 10,
        left: 10,
        right: 110,
        bottom: 50,
        width: 100,
        height: 40,
        x: 10,
        y: 10,
        toJSON: () => ({}),
      }),
    });
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [cover, target],
    });

    expect(mayBeCompletelyObscured(target)).toMatchObject({
      obscured: true,
      evidence: expect.stringContaining('#cover'),
    });
  });
});
