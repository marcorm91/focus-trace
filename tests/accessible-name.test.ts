// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { accessibleNameDetails, accessibleNameDiagnostics } from '../lib/audit/dom';

function mount(html: string) {
  document.open();
  document.write(`<!doctype html><html><head><title>AccName fixture</title></head><body>${html}</body></html>`);
  document.close();
}

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing fixture element #${id}`);
  return element;
}

describe('FocusTrace accessible name computation', () => {
  beforeEach(() => mount(''));

  it('gives aria-labelledby precedence over aria-label and preserves reference order', () => {
    mount(`
      <span id="first">Delete</span>
      <span id="second">invoice.pdf</span>
      <button id="target" aria-label="Fallback" aria-labelledby="first second">X</button>
    `);

    expect(accessibleNameDetails(byId('target'))).toEqual({
      name: 'Delete invoice.pdf',
      source: 'aria-labelledby',
    });
  });

  it('supports self-reference in aria-labelledby before another referenced node', () => {
    mount(`
      <a id="file" href="/invoice.pdf">invoice.pdf</a>
      <span id="delete" role="button" aria-label="Delete" aria-labelledby="delete file"></span>
    `);

    expect(accessibleNameDetails(byId('delete'))).toEqual({
      name: 'Delete invoice.pdf',
      source: 'aria-labelledby',
    });
  });

  it('uses aria-label before a native label', () => {
    mount(`
      <label for="email">Email address</label>
      <input id="email" type="email" aria-label="Work email">
    `);

    expect(accessibleNameDetails(byId('email'))).toEqual({
      name: 'Work email',
      source: 'aria-label',
    });
  });

  it('concatenates multiple native labels in DOM order', () => {
    mount(`
      <label for="amount">Transfer</label>
      <label for="amount">amount</label>
      <input id="amount" type="number">
    `);

    expect(accessibleNameDetails(byId('amount'))).toEqual({
      name: 'Transfer amount',
      source: 'label',
    });
  });

  it('excludes a nested form control value from its wrapping label text', () => {
    mount(`
      <label>Quantity <input id="quantity" type="text" value="5"></label>
    `);

    expect(accessibleNameDetails(byId('quantity'))).toEqual({
      name: 'Quantity',
      source: 'label',
    });
  });

  it('uses title before placeholder for text-entry controls', () => {
    mount(`<input id="search" type="search" title="Product search" placeholder="Search products">`);

    expect(accessibleNameDetails(byId('search'))).toEqual({
      name: 'Product search',
      source: 'title',
    });
  });

  it('uses placeholder and then aria-placeholder only as late fallbacks', () => {
    mount(`
      <input id="placeholder" type="text" placeholder="First name">
      <textarea id="aria-placeholder" aria-placeholder="Comment"></textarea>
    `);

    expect(accessibleNameDetails(byId('placeholder'))).toEqual({
      name: 'First name',
      source: 'placeholder',
    });
    expect(accessibleNameDetails(byId('aria-placeholder'))).toEqual({
      name: 'Comment',
      source: 'aria-placeholder',
    });
  });

  it('uses descendant text alternatives for buttons and links', () => {
    mount(`
      <button id="save"><img src="save.svg" alt="Save"> changes</button>
      <a id="help" href="/help"><span>Help center</span></a>
    `);

    expect(accessibleNameDetails(byId('save'))).toEqual({ name: 'Save changes', source: 'subtree' });
    expect(accessibleNameDetails(byId('help'))).toEqual({ name: 'Help center', source: 'subtree' });
  });

  it('uses an aria-label on a descendant SVG as the button name', () => {
    mount(`
      <button id="home">
        <svg role="img" aria-label="Zara Pre-owned, go to home"><path /></svg>
      </button>
    `);

    expect(accessibleNameDetails(byId('home'))).toEqual({
      name: 'Zara Pre-owned, go to home',
      source: 'subtree',
    });
  });

  it('uses aria-labelledby resolved by a descendant graphic', () => {
    mount(`
      <span id="cart-name">Shopping cart</span>
      <button id="cart"><svg role="img" aria-labelledby="cart-name"><path /></svg></button>
    `);

    expect(accessibleNameDetails(byId('cart'))).toEqual({
      name: 'Shopping cart',
      source: 'subtree',
    });
  });

  it('exposes the inspected naming candidates for developer evidence', () => {
    mount(`<button id="empty"><svg role="img" aria-label=""></svg></button>`);

    expect(accessibleNameDiagnostics(byId('empty'))).toMatchObject({
      name: '',
      source: 'none',
      role: 'button',
      candidates: expect.arrayContaining([
        expect.objectContaining({
          source: 'aria-label',
          selector: expect.stringContaining('svg'),
          value: '',
          used: false,
        }),
      ]),
    });
  });

  it('allows a directly referenced hidden node to contribute to aria-labelledby', () => {
    mount(`
      <span id="hidden-label" style="display:none">Hidden name</span>
      <button id="target" aria-labelledby="hidden-label"></button>
    `);

    expect(accessibleNameDetails(byId('target'))).toEqual({
      name: 'Hidden name',
      source: 'aria-labelledby',
    });
  });
});
