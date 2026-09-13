// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { evaluateTableRelationships } from '../lib/audit/table-relationships';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Table test</title></head><body><main><h1>Table test</h1>${body}</main></body></html>`);
  document.close();
}

function signals(kind: Parameters<ReturnType<typeof evaluateTableRelationships>['signals']['filter']>[0] extends never ? never : string) {
  return evaluateTableRelationships(document).signals.filter((entry) => entry.kind === kind);
}

describe('table names, headers and cell relationships', () => {
  it('passes a simple native table with column headers', () => {
    render('<table><caption>People</caption><tr><th scope="col">Name</th><th scope="col">Age</th></tr><tr><td>Ana</td><td>30</td></tr></table>');
    const evaluation = evaluateTableRelationships(document);
    expect(evaluation.signals.filter((signal) => signal.kind === 'missing-cell-header')).toHaveLength(0);
    const rule = evaluation.ruleResults.find((entry) => entry.ruleId === 'FT-WCAG-017');
    expect(rule?.passed).toBe(2);
    expect(rule?.failures).toBe(0);
  });

  it('fails an orphan data cell in a simple table with proven header structure', () => {
    render('<table><tr><th scope="col">Name</th><th scope="col">Age</th></tr><tr><td>Ana</td><td id="orphan" colspan="1">30</td></tr><tr><td>Ben</td></tr></table>');
    const evaluation = evaluateTableRelationships(document);
    expect(evaluation.signals.some((signal) => signal.kind === 'missing-cell-header' && signal.outcome === 'fail')).toBe(true);
  });

  it('downgrades unresolved complex spanning relationships to review', () => {
    render('<table><tr><th colspan="2">Group</th></tr><tr><td id="complex">A</td><td>B</td></tr></table>');
    const finding = evaluateTableRelationships(document).signals.find((signal) => signal.element.id === 'complex' && signal.kind === 'missing-cell-header');
    expect(finding?.outcome).toBe('review');
  });

  it('does not manufacture deterministic failures for a layout-like table with no data-table evidence', () => {
    render('<table id="layout"><tr><td>Left</td><td>Right</td></tr></table>');
    const evaluation = evaluateTableRelationships(document);
    expect(evaluation.signals.some((signal) => signal.kind === 'missing-cell-header')).toBe(false);
    expect(evaluation.ruleResults.find((entry) => entry.ruleId === 'FT-WCAG-017')?.applicable).toBe(0);
  });

  it('warns for empty exposed headers and ignores hidden table roots', () => {
    render('<table><tr><th id="empty"></th><td>Value</td></tr></table><table hidden><tr><th id="hidden-empty"></th><td>Value</td></tr></table>');
    const evaluation = evaluateTableRelationships(document);
    expect(evaluation.signals.some((signal) => signal.kind === 'empty-header' && signal.element.id === 'empty')).toBe(true);
    expect(evaluation.signals.some((signal) => signal.element.id === 'hidden-empty')).toBe(false);
  });

  it('validates scope tokens and placement', () => {
    render('<table><tr><th id="good" scope="col">Name</th><th id="bad-token" scope="banana">Age</th></tr><tr><td id="bad-placement" scope="row">Ana</td><td>30</td></tr></table>');
    const invalid = evaluateTableRelationships(document).signals.filter((signal) => signal.kind === 'invalid-scope').map((signal) => signal.element.id);
    expect(invalid).toEqual(expect.arrayContaining(['bad-token', 'bad-placement']));
    expect(invalid).not.toContain('good');
  });

  it('validates headers IDREFs within the same native table', () => {
    render(`<table id="first"><tr><th id="name">Name</th></tr><tr><td id="valid" headers="name">Ana</td><td id="missing" headers="nope">X</td></tr></table>
      <table id="second"><tr><th id="foreign">Foreign</th></tr><tr><td id="cross" headers="name">Y</td></tr></table>
      <div id="not-header">Text</div><table><tr><th>Head</th></tr><tr><td id="wrong" headers="not-header">Z</td></tr></table>`);
    const findings = evaluateTableRelationships(document).signals.filter((signal) => signal.kind === 'invalid-headers-reference').map((signal) => signal.element.id);
    expect(findings).toEqual(expect.arrayContaining(['missing', 'cross', 'wrong']));
    expect(findings).not.toContain('valid');
  });

  it('accepts explicit headers references in a complex native table', () => {
    render('<table><tr><th id="group" colspan="2">Group</th></tr><tr><td id="a" headers="group">A</td><td id="b" headers="group">B</td></tr></table>');
    const evaluation = evaluateTableRelationships(document);
    expect(evaluation.signals.some((signal) => signal.kind === 'invalid-headers-reference')).toBe(false);
    expect(evaluation.signals.some((signal) => signal.kind === 'missing-cell-header')).toBe(false);
  });

  it('reviews headers that do not resolve to any data cell', () => {
    render('<table><tr><th id="unused" scope="row">Unused</th></tr><tr><td headers="unused">Data</td></tr></table>');
    const evaluation = evaluateTableRelationships(document);
    expect(evaluation.signals.some((signal) => signal.kind === 'unused-header' && signal.element.id === 'unused')).toBe(false);
    render('<table><tr><th id="actually-unused" scope="row">Unused</th></tr><tr><th scope="col">Name</th></tr><tr><td>Ana</td></tr></table>');
    expect(evaluateTableRelationships(document).signals.some((signal) => signal.kind === 'unused-header' && signal.element.id === 'actually-unused')).toBe(true);
  });

  it('reviews duplicate naming and caption-like first cells', () => {
    render(`<table summary="People"><caption>People</caption><tr><th>Name</th></tr><tr><td>Ana</td></tr></table>
      <table><tr><td id="fake" colspan="2">Sales by quarter</td></tr><tr><td>Q1</td><td>Q2</td></tr></table>`);
    const naming = evaluateTableRelationships(document).signals.filter((signal) => signal.kind === 'table-naming');
    expect(naming.length).toBeGreaterThanOrEqual(2);
    expect(naming.some((signal) => signal.element.id === 'fake')).toBe(true);
  });

  it('supports simple ARIA table/grid header semantics conservatively', () => {
    render(`<div role="table" aria-label="People"><div role="row"><div role="columnheader">Name</div><div role="columnheader">Age</div></div><div role="row"><div id="aria-a" role="cell">Ana</div><div role="cell">30</div></div></div>
      <div role="grid" aria-label="Complex" aria-colcount="4"><div role="row"><div role="columnheader">Name</div></div><div role="row"><div id="aria-complex" role="gridcell">Ana</div></div></div>`);
    const evaluation = evaluateTableRelationships(document);
    expect(evaluation.signals.some((signal) => signal.kind === 'missing-cell-header' && signal.element.id === 'aria-a')).toBe(false);
    const complex = evaluation.signals.find((signal) => signal.kind === 'missing-cell-header' && signal.element.id === 'aria-complex');
    expect(complex?.outcome).toBe('review');
  });

  it('integrates all six table rules into full and component scans', () => {
    render('<section id="component"><table><tr><th scope="col">Name</th></tr><tr><td>Ana</td></tr></table></section>');
    const page = runFocusTraceScan();
    expect(page.ruleResults?.filter((entry) => ['FT-WCAG-017', 'FT-WARN-025', 'FT-WARN-026', 'FT-WARN-027', 'FT-REVIEW-036', 'FT-REVIEW-037'].includes(entry.ruleId))).toHaveLength(6);
    const component = runFocusTraceScan({ type: 'component', selector: '#component', tag: 'section' });
    expect(component.ruleResults?.filter((entry) => entry.ruleId === 'FT-WCAG-017')).toHaveLength(1);
  });
});
