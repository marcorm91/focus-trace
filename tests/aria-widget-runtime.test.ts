// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  captureAriaWidgetProbes,
  createDynamicDialogNameReview,
  evaluateAriaWidgetProbe,
} from '../lib/runtime/aria-widget-runtime';

function render(body: string): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>ARIA runtime</title></head><body>${body}</body></html>`);
  document.close();
}

function element(selector: string): Element {
  const result = document.querySelector(selector);
  if (!result) throw new Error(`Missing fixture element ${selector}`);
  return result;
}

describe('runtime ARIA widget validation', () => {
  it('warns when aria-expanded=false leaves controlled content available', () => {
    render(`
      <button id="filters" aria-expanded="false" aria-controls="filters-panel">Filters</button>
      <div id="filters-panel">Filter options</div>
    `);

    const [probe] = captureAriaWidgetProbes(element('#filters'), { kind: 'click' });
    expect(probe?.kind).toBe('expanded-control');
    expect(evaluateAriaWidgetProbe(probe!)).toMatchObject({
      kind: 'aria-widget',
      ruleId: 'FT-RUNTIME-ARIA-001',
      outcome: 'warning',
      severity: 'serious',
    });
  });

  it('accepts a disclosure whose expanded state matches programmatic visibility', () => {
    render(`
      <button id="filters" aria-expanded="false" aria-controls="filters-panel">Filters</button>
      <div id="filters-panel" hidden>Filter options</div>
    `);

    const [probe] = captureAriaWidgetProbes(element('#filters'), { kind: 'click' });
    expect(evaluateAriaWidgetProbe(probe!)).toBeUndefined();
  });

  it('reviews an activated tab that did not become selected', () => {
    render(`
      <div role="tablist">
        <button id="tab-a" role="tab" aria-selected="false" aria-controls="panel-a">A</button>
      </div>
      <div id="panel-a" role="tabpanel" hidden>Panel A</div>
    `);

    const probes = captureAriaWidgetProbes(element('#tab-a'), { kind: 'keydown', key: 'Enter' });
    const tabProbe = probes.find((probe) => probe.kind === 'tab-activation');
    expect(evaluateAriaWidgetProbe(tabProbe!)).toMatchObject({
      kind: 'aria-widget',
      ruleId: 'FT-APG-004',
      outcome: 'review',
    });
  });

  it('warns when a selected tab still controls a hidden tabpanel', () => {
    render(`
      <div role="tablist">
        <button id="tab-a" role="tab" aria-selected="true" aria-controls="panel-a">A</button>
      </div>
      <div id="panel-a" role="tabpanel" hidden>Panel A</div>
    `);

    const probes = captureAriaWidgetProbes(element('#tab-a'), { kind: 'click' });
    const tabProbe = probes.find((probe) => probe.kind === 'tab-activation');
    expect(evaluateAriaWidgetProbe(tabProbe!)).toMatchObject({
      ruleId: 'FT-RUNTIME-ARIA-002',
      outcome: 'warning',
      severity: 'serious',
    });
  });

  it('reviews a keyboard-opened menu when focus remains outside', () => {
    render(`
      <button id="menu-button" aria-haspopup="menu" aria-expanded="true" aria-controls="menu">Menu</button>
      <div id="menu" role="menu">
        <button id="first-item" role="menuitem" tabindex="-1">First</button>
      </div>
    `);

    (element('#menu-button') as HTMLElement).focus();
    const probes = captureAriaWidgetProbes(element('#menu-button'), { kind: 'keydown', key: 'ArrowDown' });
    const menuProbe = probes.find((probe) => probe.kind === 'menu-open-focus');
    expect(evaluateAriaWidgetProbe(menuProbe!)).toMatchObject({
      ruleId: 'FT-APG-005',
      outcome: 'review',
    });

    (element('#first-item') as HTMLElement).focus();
    expect(evaluateAriaWidgetProbe(menuProbe!)).toBeUndefined();
  });

  it('reviews Escape when a menu remains open', () => {
    render(`
      <button id="menu-button" aria-haspopup="menu" aria-expanded="true" aria-controls="menu">Menu</button>
      <div id="menu" role="menu">
        <button id="first-item" role="menuitem" tabindex="0">First</button>
      </div>
    `);

    const probes = captureAriaWidgetProbes(element('#first-item'), { kind: 'keydown', key: 'Escape' });
    const escapeProbe = probes.find((probe) => probe.kind === 'menu-escape');
    expect(evaluateAriaWidgetProbe(escapeProbe!)).toMatchObject({
      ruleId: 'FT-APG-006',
      outcome: 'review',
    });
  });

  it('accepts Escape after the menu closes and focus returns to its trigger', () => {
    render(`
      <button id="menu-button" aria-haspopup="menu" aria-expanded="true" aria-controls="menu">Menu</button>
      <div id="menu" role="menu">
        <button id="first-item" role="menuitem" tabindex="0">First</button>
      </div>
    `);

    const probes = captureAriaWidgetProbes(element('#first-item'), { kind: 'keydown', key: 'Escape' });
    const escapeProbe = probes.find((probe) => probe.kind === 'menu-escape');
    element('#menu').setAttribute('hidden', '');
    (element('#menu-button') as HTMLElement).focus();
    expect(evaluateAriaWidgetProbe(escapeProbe!)).toBeUndefined();
  });

  it('reviews dynamically opened dialogs without an accessible name', () => {
    render('<div id="dialog" role="dialog"><button>Close</button></div>');
    expect(createDynamicDialogNameReview(element('#dialog'))).toMatchObject({
      kind: 'aria-widget',
      ruleId: 'FT-APG-007',
      outcome: 'review',
      severity: 'serious',
    });
  });

  it('accepts dynamically opened dialogs with an accessible name', () => {
    render('<div id="dialog" role="dialog" aria-label="Settings"><button>Close</button></div>');
    expect(createDynamicDialogNameReview(element('#dialog'))).toBeUndefined();
  });
});
