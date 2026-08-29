// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { evaluateAdvancedAria, resolvedExplicitAriaRole } from '../lib/audit/aria-validator';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>ARIA test</title></head><body><main><h1>ARIA test</h1>${body}</main></body></html>`);
  document.close();
}

function signals(kind?: ReturnType<typeof evaluateAdvancedAria>[number]['kind']) {
  const result = evaluateAdvancedAria(document);
  return kind ? result.filter((signal) => signal.kind === kind) : result;
}

describe('advanced ARIA validation', () => {
  it('uses role fallback tokens without rejecting a future token before a valid role', () => {
    render('<div id="future" role="future-widget button">Save</div><div id="unknown" role="future-widget">Unknown</div>');

    expect(resolvedExplicitAriaRole(document.querySelector('#future')!)?.name).toBe('button');
    const invalid = signals('invalid-role');
    expect(invalid.map((signal) => signal.element.id)).not.toContain('future');
    expect(invalid.map((signal) => signal.element.id)).toContain('unknown');
  });

  it('rejects abstract author roles even when a later fallback role resolves', () => {
    render('<div id="abstract" role="widget button">Save</div>');
    const invalid = signals('invalid-role');
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.element.id).toBe('abstract');
    expect(invalid[0]?.detail).toContain('abstract');
  });

  it('detects unknown aria-* attributes without guessing typo corrections', () => {
    render('<button id="save" aria-labl="Save">Save</button>');
    const unknown = signals('unknown-attribute');
    expect(unknown).toHaveLength(1);
    expect(unknown[0]?.detail).toContain('aria-labl');
  });

  it('validates deterministic boolean, enum, integer and numeric ARIA values', () => {
    render(`<div id="bad"
      role="slider"
      aria-valuenow="abc"
      aria-valuemin="0"
      aria-valuemax="10"
      aria-expanded="maybe"
      aria-orientation="diagonal"
      aria-level="0"></div>`);
    const invalid = signals('invalid-value').filter((signal) => signal.element.id === 'bad');
    expect(invalid.map((signal) => signal.detail)).toEqual(expect.arrayContaining([
      expect.stringContaining('aria-valuenow'),
      expect.stringContaining('aria-expanded'),
      expect.stringContaining('aria-orientation'),
      expect.stringContaining('aria-level'),
    ]));
  });

  it('keeps custom aria-current tokens valid because ARIA maps unknown tokens to true', () => {
    render('<a id="current" href="/" aria-current="chapter-marker">Current</a>');
    expect(signals('invalid-value').some((signal) => signal.element.id === 'current')).toBe(false);
  });

  it('requires role-specific required properties but accepts an equivalent native host state', () => {
    render('<div id="custom" role="checkbox">Custom</div><div id="valid" role="checkbox" aria-checked="false">Valid</div><input id="native" type="checkbox" role="checkbox">');
    const missing = signals('missing-required-property');
    expect(missing.map((signal) => signal.element.id)).toContain('custom');
    expect(missing.map((signal) => signal.element.id)).not.toContain('valid');
    expect(missing.map((signal) => signal.element.id)).not.toContain('native');
  });

  it('detects empty and missing ID references', () => {
    render('<button id="empty" aria-controls="">Open</button><button id="missing" aria-describedby="not-there">Info</button>');
    const broken = signals('broken-reference');
    expect(broken.map((signal) => signal.element.id)).toEqual(expect.arrayContaining(['empty', 'missing']));
  });

  it('detects aria-owns cycles and multiply-owned accessibility children', () => {
    render(`<div id="self" aria-owns="self"></div>
      <div id="one" aria-owns="target"></div>
      <div id="two" aria-owns="target"></div>
      <div id="target"></div>`);
    const broken = signals('broken-reference');
    expect(broken.some((signal) => signal.element.id === 'self' && signal.detail.includes('cycle'))).toBe(true);
    expect(broken.filter((signal) => ['one', 'two'].includes(signal.element.id))).toHaveLength(2);
  });

  it('accepts aria-activedescendant within an accessibility descendant', () => {
    render('<div id="list" role="listbox" aria-activedescendant="option"><div id="option" role="option" aria-selected="false">One</div></div>');
    expect(signals('broken-reference').some((signal) => signal.element.id === 'list')).toBe(false);
  });

  it('accepts combobox active descendant inside its controlled popup and rejects unrelated targets', () => {
    render(`<input id="combo" role="combobox" aria-expanded="true" aria-controls="popup" aria-activedescendant="option">
      <div id="popup" role="listbox"><div id="option" role="option" aria-selected="false">One</div></div>
      <input id="bad" role="combobox" aria-expanded="true" aria-controls="popup" aria-activedescendant="outside">
      <div id="outside" role="option" aria-selected="false">Outside</div>`);
    const broken = signals('broken-reference');
    expect(broken.some((signal) => signal.element.id === 'combo')).toBe(false);
    expect(broken.some((signal) => signal.element.id === 'bad' && signal.detail.includes('aria-controls'))).toBe(true);
  });

  it('validates required accessibility parents while accepting generic wrappers and grouped patterns', () => {
    render(`<div id="orphan" role="tab">Orphan</div>
      <div role="tablist"><div><span><button id="tab" role="tab">Tab</button></span></div></div>
      <div role="listbox"><div role="group"><div><div id="option" role="option" aria-selected="false">Option</div></div></div></div>
      <div role="tree"><div id="parent-item" role="treeitem"><div role="group"><div id="child-item" role="treeitem">Child</div></div></div></div>`);
    const parents = signals('required-parent');
    expect(parents.map((signal) => signal.element.id)).toContain('orphan');
    expect(parents.map((signal) => signal.element.id)).not.toContain('tab');
    expect(parents.map((signal) => signal.element.id)).not.toContain('option');
    expect(parents.map((signal) => signal.element.id)).not.toContain('child-item');
  });

  it('uses valid aria-owns relationships as accessibility parentage', () => {
    render('<div id="tabs" role="tablist" aria-owns="remote"></div><div id="remote" role="tab">Remote</div>');
    expect(signals('required-parent').some((signal) => signal.element.id === 'remote')).toBe(false);
  });

  it('accepts generic wrappers around allowed children and reports incompatible semantic children', () => {
    render(`<div id="valid-list" role="listbox"><div><span><div id="good" role="option" aria-selected="false">Good</div></span></div></div>
      <div id="bad-list" role="listbox"><div><div id="bad-row" role="row"></div></div></div>`);
    const children = signals('allowed-child');
    expect(children.some((signal) => signal.element.id === 'good')).toBe(false);
    expect(children.some((signal) => signal.element.id === 'bad-row')).toBe(true);
  });

  it('reports contradictory range and set metadata independently of value syntax', () => {
    render(`<div id="range" role="slider" aria-valuemin="10" aria-valuemax="5" aria-valuenow="12"></div>
      <div id="set" role="option" aria-selected="false" aria-posinset="4" aria-setsize="3">Option</div>
      <div id="gridcell" role="gridcell" aria-colindex="5" aria-colcount="4"></div>`);
    const inconsistent = signals('state-consistency');
    expect(inconsistent.some((signal) => signal.element.id === 'range' && signal.detail.includes('greater'))).toBe(true);
    expect(inconsistent.some((signal) => signal.element.id === 'range' && signal.detail.includes('above'))).toBe(true);
    expect(inconsistent.some((signal) => signal.element.id === 'set' && signal.detail.includes('aria-posinset'))).toBe(true);
    expect(inconsistent.some((signal) => signal.element.id === 'gridcell' && signal.detail.includes('aria-colindex'))).toBe(true);
  });

  it('integrates deterministic ARIA authoring errors as warnings, not WCAG failures', () => {
    render('<div id="check" role="checkbox">Receive updates</div>');
    const result = runFocusTraceScan();
    expect(result.warnings.map((issue) => issue.ruleId)).toContain('FT-WARN-015');
    expect(result.issues.map((issue) => issue.ruleId)).not.toContain('FT-WARN-015');
  });
});
