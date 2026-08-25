// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { focusWalkCandidates } from '../lib/runtime/focus-walk';

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
      <div id="editable" contenteditable="true">Edit me</div>
      <div id="custom" tabindex="0">Custom</div>
    `);

    expect(focusWalkCandidates().map((candidate) => candidate.selector)).toEqual(['#editable', '#custom']);
  });
});
