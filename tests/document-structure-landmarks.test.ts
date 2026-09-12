// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateDocumentStructure } from '../lib/audit/document-structure';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string, styles = '') {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Structure test</title>${styles ? `<style>${styles}</style>` : ''}</head><body>${body}</body></html>`);
  document.close();
}

function ids() {
  return evaluateDocumentStructure().map((signal) => signal.rule.id);
}

describe('document structure and landmark coverage', () => {
  beforeEach(() => render('<main><h1>Page</h1></main>'));

  it('reviews a page with no level-one heading but accepts native and ARIA level-one headings', () => {
    render('<main><h2>Section</h2></main>');
    expect(ids()).toContain('FT-REVIEW-030');

    render('<main><div role="heading" aria-level="1">ARIA page title</div></main>');
    expect(ids()).not.toContain('FT-REVIEW-030');
  });

  it('reviews exposed empty headings without flagging hidden or alternatively named headings', () => {
    render('<main><h1>Page</h1><h2 id="empty"></h2><h2 aria-hidden="true"></h2><h2 aria-label="Named"></h2><h2><img alt="Image heading"></h2></main>');
    const matches = evaluateDocumentStructure().filter((signal) => signal.rule.id === 'FT-REVIEW-031');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.element.id).toBe('empty');
  });

  it('keeps paragraph-as-heading detection heuristic and review-only', () => {
    render(
      '<main><h1>Page</h1><p id="looks-heading" style="font-size:24px;font-weight:700">Account details</p><p id="body-copy">Normal paragraph content.</p></main>',
      'body{font-size:16px}',
    );
    const match = evaluateDocumentStructure().find((signal) => signal.rule.id === 'FT-REVIEW-032');
    expect(match?.element.id).toBe('looks-heading');
    expect(match?.outcome).toBe('review');
  });

  it('reviews nested page-level landmarks but respects native scoped header/footer semantics', () => {
    render(`<header><h1>Site</h1></header><main>
      <div id="nested-banner" role="banner">Nested banner</div>
      <aside id="nested-aside">Related</aside>
      <header id="section-header">Local header</header>
      <footer id="section-footer">Local footer</footer>
    </main><footer>Site footer</footer>`);
    const matches = evaluateDocumentStructure().filter((signal) => signal.rule.id === 'FT-REVIEW-033');
    expect(matches.map((signal) => signal.element.id)).toEqual(expect.arrayContaining(['nested-banner', 'nested-aside']));
    expect(matches.map((signal) => signal.element.id)).not.toEqual(expect.arrayContaining(['section-header', 'section-footer']));
  });

  it('reviews multiple banner and contentinfo landmarks within one document scope', () => {
    render('<header><h1>Site</h1></header><div role="banner" aria-label="Secondary"></div><main>Content</main><footer>One</footer><div role="contentinfo" aria-label="Two"></div>');
    const matches = evaluateDocumentStructure().filter((signal) => signal.rule.id === 'FT-REVIEW-034');
    expect(matches.filter((signal) => signal.evidence.includes('banner'))).toHaveLength(2);
    expect(matches.filter((signal) => signal.evidence.includes('contentinfo'))).toHaveLength(2);
  });

  it('reviews meaningful content outside landmarks but not content covered by a main landmark', () => {
    render('<header><h1>Site</h1></header><p id="outside">Uncovered notice</p><main><p id="inside">Covered content</p></main>');
    const matches = evaluateDocumentStructure().filter((signal) => signal.rule.id === 'FT-REVIEW-035');
    expect(matches.map((signal) => signal.element.id)).toContain('outside');
    expect(matches.map((signal) => signal.element.id)).not.toContain('inside');
  });

  it('warns for an explicit unnamed region and accepts a named region', () => {
    render('<main><h1>Page</h1><div id="unnamed" role="region">A</div><div id="named" role="region" aria-label="Account">B</div></main>');
    const matches = evaluateDocumentStructure().filter((signal) => signal.rule.id === 'FT-WARN-024');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.element.id).toBe('unnamed');
    expect(matches[0]?.outcome).toBe('warning');
  });

  it('extends repeated landmark naming review to region and form landmarks', () => {
    render(`<main><h1>Page</h1>
      <section aria-label="Details">One</section><section aria-label="Details">Two</section>
      <form aria-label="Lookup"></form><form aria-label="Lookup"></form>
    </main>`);
    const result = runFocusTraceScan();
    const matches = result.review.filter((issue) => issue.ruleId === 'FT-REVIEW-010');
    expect(matches).toHaveLength(4);
  });

  it('does not apply whole-document structure rules to component scans', () => {
    render('<div id="component"><h2></h2><p style="font-size:24px;font-weight:700">Title</p></div>');
    const result = runFocusTraceScan({ type: 'component', selector: '#component', tag: 'div' });
    const documentRules = new Set(['FT-REVIEW-030', 'FT-REVIEW-031', 'FT-REVIEW-032', 'FT-REVIEW-033', 'FT-REVIEW-034', 'FT-REVIEW-035', 'FT-WARN-024']);
    expect(result.ruleResults?.some((rule) => documentRules.has(rule.ruleId))).toBe(false);
    expect([...result.issues, ...result.review, ...result.warnings].some((issue) => documentRules.has(issue.ruleId))).toBe(false);
  });
});
