// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { focusWalkCandidates, sequentialFocusPosition } from '../lib/runtime/focus-walk';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html><head><title>Focus walk</title></head><body>${body}</body></html>`);
  document.close();

  for (const element of document.querySelectorAll('*')) {
    Object.defineProperty(element, 'getClientRects', {
      configurable: true,
      value: () => [{ width: 24, height: 24 }],
    });
  }
}

describe('focusWalkCandidates', () => {
  beforeEach(() => render(''));

  it('orders positive tabindex before natural DOM focus order', () => {
    render(`
      <a id="first" href="/first">First</a>
      <button id="third">Third</button>
      <button id="priority" tabindex="1">Priority</button>
      <a id="second" href="/second">Second</a>
    `);

    expect(focusWalkCandidates().map((candidate) => candidate.selector)).toEqual([
      '#priority',
      '#first',
      '#third',
      '#second',
    ]);
  });

  it('skips disabled, hidden and negative-tabindex controls', () => {
    render(`
      <button id="enabled">Enabled</button>
      <button id="disabled" disabled>Disabled</button>
      <a id="hidden" href="/hidden" style="display:none">Hidden</a>
      <button id="negative" tabindex="-1">Negative</button>
    `);

    expect(focusWalkCandidates().map((candidate) => candidate.selector)).toEqual(['#enabled']);
  });

  it('includes contenteditable and explicit tabindex targets', () => {
    render(`
      <div id="editable" contenteditable="true" tabindex="0">Edit me</div>
      <div id="custom" tabindex="0">Custom</div>
    `);

    expect(focusWalkCandidates().map((candidate) => candidate.selector)).toEqual(['#editable', '#custom']);
  });

  it('limits the automatic walk to the active component while keeping document positions global', () => {
    render(`
      <button id="outside">Outside</button>
      <section id="checkout" tabindex="0">
        <button id="inside">Inside</button>
      </section>
    `);
    document.documentElement.setAttribute(
      'data-focustrace-focus-component',
      JSON.stringify({ selector: '#checkout' }),
    );

    expect(focusWalkCandidates().map((candidate) => candidate.selector)).toEqual([
      '#checkout',
      '#inside',
    ]);
    expect(sequentialFocusPosition(document.querySelector('#outside')!)).toEqual({
      index: 1,
      size: 3,
    });
  });

  it('does not fall back to page-wide focus when the active component is stale', () => {
    render('<button id="outside">Outside</button>');
    document.documentElement.setAttribute(
      'data-focustrace-focus-component',
      JSON.stringify({ selector: '#missing-component' }),
    );

    expect(focusWalkCandidates()).toEqual([]);
  });

  it('returns the one-based position and total sequential focus size', () => {
    render(`
      <button id="first">First</button>
      <button id="second">Second</button>
      <a id="third" href="/third">Third</a>
    `);

    expect(sequentialFocusPosition(document.querySelector('#second')!)).toEqual({
      index: 2,
      size: 3,
    });
    expect(sequentialFocusPosition(document.body)).toBeUndefined();
  });
});
