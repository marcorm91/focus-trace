// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mayBeCompletelyObscured } from '../lib/runtime/page-inspection';

function mount(): { target: HTMLElement; cover: HTMLElement } {
  document.body.innerHTML = '<button id="target">Target</button><div id="cover">Cover</div>';
  const target = document.querySelector<HTMLElement>('#target')!;
  const cover = document.querySelector<HTMLElement>('#cover')!;

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
  return { target, cover };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('WCAG 2.4.11 focus obscuration evidence', () => {
  it('requires every sampled point in the visible focused area to be covered', () => {
    const { target, cover } = mount();
    let calls = 0;
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => {
        calls += 1;
        return calls === 13 ? [target] : [cover, target];
      },
    });

    expect(mayBeCompletelyObscured(target)).toEqual({ obscured: false });
    expect(calls).toBe(13);
  });

  it('reports complete coverage using a denser sampled grid', () => {
    const { target, cover } = mount();
    const elementsFromPoint = vi.fn(() => [cover, target]);
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: elementsFromPoint,
    });

    const result = mayBeCompletelyObscured(target);
    expect(result.obscured).toBe(true);
    expect(result.evidence).toContain('All 25 sampled points');
    expect(result.evidence).toContain('#cover');
    expect(elementsFromPoint).toHaveBeenCalledTimes(25);
  });

  it('does not treat a fully transparent overlay as a visible blocker', () => {
    const { target, cover } = mount();
    cover.style.opacity = '0';
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [cover, target],
    });

    expect(mayBeCompletelyObscured(target)).toEqual({ obscured: false });
  });
});
