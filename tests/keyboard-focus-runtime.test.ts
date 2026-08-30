// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  captureKeyboardFocusProbes,
  evaluateKeyboardFocusProbe,
  type KeyboardFocusProbe,
} from '../lib/runtime/keyboard-focus-runtime';

function render(body: string): void {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Keyboard focus</title></head><body>${body}</body></html>`);
  document.close();
}

function element<T extends Element = Element>(selector: string): T {
  const result = document.querySelector(selector);
  if (!result) throw new Error(`Missing fixture element ${selector}`);
  return result as T;
}

function probeFor(selector: string, key: string, kind: KeyboardFocusProbe['kind']): KeyboardFocusProbe {
  const probe = captureKeyboardFocusProbes(element(selector), { kind: 'keydown', key })
    .find((candidate) => candidate.kind === kind);
  if (!probe) throw new Error(`Missing ${kind} probe for ${selector} + ${key}`);
  return probe;
}

describe('keyboard and focus runtime coverage', () => {
  it('reviews broken tab arrow navigation and accepts the expected wrapped destination', () => {
    render(`
      <div role="tablist" aria-label="Sections">
        <button id="tab-a" role="tab" tabindex="-1" aria-selected="false">A</button>
        <button id="tab-b" role="tab" tabindex="0" aria-selected="true">B</button>
      </div>
    `);
    element<HTMLElement>('#tab-b').focus();
    const navigation = probeFor('#tab-b', 'ArrowRight', 'tab-navigation');
    expect(evaluateKeyboardFocusProbe(navigation)).toMatchObject({
      ruleId: 'FT-APG-015',
      outcome: 'review',
    });

    element('#tab-b').setAttribute('tabindex', '-1');
    element('#tab-a').setAttribute('tabindex', '0');
    element<HTMLElement>('#tab-a').focus();
    expect(evaluateKeyboardFocusProbe(navigation)).toBeUndefined();
  });

  it('reviews radio arrow focus and selection together, while accepting a correct transition', () => {
    render(`
      <div id="group" role="radiogroup" aria-label="Plan">
        <div id="radio-a" role="radio" tabindex="0" aria-checked="true">A</div>
        <div id="radio-b" role="radio" tabindex="-1" aria-checked="false">B</div>
      </div>
    `);
    element<HTMLElement>('#radio-a').focus();
    const navigation = probeFor('#radio-a', 'ArrowRight', 'radio-navigation');
    expect(evaluateKeyboardFocusProbe(navigation)).toMatchObject({ ruleId: 'FT-APG-016' });

    element('#radio-a').setAttribute('aria-checked', 'false');
    element('#radio-a').setAttribute('tabindex', '-1');
    element('#radio-b').setAttribute('aria-checked', 'true');
    element('#radio-b').setAttribute('tabindex', '0');
    element<HTMLElement>('#radio-b').focus();
    expect(evaluateKeyboardFocusProbe(navigation)).toBeUndefined();
  });

  it('does not impose radio-group selection changes when the radio is inside a toolbar', () => {
    render(`
      <div role="toolbar" aria-label="Formatting">
        <div role="radiogroup" aria-label="Alignment">
          <button id="left" role="radio" tabindex="0" aria-checked="true">Left</button>
          <button id="right" role="radio" tabindex="-1" aria-checked="false">Right</button>
        </div>
      </div>
    `);
    expect(
      captureKeyboardFocusProbes(element('#left'), { kind: 'keydown', key: 'ArrowRight' })
        .some((probe) => probe.kind === 'radio-navigation'),
    ).toBe(false);
  });

  it('reviews toolbar arrow navigation but lets an embedded text editor own its key', () => {
    render(`
      <div id="toolbar" role="toolbar" aria-label="Editor">
        <button id="bold" tabindex="0">Bold</button>
        <button id="italic" tabindex="-1">Italic</button>
        <input id="search" tabindex="-1" aria-label="Search" />
      </div>
    `);
    element<HTMLButtonElement>('#bold').focus();
    const navigation = probeFor('#bold', 'ArrowRight', 'toolbar-navigation');
    expect(evaluateKeyboardFocusProbe(navigation)).toMatchObject({ ruleId: 'FT-APG-017' });
    element<HTMLButtonElement>('#italic').focus();
    expect(evaluateKeyboardFocusProbe(navigation)).toBeUndefined();

    expect(
      captureKeyboardFocusProbes(element('#search'), { kind: 'keydown', key: 'ArrowRight' })
        .some((probe) => probe.kind === 'toolbar-navigation'),
    ).toBe(false);
  });

  it('reviews menu arrow navigation and accepts movement to the expected item', () => {
    render(`
      <div id="menu" role="menu" aria-label="Actions">
        <button id="edit" role="menuitem" tabindex="0">Edit</button>
        <button id="delete" role="menuitem" tabindex="-1">Delete</button>
      </div>
    `);
    element<HTMLButtonElement>('#edit').focus();
    const navigation = probeFor('#edit', 'ArrowDown', 'menu-navigation');
    expect(evaluateKeyboardFocusProbe(navigation)).toMatchObject({ ruleId: 'FT-APG-018' });
    element<HTMLButtonElement>('#delete').focus();
    expect(evaluateKeyboardFocusProbe(navigation)).toBeUndefined();
  });

  it('reviews listbox arrow navigation and accepts aria-activedescendant movement', () => {
    render(`
      <div id="listbox" role="listbox" tabindex="0" aria-label="Priority" aria-activedescendant="high">
        <div id="high" role="option" aria-selected="true">High</div>
        <div id="low" role="option" aria-selected="false">Low</div>
      </div>
    `);
    element<HTMLElement>('#listbox').focus();
    const navigation = probeFor('#listbox', 'ArrowDown', 'listbox-navigation');
    expect(evaluateKeyboardFocusProbe(navigation)).toMatchObject({ ruleId: 'FT-APG-019' });
    element('#listbox').setAttribute('aria-activedescendant', 'low');
    expect(evaluateKeyboardFocusProbe(navigation)).toBeUndefined();
  });

  it('checks the first menu item after required keyboard opening', () => {
    render(`
      <button id="trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="menu">Actions</button>
      <div id="menu" role="menu" hidden>
        <button id="first" role="menuitem" tabindex="-1">First</button>
        <button id="second" role="menuitem" tabindex="-1">Second</button>
      </div>
    `);
    const opening = probeFor('#trigger', 'Enter', 'menu-button-open');
    element('#trigger').setAttribute('aria-expanded', 'true');
    element('#menu').removeAttribute('hidden');
    element<HTMLButtonElement>('#second').focus();
    expect(evaluateKeyboardFocusProbe(opening)).toMatchObject({ ruleId: 'FT-APG-005' });
    element<HTMLButtonElement>('#first').focus();
    expect(evaluateKeyboardFocusProbe(opening)).toBeUndefined();
  });

  it('reviews required Enter/Space menu opening but does not require optional ArrowDown opening', () => {
    render(`
      <button id="trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="menu">Actions</button>
      <div id="menu" role="menu" hidden><button role="menuitem">First</button></div>
    `);
    expect(evaluateKeyboardFocusProbe(probeFor('#trigger', ' ', 'menu-button-open'))).toMatchObject({
      ruleId: 'FT-APG-005',
    });
    expect(evaluateKeyboardFocusProbe(probeFor('#trigger', 'ArrowDown', 'menu-button-open'))).toBeUndefined();
  });

  it('reviews a disclosure that ignores keyboard activation and accepts a toggled state', () => {
    render(`
      <button id="details" aria-expanded="false" aria-controls="panel">Details</button>
      <div id="panel" hidden>More details</div>
    `);
    const toggle = probeFor('#details', 'Enter', 'disclosure-toggle');
    expect(evaluateKeyboardFocusProbe(toggle)).toMatchObject({ ruleId: 'FT-APG-021' });
    element('#details').setAttribute('aria-expanded', 'true');
    element('#panel').removeAttribute('hidden');
    expect(evaluateKeyboardFocusProbe(toggle)).toBeUndefined();
  });

  it('reviews Tree Home/End navigation and accepts the required boundary destination', () => {
    render(`
      <div id="tree" role="tree">
        <div id="tree-a" role="treeitem" tabindex="-1">A</div>
        <div id="tree-b" role="treeitem" tabindex="0">B</div>
        <div id="tree-c" role="treeitem" tabindex="-1">C</div>
      </div>
    `);
    element<HTMLElement>('#tree-b').focus();
    const home = probeFor('#tree-b', 'Home', 'boundary-navigation');
    expect(evaluateKeyboardFocusProbe(home)).toMatchObject({ ruleId: 'FT-APG-012' });
    element<HTMLElement>('#tree-a').focus();
    expect(evaluateKeyboardFocusProbe(home)).toBeUndefined();

    element<HTMLElement>('#tree-b').focus();
    const end = probeFor('#tree-b', 'End', 'boundary-navigation');
    element<HTMLElement>('#tree-c').focus();
    expect(evaluateKeyboardFocusProbe(end)).toBeUndefined();
  });

  it('reviews Grid Home/End navigation within the active row', () => {
    render(`
      <div id="grid" role="grid">
        <div role="row">
          <div id="a1" role="gridcell" tabindex="-1">A1</div>
          <div id="a2" role="gridcell" tabindex="0">A2</div>
          <div id="a3" role="gridcell" tabindex="-1">A3</div>
        </div>
      </div>
    `);
    element<HTMLElement>('#a2').focus();
    const home = probeFor('#a2', 'Home', 'boundary-navigation');
    expect(evaluateKeyboardFocusProbe(home)).toMatchObject({ ruleId: 'FT-APG-013' });
    element<HTMLElement>('#a1').focus();
    expect(evaluateKeyboardFocusProbe(home)).toBeUndefined();
  });

  it('supports row-focused Treegrid Home/End navigation', () => {
    render(`
      <div id="treegrid" role="treegrid">
        <div id="row-a" role="row" tabindex="-1"><div role="gridcell">A</div></div>
        <div id="row-b" role="row" tabindex="0"><div role="gridcell">B</div></div>
        <div id="row-c" role="row" tabindex="-1"><div role="gridcell">C</div></div>
      </div>
    `);
    element<HTMLElement>('#row-b').focus();
    const end = probeFor('#row-b', 'End', 'boundary-navigation');
    expect(evaluateKeyboardFocusProbe(end)).toMatchObject({ ruleId: 'FT-APG-013' });
    element<HTMLElement>('#row-c').focus();
    expect(evaluateKeyboardFocusProbe(end)).toBeUndefined();
  });

  it('does not steal Home/End from an editor embedded in a grid cell', () => {
    render(`
      <div role="grid">
        <div role="row">
          <div role="gridcell"><input id="editor" value="Madrid" /></div>
          <div role="gridcell" tabindex="-1">Next</div>
        </div>
      </div>
    `);
    expect(
      captureKeyboardFocusProbes(element('#editor'), { kind: 'keydown', key: 'Home' })
        .some((probe) => probe.kind === 'boundary-navigation'),
    ).toBe(false);
  });

  it('reviews modal Escape only while the dialog remains open', () => {
    render(`
      <div id="dialog" role="dialog" aria-modal="true" aria-label="Settings">
        <button id="close">Close</button>
      </div>
    `);
    element<HTMLButtonElement>('#close').focus();
    const escape = probeFor('#close', 'Escape', 'dialog-escape');
    expect(evaluateKeyboardFocusProbe(escape)).toMatchObject({ ruleId: 'FT-APG-020' });
    element('#dialog').setAttribute('hidden', '');
    expect(evaluateKeyboardFocusProbe(escape)).toBeUndefined();
  });

  it('reviews multiple page tab stops in managed composites and accepts one', () => {
    render(`
      <div id="tabs" role="tablist">
        <button id="one" role="tab" tabindex="0">One</button>
        <button id="two" role="tab" tabindex="0">Two</button>
      </div>
    `);
    const roving = probeFor('#one', 'ArrowRight', 'managed-roving-tabindex');
    expect(evaluateKeyboardFocusProbe(roving)).toMatchObject({ ruleId: 'FT-APG-011' });
    element('#two').setAttribute('tabindex', '-1');
    expect(evaluateKeyboardFocusProbe(roving)).toBeUndefined();
  });
});
