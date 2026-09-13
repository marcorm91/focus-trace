from pathlib import Path

path = Path('lib/audit/content-model.ts')
text = path.read_text()
marker = """function directElements(element: Element, ignoreScriptSupporting = true): Element[] {
  const children = [...element.children];
  return ignoreScriptSupporting ? children.filter((child) => !SCRIPT_SUPPORTING.has(child.tagName)) : children;
}
"""
addition = marker + """
function hasNonWhitespaceDirectText(element: Element): boolean {
  return [...element.childNodes].some((node) => node.nodeType === 3 && Boolean(node.textContent?.trim()));
}
"""
if marker not in text:
    raise SystemExit('directElements marker not found')
text = text.replace(marker, addition, 1)

old = """function evaluateLists(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const list of scopedElements(root, 'ul, ol, menu')) {
    const invalid = directElements(list).filter((child) => child.tagName !== 'LI');
    for (const child of invalid) add(signals, 'content-model', child, `<${tag(list)}> may contain list items as its structural children; unexpected direct child <${tag(child)}> breaks the native list content model.`);
  }

  for (const dl of scopedElements(root, 'dl')) {
    const children = directElements(dl);
    if (!children.length) continue;
    const grouped = children.some((child) => child.tagName === 'DIV');

    if (grouped) {
      if (children.some((child) => child.tagName !== 'DIV')) {
        add(signals, 'content-model', dl, '<dl> must use either direct dt/dd groups or div-wrapped dt/dd groups; both forms cannot be mixed at the same level.');
      }
      for (const group of children.filter((child) => child.tagName === 'DIV')) {
        if (!isValidDescriptionSequence(directElements(group))) add(signals, 'content-model', group, 'A grouping <div> inside <dl> must contain one or more <dt> elements followed by one or more <dd> elements.');
      }
      continue;
    }

    if (!isValidDescriptionSequence(children)) add(signals, 'content-model', dl, '<dl> direct children must form groups of one or more <dt> elements followed by one or more <dd> elements.');
  }
}
"""
new = """function evaluateLists(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const list of scopedElements(root, 'ul, ol, menu')) {
    if (hasNonWhitespaceDirectText(list)) {
      add(signals, 'content-model', list, `<${tag(list)}> may contain only list items and script-supporting elements as direct content; non-whitespace direct text is not permitted.`);
    }
    const invalid = directElements(list).filter((child) => child.tagName !== 'LI');
    for (const child of invalid) add(signals, 'content-model', child, `<${tag(list)}> may contain list items as its structural children; unexpected direct child <${tag(child)}> breaks the native list content model.`);
  }

  for (const dl of scopedElements(root, 'dl')) {
    const children = directElements(dl);
    const hasDirectText = hasNonWhitespaceDirectText(dl);
    if (!children.length) {
      if (hasDirectText) add(signals, 'content-model', dl, '<dl> may contain only description groups and script-supporting elements as direct content; non-whitespace direct text is not permitted.');
      continue;
    }
    const grouped = children.some((child) => child.tagName === 'DIV');

    if (grouped) {
      const mixed = children.some((child) => child.tagName !== 'DIV');
      if (hasDirectText || mixed) {
        add(signals, 'content-model', dl, '<dl> using div-wrapped description groups may contain only grouping <div> and script-supporting elements at the top level; direct text or direct dt/dd content cannot be mixed into that branch.');
      }
      for (const group of children.filter((child) => child.tagName === 'DIV')) {
        if (hasNonWhitespaceDirectText(group) || !isValidDescriptionSequence(directElements(group))) {
          add(signals, 'content-model', group, 'A grouping <div> inside <dl> must contain only one or more <dt> elements followed by one or more <dd> elements, apart from script-supporting elements and whitespace.');
        }
      }
      continue;
    }

    if (hasDirectText || !isValidDescriptionSequence(children)) {
      add(signals, 'content-model', dl, '<dl> direct content must form groups of one or more <dt> elements followed by one or more <dd> elements, apart from script-supporting elements and whitespace.');
    }
  }
}
"""
if old not in text:
    raise SystemExit('evaluateLists block not found')
path.write_text(text.replace(old, new, 1))

Path('tests/list-structure.test.ts').write_text(r'''// @vitest-environment jsdom

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
''')
