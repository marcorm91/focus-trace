// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { evaluateFormAudit } from '../lib/audit/form-audit';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Form audit test</title></head><body><main><h1>Form</h1>${body}</main></body></html>`);
  document.close();
}

describe('form labeling, grouping and instruction review', () => {
  it('reviews native controls with multiple associated labels', () => {
    render(`
      <label for="name">Name</label>
      <label for="name">Full name</label>
      <input id="name">
    `);

    const evaluations = evaluateFormAudit(document);
    expect(evaluations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'multiple-labels', element: expect.objectContaining({ id: 'name' }) }),
    ]));

    const scan = runFocusTraceScan();
    expect(scan.review.some((issue) => issue.ruleId === 'FT-REVIEW-040' && issue.targets.includes('#name'))).toBe(true);
  });

  it('reviews title-only native and ARIA controls without duplicating the missing-name failure', () => {
    render(`
      <input id="native" title="Account number">
      <div id="aria" role="textbox" tabindex="0" title="Account alias"></div>
    `);

    const titleOnly = evaluateFormAudit(document).filter((evaluation) => evaluation.kind === 'title-only');
    expect(titleOnly.map((evaluation) => evaluation.element.id)).toEqual(expect.arrayContaining(['native', 'aria']));

    const scan = runFocusTraceScan();
    expect(scan.issues.some((issue) => issue.ruleId === 'FT-WCAG-004' && issue.targets.includes('#native'))).toBe(false);
    expect(scan.review.filter((issue) => issue.ruleId === 'FT-REVIEW-040')).toHaveLength(2);
  });

  it('reviews unnamed form groups and accepts fieldset/ARIA group names', () => {
    render(`
      <fieldset id="unnamed">
        <input type="radio" name="a" aria-label="One">
        <input type="radio" name="a" aria-label="Two">
      </fieldset>
      <fieldset id="named"><legend>Delivery</legend>
        <input type="radio" name="b" aria-label="Home">
        <input type="radio" name="b" aria-label="Office">
      </fieldset>
      <div id="aria-group" role="radiogroup" aria-label="Plan">
        <div role="radio" aria-label="Basic"></div>
        <div role="radio" aria-label="Pro"></div>
      </div>
    `);

    const groups = evaluateFormAudit(document).filter((evaluation) => evaluation.kind === 'unnamed-group');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.element.id).toBe('unnamed');
  });

  it('keeps constraint instruction quality contextual and recognizes described relationships', () => {
    render(`
      <label for="plain">Code</label>
      <input id="plain" pattern="[A-Z]{4}">
      <label for="described">Reference</label>
      <input id="described" minlength="8" aria-describedby="hint">
      <p id="hint">Use at least eight characters.</p>
    `);

    const reviews = evaluateFormAudit(document).filter((evaluation) => evaluation.kind === 'constraint-instructions');
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.element.id).toBe('plain');
  });

  it('reviews visible required wording when no programmatic required state is exposed', () => {
    render(`
      <label for="missing">Email required</label><input id="missing">
      <label for="native">Phone required</label><input id="native" required>
      <span id="aria-label">Address obligatorio</span><div id="aria" role="textbox" aria-labelledby="aria-label" aria-required="true"></div>
    `);

    const reviews = evaluateFormAudit(document).filter((evaluation) => evaluation.kind === 'required-state');
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.element.id).toBe('missing');
  });

  it('never persists editable values or associated error-message text in form findings', () => {
    const secret = 'S3cr3t-private-value';
    render(`
      <label for="password">Password required</label>
      <input id="password" type="password" value="${secret}" aria-invalid="true" aria-errormessage="password-error">
      <p id="password-error">The value ${secret} is not accepted.</p>
    `);

    const scan = runFocusTraceScan();
    const serialized = JSON.stringify({ issues: scan.issues, review: scan.review, warnings: scan.warnings });
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain(`The value ${secret} is not accepted.`);
    expect(scan.review.some((issue) => issue.ruleId === 'FT-REVIEW-019')).toBe(false);
  });

  it('keeps form review scoped to the selected component', () => {
    render(`
      <section id="inside"><input id="inside-field" title="Inside"></section>
      <section id="outside"><input id="outside-field" title="Outside"></section>
    `);

    const scan = runFocusTraceScan({ type: 'component', selector: '#inside', tag: 'section' });
    const findings = scan.review.filter((issue) => issue.ruleId === 'FT-REVIEW-040');
    expect(findings.some((issue) => issue.targets.includes('#inside-field'))).toBe(true);
    expect(findings.some((issue) => issue.targets.includes('#outside-field'))).toBe(false);
  });
});
