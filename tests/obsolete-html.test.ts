// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { evaluateObsoleteHtml } from '../lib/audit/obsolete-html';
import { runFocusTraceScan } from '../lib/audit/scan';
import {
  HTML_OBSOLETE_SNAPSHOT_DATE,
  OBSOLETE_ATTRIBUTES,
  OBSOLETE_ELEMENTS,
} from '../shared/obsolete-html-registry';

const EXPECTED_OBSOLETE_ELEMENTS = [
  'applet',
  'acronym',
  'bgsound',
  'dir',
  'frame',
  'frameset',
  'noframes',
  'isindex',
  'keygen',
  'listing',
  'menuitem',
  'nextid',
  'noembed',
  'param',
  'plaintext',
  'rb',
  'rtc',
  'strike',
  'xmp',
  'basefont',
  'big',
  'blink',
  'center',
  'font',
  'marquee',
  'multicol',
  'nobr',
  'spacer',
  'tt',
] as const;

function render(body: string, head = '<title>Test</title>') {
  document.open();
  document.write(`<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`);
  document.close();
}

describe('obsolete HTML authoring coverage', () => {
  it('pins the WHATWG obsolete-markup snapshot used by the scanner', () => {
    expect(HTML_OBSOLETE_SNAPSHOT_DATE).toBe('2026-08-28');
    expect(OBSOLETE_ELEMENTS.map((definition) => definition.tag)).toEqual(EXPECTED_OBSOLETE_ELEMENTS);
  });

  it('detects every entirely obsolete element in the committed registry', () => {
    for (const definition of OBSOLETE_ELEMENTS) {
      const element = document.createElement(definition.tag);
      const signal = evaluateObsoleteHtml(element).find((candidate) =>
        candidate.kind === 'obsolete-element' && candidate.feature === `<${definition.tag}>`,
      );
      expect(signal, `expected <${definition.tag}> to be detected`).toBeDefined();
      expect(signal?.replacement).toBe(definition.replacement);
    }
  });

  it('detects every non-conforming attribute/element pair in the committed registry', () => {
    for (const definition of OBSOLETE_ATTRIBUTES) {
      const tags = definition.elements === '*' ? ['div'] : definition.elements;
      for (const tag of tags) {
        const element = document.createElement(tag);
        element.setAttribute(definition.attribute, 'legacy');
        const signal = evaluateObsoleteHtml(element).find((candidate) =>
          candidate.kind === 'obsolete-attribute'
          && candidate.feature === `${definition.attribute} on <${tag}>`,
        );
        expect(signal, `expected ${definition.attribute} on <${tag}> to be detected`).toBeDefined();
      }
    }
  });

  it('distinguishes obsolete-but-conforming legacy markup from non-conforming variants', () => {
    render(`
      <main>
        <h1>Legacy</h1>
        <img id="legacy-border" alt="" border="0">
        <script id="legacy-script" type="text/javascript"></script>
        <style id="legacy-style" type="text/css"></style>
        <a id="legacy-anchor" name="legacy-anchor">Target</a>
        <input id="legacy-number" type="number" maxlength="4" size="4" aria-label="Amount">
        <img id="bad-border" alt="" border="2">
      </main>
    `);

    const signals = evaluateObsoleteHtml(document);
    const legacy = signals.filter((signal) => signal.kind === 'obsolete-but-conforming');
    const invalid = signals.filter((signal) => signal.kind === 'obsolete-attribute');

    expect(legacy.map((signal) => signal.feature)).toEqual(expect.arrayContaining([
      'border on <img>',
      'JavaScript type on <script>',
      'type on <style>',
      'name on <a>',
      'maxlength on <input type="number">',
      'size on <input type="number">',
    ]));
    expect(invalid.some((signal) => signal.element.id === 'bad-border' && signal.feature === 'border on <img>')).toBe(true);
  });

  it('keeps non-JavaScript script data-block types out of obsolete warnings', () => {
    render('<main><h1>Data</h1><script id="data" type="application/ld+json">{"name":"Example"}</script></main>');
    const signals = evaluateObsoleteHtml(document).filter((signal) => signal.element.id === 'data');
    expect(signals).toEqual([]);
  });

  it('surfaces obsolete markup as HTML authoring warnings inside Semantics', () => {
    render('<main><h1>Legacy</h1><center id="centered"><font id="font" color="red">Legacy copy</font></center><table id="layout" cellpadding="4"><tr><td>Cell</td></tr></table></main>');
    const result = runFocusTraceScan();

    expect(result.warnings.some((issue) => issue.ruleId === 'FT-WARN-005' && issue.targets.includes('#centered'))).toBe(true);
    expect(result.warnings.some((issue) => issue.ruleId === 'FT-WARN-005' && issue.targets.includes('#font'))).toBe(true);
    expect(result.warnings.some((issue) => issue.ruleId === 'FT-WARN-006' && issue.targets.includes('#layout'))).toBe(true);
    expect(result.issues.some((issue) => ['FT-WARN-005', 'FT-WARN-006', 'FT-WARN-007'].includes(issue.ruleId))).toBe(false);
  });
});
