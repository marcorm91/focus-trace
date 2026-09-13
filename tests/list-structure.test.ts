// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { evaluateAdvancedAria } from '../lib/audit/aria-validator';
import { evaluateStructuralHtml } from '../lib/audit/content-model';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>List test</title></head><body><main><h1>List test</h1>${body}</main></body></html>`);
  document.close();
}

function structural(kind: 'parent-context' | 'content-model') {
  return evaluateStructuralHtml(document).filter((signal) => signal.kind === kind);
}

function aria(kind: 'required-parent' | 'allowed-child') {
  return evaluateAdvancedAria(document).filter((signal) => signal.kind === kind);
}

describe('native and ARIA list structure', () => {
  it('accepts valid native lists, nested lists and both description-list grouping forms', () => {
    render(`<ul id="unordered">\n<li>One<ol><li>Nested</li></ol></li>\n</ul>
      <menu id="menu">\n<li>Command</li>\n</menu>
      <dl id="direct">\n<dt>Term</dt><dd>Definition</dd>\n</dl>
      <dl id="wrapped">\n<div><dt>Term</dt><dd>Definition</dd></div>\n</dl>`);
    expect(structural('parent-context')).toHaveLength(0);
    expect(structural('content-model')).toHaveLength(0);
  });

  it('rejects non-whitespace direct text while allowing formatting whitespace', () => {
    render(`<ul id="bad-list">Stray text<li>Item</li></ul>
      <ol id="good-list">\n  <li>Item</li>\n</ol>
      <dl id="bad-dl">Stray text<dt>Term</dt><dd>Definition</dd></dl>
      <dl id="bad-group"><div id="group">Stray text<dt>Term</dt><dd>Definition</dd></div></dl>`);
    const targets = structural('content-model').map((signal) => signal.element.id);
    expect(targets).toEqual(expect.arrayContaining(['bad-list', 'bad-dl', 'group']));
    expect(targets).not.toContain('good-list');
  });

  it('keeps malformed hidden native list markup as an authoring warning', () => {
    render('<ul id="hidden-list" hidden>Stray text<li>Item</li></ul>');
    const result = runFocusTraceScan();
    expect(result.warnings.filter((issue) => issue.ruleId === 'FT-WARN-009' && issue.targets.includes('#hidden-list'))).toHaveLength(1);
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WARN-009')).toBe(false);
  });

  it('deduplicates description-list text and sequence errors on the same target', () => {
    render('<dl id="bad">Stray text<dd>Definition without term</dd></dl><dl><div id="bad-wrapper">Stray text<dd>Definition without term</dd></div></dl>');
    const findings = structural('content-model');
    expect(findings.filter((signal) => signal.element.id === 'bad')).toHaveLength(1);
    expect(findings.filter((signal) => signal.element.id === 'bad-wrapper')).toHaveLength(1);
  });

  it('reports a native orphan li once without manufacturing an ARIA required-parent finding', () => {
    render('<li id="native-orphan">Item</li>');
    const result = runFocusTraceScan();
    expect(result.warnings.filter((issue) => issue.ruleId === 'FT-WARN-008' && issue.targets.includes('#native-orphan'))).toHaveLength(1);
    expect(result.warnings.some((issue) => issue.ruleId === 'FT-WARN-017' && issue.targets.includes('#native-orphan'))).toBe(false);
  });

  it('accepts direct and aria-owned ARIA listitems', () => {
    render(`<div role="list"><div id="direct-item" role="listitem">Direct</div></div>
      <div id="owned-list" role="list" aria-owns="remote-item"></div>
      <div id="remote-item" role="listitem">Remote</div>`);
    const requiredParents = aria('required-parent').map((signal) => signal.element.id);
    expect(requiredParents).not.toContain('direct-item');
    expect(requiredParents).not.toContain('remote-item');
  });

  it('reports orphan ARIA listitems and incompatible accessibility children', () => {
    render(`<div id="orphan-item" role="listitem">Orphan</div>
      <div id="bad-list" role="list"><div id="bad-child" role="row">Row</div></div>`);
    expect(aria('required-parent').some((signal) => signal.element.id === 'orphan-item')).toBe(true);
    expect(aria('allowed-child').some((signal) => signal.element.id === 'bad-child')).toBe(true);
  });

  it('keeps hidden explicit ARIA list authoring errors observable', () => {
    render('<div id="hidden-item" role="listitem" hidden>Hidden</div>');
    expect(aria('required-parent').some((signal) => signal.element.id === 'hidden-item')).toBe(true);
    const result = runFocusTraceScan();
    expect(result.warnings.some((issue) => issue.ruleId === 'FT-WARN-017' && issue.targets.includes('#hidden-item'))).toBe(true);
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WARN-017')).toBe(false);
  });

  it('catches implicit listitem semantics when a native list is repurposed as an ARIA menu', () => {
    render('<ul id="commands" role="menu"><li id="implicit-item">Open</li></ul>');
    expect(aria('allowed-child').some((signal) => signal.element.id === 'implicit-item')).toBe(true);
    const result = runFocusTraceScan();
    expect(result.warnings.some((issue) => issue.ruleId === 'FT-WARN-018' && issue.targets.includes('#implicit-item'))).toBe(true);
  });
});
