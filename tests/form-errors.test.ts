// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  evaluateErrorIdentification,
  evaluateErrorSuggestions,
} from '../lib/audit/form-errors';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Form error test</title></head><body><main><h1>Form</h1>${body}</main></body></html>`);
  document.close();
}

describe('WCAG form error review', () => {
  it('reviews an explicitly invalid field when no associated text error description is observable', () => {
    render('<label for="email">Email</label><input id="email" aria-invalid="true">');

    expect(evaluateErrorIdentification(document)).toMatchObject([
      {
        outcome: 'review',
        invalidSignal: 'aria-invalid="true"',
        descriptionSignals: [],
      },
    ]);

    const scan = runFocusTraceScan();
    const issue = scan.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-019');
    expect(issue?.targets).toEqual(['#email']);
    expect(issue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '3.3.1')).toBe(true);
    expect(issue?.references.some((reference) => reference.type === 'ACT' && reference.id === '36b590')).toBe(true);
  });

  it('records bounded pass evidence when an invalid field resolves non-empty aria-errormessage text', () => {
    render(`
      <label for="email">Email</label>
      <input id="email" aria-invalid="true" aria-errormessage="email-error">
      <p id="email-error">Enter a valid email address.</p>
    `);

    const [evaluation] = evaluateErrorIdentification(document);
    expect(evaluation).toMatchObject({ outcome: 'pass' });
    expect(evaluation?.descriptionSignals[0]).toContain('aria-errormessage -> #email-error');
    expect(evaluation?.detail).toContain('does not verify that the text fully describes');

    const scan = runFocusTraceScan();
    expect(scan.review.some((candidate) => candidate.ruleId === 'FT-REVIEW-019')).toBe(false);
    expect(scan.ruleResults?.find((result) => result.ruleId === 'FT-REVIEW-019')).toMatchObject({
      applicable: 1,
      passed: 1,
      reviews: 0,
    });
  });

  it('accepts non-empty aria-describedby text as an observable error-description candidate', () => {
    render(`
      <label for="postcode">Postcode</label>
      <input id="postcode" aria-invalid="true" aria-describedby="postcode-error">
      <span id="postcode-error">The postcode is not valid.</span>
    `);

    const [evaluation] = evaluateErrorIdentification(document);
    expect(evaluation?.outcome).toBe('pass');
    expect(evaluation?.descriptionSignals[0]).toContain('aria-describedby -> #postcode-error');
  });

  it('reviews correction guidance only when an invalid field has associated text and observable constraint metadata', () => {
    render(`
      <label for="email">Email</label>
      <input id="email" type="email" required aria-invalid="true" aria-errormessage="email-error">
      <p id="email-error">Email is invalid.</p>
    `);

    const suggestions = evaluateErrorSuggestions(document);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.constraintSignals).toEqual(expect.arrayContaining(['required', 'type="email"']));

    const scan = runFocusTraceScan();
    const issue = scan.review.find((candidate) => candidate.ruleId === 'FT-REVIEW-020');
    expect(issue?.targets).toEqual(['#email']);
    expect(issue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '3.3.3')).toBe(true);
  });

  it('does not stack Error Suggestion review when Error Identification has no associated text candidate', () => {
    render('<input id="age" type="number" min="18" aria-invalid="true">');

    expect(evaluateErrorSuggestions(document)).toEqual([]);
    const scan = runFocusTraceScan();
    expect(scan.review.some((candidate) => candidate.ruleId === 'FT-REVIEW-019')).toBe(true);
    expect(scan.review.some((candidate) => candidate.ruleId === 'FT-REVIEW-020')).toBe(false);
  });

  it('does not create suggestion review when no correction-relevant constraint is observable', () => {
    render(`
      <input id="custom" aria-invalid="true" aria-errormessage="custom-error">
      <p id="custom-error">The value cannot be accepted.</p>
    `);

    expect(evaluateErrorSuggestions(document)).toEqual([]);
  });

  it('keeps form error review scoped to the selected component', () => {
    render(`
      <section id="a"><input id="inside" aria-invalid="true"></section>
      <section id="b"><input id="outside" aria-invalid="true"></section>
    `);

    const scan = runFocusTraceScan({ type: 'component', selector: '#a', tag: 'section' });
    expect(scan.review.some((issue) => issue.ruleId === 'FT-REVIEW-019' && issue.targets.includes('#inside'))).toBe(true);
    expect(scan.review.some((issue) => issue.ruleId === 'FT-REVIEW-019' && issue.targets.includes('#outside'))).toBe(false);
  });
});
