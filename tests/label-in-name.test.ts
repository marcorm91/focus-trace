// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateLabelInName, visibleTextLabel } from '../lib/audit/label-in-name';
import { runFocusTraceScan } from '../lib/audit/scan';

function render(body: string) {
  document.open();
  document.write(`<!doctype html><html><head><title>Label in Name</title></head><body><main><h1>Test</h1>${body}</main></body></html>`);
  document.close();
}

function labelInNameFailures() {
  return runFocusTraceScan().issues.filter((issue) => issue.ruleId === 'FT-WCAG-007');
}

function labelInNameWarnings() {
  return runFocusTraceScan().warnings.filter((issue) => issue.ruleId === 'FT-WCAG-007');
}

describe('FT-WCAG-007 Label in Name', () => {
  beforeEach(() => render(''));

  it('passes when the visible label is contained in the accessible name', () => {
    render('<button aria-label="Delete item">Delete</button>');
    expect(labelInNameFailures()).toEqual([]);
    expect(labelInNameWarnings()).toEqual([]);
  });

  it('fails when aria-label replaces the visible label with different words', () => {
    render('<button id="delete" aria-label="Remove item">Delete</button>');
    const failures = labelInNameFailures();
    expect(failures).toHaveLength(1);
    expect(failures[0]?.targets).toEqual(['#delete']);
    expect(failures[0]?.evidence).toContain('"Delete"');
    expect(failures[0]?.evidence).toContain('"Remove item"');
    expect(labelInNameWarnings()).toEqual([]);
  });

  it('passes case-insensitively', () => {
    render('<button aria-label="DELETE ITEM">Delete</button>');
    expect(labelInNameFailures()).toEqual([]);
    expect(labelInNameWarnings()).toEqual([]);
  });

  it('uses aria-labelledby accessible name for comparison', () => {
    render('<span id="name">Archive message</span><button aria-labelledby="name">Archive</button>');
    expect(labelInNameFailures()).toEqual([]);
    expect(labelInNameWarnings()).toEqual([]);
  });

  it('fails when aria-labelledby does not contain the visible label', () => {
    render('<span id="name">Store message</span><button aria-labelledby="name">Archive</button>');
    expect(labelInNameFailures()).toHaveLength(1);
    expect(labelInNameWarnings()).toEqual([]);
  });

  it('warns when the primary label matches but visible product metadata is missing', () => {
    render('<a id="product" href="/product" aria-label="Chaleco Punto Minnie Mouse. Precio 55,00 EUR."><span>Chaleco Punto Minnie Mouse</span><span>40,00 - 55,00 EUR</span></a>');
    const failures = labelInNameFailures();
    const warnings = labelInNameWarnings();
    expect(failures).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.targets).toEqual(['#product']);
    expect(warnings[0]?.evidence).toContain('"Chaleco Punto Minnie Mouse 40,00 - 55,00 EUR"');
    expect(warnings[0]?.evidence).toContain('"Chaleco Punto Minnie Mouse. Precio 55,00 EUR."');
  });

  it('warns when the only visible text looks like auxiliary badge metadata', () => {
    render('<a id="cart" href="/cart" aria-label="Tu cesta esta vacia"><span aria-hidden="true">0</span></a>');
    const evaluations = evaluateLabelInName();
    expect(evaluations[0]?.outcome).toBe('warning');
    expect(labelInNameFailures()).toEqual([]);
    expect(labelInNameWarnings()).toHaveLength(1);
  });

  it('ignores visually hidden descendant text when identifying the visible label', () => {
    render('<button aria-label="Delete"><span style="display:none">permanently</span>Delete</button>');
    const button = document.querySelector('button');
    expect(button && visibleTextLabel(button)).toBe('Delete');
    expect(labelInNameFailures()).toEqual([]);
    expect(labelInNameWarnings()).toEqual([]);
  });

  it('does not apply when the control has no aria-label or aria-labelledby override', () => {
    render('<button>Delete</button>');
    expect(evaluateLabelInName()).toEqual([]);
    expect(labelInNameFailures()).toEqual([]);
    expect(labelInNameWarnings()).toEqual([]);
  });

  it('does not apply when there is no visible text label', () => {
    render('<button aria-label="Open menu"><svg aria-hidden="true"></svg></button>');
    expect(evaluateLabelInName()).toEqual([]);
    expect(labelInNameFailures()).toEqual([]);
    expect(labelInNameWarnings()).toEqual([]);
  });

  it('covers links whose accessible name is overridden', () => {
    render('<a href="/settings" aria-label="Preferences">Settings</a>');
    expect(labelInNameFailures()).toHaveLength(1);
    expect(labelInNameWarnings()).toEqual([]);
  });
});
