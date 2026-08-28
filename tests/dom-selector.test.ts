// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { selectorFor } from '../lib/audit/dom';

describe('stable DOM selectors', () => {
  it('keeps the compact id selector when the id is unique', () => {
    document.body.innerHTML = '<main><button id="save">Save</button></main>';
    const button = document.querySelector('#save');
    expect(button).not.toBeNull();
    expect(selectorFor(button!)).toBe('#save');
  });

  it('does not use an ambiguous id selector when duplicate ids exist', () => {
    document.body.innerHTML = `
      <main>
        <section><button id="duplicate">First</button></section>
        <section><button id="duplicate">Second</button></section>
      </main>
    `;
    const [first, second] = [...document.querySelectorAll('#duplicate')];
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    const firstSelector = selectorFor(first!);
    const secondSelector = selectorFor(second!);

    expect(firstSelector).not.toBe('#duplicate');
    expect(secondSelector).not.toBe('#duplicate');
    expect(firstSelector).not.toBe(secondSelector);
    expect(document.querySelectorAll(firstSelector)).toHaveLength(1);
    expect(document.querySelectorAll(secondSelector)).toHaveLength(1);
    expect(document.querySelector(firstSelector)).toBe(first);
    expect(document.querySelector(secondSelector)).toBe(second);
  });

  it('keeps structural selectors unique in repeated nested markup', () => {
    document.body.innerHTML = `
      <div>
        <section><button id="duplicate">First</button></section>
        <section><button id="duplicate">Second</button></section>
      </div>
      <div>
        <section><button>Other first</button></section>
        <section><button>Other second</button></section>
      </div>
    `;
    const second = document.querySelectorAll('#duplicate')[1];
    const selector = selectorFor(second!);

    expect(document.querySelectorAll(selector)).toHaveLength(1);
    expect(document.querySelector(selector)).toBe(second);
  });
});
