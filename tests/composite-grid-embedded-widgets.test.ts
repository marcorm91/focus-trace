// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { captureCompositeWidgetProbes } from '../lib/runtime/composite-widget-runtime';

function render(body: string): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><body>${body}</body></html>`);
  document.close();
}

function element(selector: string): Element {
  const result = document.querySelector(selector);
  if (!result) throw new Error(`Missing fixture element ${selector}`);
  return result;
}

function gridNavigationProbe(selector: string) {
  return captureCompositeWidgetProbes(element(selector), { kind: 'keydown', key: 'ArrowRight' })
    .find((probe) => probe.kind === 'grid-arrow-navigation');
}

describe('grid embedded widget arrow ownership', () => {
  it('keeps grid navigation active for a checkbox that does not use arrow keys', () => {
    render(`
      <div role="grid">
        <div role="row">
          <div id="first" role="gridcell"><input id="check" type="checkbox" aria-label="Select row"></div>
          <div role="gridcell" tabindex="-1">Next</div>
        </div>
      </div>
    `);

    (element('#check') as HTMLInputElement).focus();
    expect(gridNavigationProbe('#check')).toBeDefined();
  });

  it('keeps grid navigation active for an input button that does not use arrow keys', () => {
    render(`
      <div role="grid">
        <div role="row">
          <div role="gridcell"><input id="action" type="button" value="Open"></div>
          <div role="gridcell" tabindex="-1">Next</div>
        </div>
      </div>
    `);

    (element('#action') as HTMLInputElement).focus();
    expect(gridNavigationProbe('#action')).toBeDefined();
  });

  it('does not impose grid navigation while a nested toolbar owns arrow navigation', () => {
    render(`
      <div role="grid">
        <div role="row">
          <div role="gridcell">
            <div role="toolbar" aria-label="Actions">
              <button id="bold" type="button">Bold</button>
              <button type="button">Italic</button>
            </div>
          </div>
          <div role="gridcell" tabindex="-1">Next</div>
        </div>
      </div>
    `);

    (element('#bold') as HTMLButtonElement).focus();
    expect(captureCompositeWidgetProbes(element('#bold'), { kind: 'keydown', key: 'ArrowRight' })).toEqual([]);
  });

  it('does not impose grid navigation while a custom radio group owns arrow navigation', () => {
    render(`
      <div role="grid">
        <div role="row">
          <div role="gridcell">
            <div role="radiogroup" aria-label="Size">
              <div id="small" role="radio" tabindex="0" aria-checked="true">Small</div>
              <div role="radio" tabindex="-1" aria-checked="false">Large</div>
            </div>
          </div>
          <div role="gridcell" tabindex="-1">Next</div>
        </div>
      </div>
    `);

    (element('#small') as HTMLElement).focus();
    expect(captureCompositeWidgetProbes(element('#small'), { kind: 'keydown', key: 'ArrowRight' })).toEqual([]);
  });
});
