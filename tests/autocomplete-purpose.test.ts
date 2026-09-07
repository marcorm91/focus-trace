// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { evaluateAutocompletePurpose } from '../lib/audit/autocomplete-purpose';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html lang="en"><head><title>Autocomplete test</title></head><body>${body}</body></html>`);
  document.close();
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('WCAG 1.3.5 autocomplete purpose review', () => {
  it('passes standard autocomplete token sequences without depending on labels', () => {
    render(`
      <input id="user" autocomplete="username">
      <textarea id="address" autocomplete="Street-Address"></textarea>
      <input id="office" autocomplete="section-primary shipping work email">
      <input id="password" autocomplete="current-password webauthn">
    `);

    const evaluations = evaluateAutocompletePurpose();
    expect(evaluations).toHaveLength(4);
    expect(evaluations.every((entry) => entry.outcome === 'pass')).toBe(true);
  });

  it('reviews malformed standard token grammar', () => {
    render(`
      <input id="missing-field" autocomplete="shipping">
      <input id="wrong-contact" autocomplete="work photo">
      <input id="wrong-order" autocomplete="work shipping email">
      <input id="extra" autocomplete="email invalid">
      <input id="double-field" autocomplete="address-line1 address-line2">
    `);

    const evaluations = evaluateAutocompletePurpose();
    expect(evaluations).toHaveLength(5);
    expect(evaluations.every((entry) => entry.outcome === 'review')).toBe(true);
    expect(evaluations.find((entry) => entry.element.id === 'missing-field')?.reason).toContain('required autocomplete field');
    expect(evaluations.find((entry) => entry.element.id === 'wrong-contact')?.reason).toContain('contact hint');
    expect(evaluations.find((entry) => entry.element.id === 'extra')?.reason).toContain('Unexpected autocomplete token');
  });

  it('does not manufacture a finding for unknown-only custom taxonomies', () => {
    render('<input id="custom" autocomplete="banner">');
    expect(evaluateAutocompletePurpose()).toEqual([]);
  });

  it('treats empty, on/off, disabled, hidden and fixed-value controls as inapplicable', () => {
    render(`
      <input autocomplete="">
      <input autocomplete="   ">
      <input autocomplete="off">
      <input autocomplete="ON">
      <input autocomplete="shipping" disabled>
      <input autocomplete="shipping" aria-disabled="true">
      <input autocomplete="shipping" style="display:none">
      <input type="submit" autocomplete="email">
    `);

    expect(evaluateAutocompletePurpose()).toEqual([]);
  });

  it('supports component-scoped evaluation without inspecting sibling controls', () => {
    render(`
      <section id="component"><input id="inside" autocomplete="shipping"></section>
      <input id="outside" autocomplete="billing">
    `);

    const component = document.querySelector('#component');
    expect(component).not.toBeNull();
    const evaluations = evaluateAutocompletePurpose(component!);
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]?.element.id).toBe('inside');
  });
});
