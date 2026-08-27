// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { runFocusTraceScan } from '../lib/audit/scan';
import { buildTextSessionReport } from '../lib/report/text-report';
import type { ComponentScanScope } from '../shared/types';

function render(body: string, head = '') {
  document.open();
  document.write(`<!doctype html><html><head>${head}</head><body>${body}</body></html>`);
  document.close();
}

function checkoutScope(): ComponentScanScope {
  return {
    type: 'component',
    selector: '#checkout',
    tag: 'section',
    label: 'Checkout',
  };
}

describe('component-scoped static analysis', () => {
  it('reports findings inside the selected subtree without leaking unrelated page findings', () => {
    render(`
      <main>
        <section id="checkout" aria-label="Checkout">
          <button id="inside"><svg aria-hidden="true"></svg></button>
        </section>
        <a id="outside" href="/account"><svg aria-hidden="true"></svg></a>
      </main>
    `);

    const result = runFocusTraceScan(checkoutScope());
    const targets = result.issues.flatMap((issue) => issue.targets);

    expect(result.scope).toEqual(checkoutScope());
    expect(targets).toContain('#inside');
    expect(targets).not.toContain('#outside');
    expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-005')).toBe(false);
  });

  it('does not run page-global title, language or heading-outline checks for a component', () => {
    render(`
      <main>
        <h2>Page starts below H1</h2>
        <section id="checkout"><button aria-label="Pay">Pay</button></section>
      </main>
    `);

    const component = runFocusTraceScan(checkoutScope());
    const fullPage = runFocusTraceScan();

    expect(component.rulesRun).toBeLessThan(fullPage.rulesRun);
    expect(component.headings).toBeUndefined();
    expect(component.issues.some((issue) => ['FT-WCAG-001', 'FT-WCAG-008', 'FT-WCAG-009'].includes(issue.ruleId))).toBe(false);
    expect(component.review.some((issue) => issue.ruleId === 'FT-REVIEW-002')).toBe(false);

    expect(fullPage.issues.map((issue) => issue.ruleId)).toContain('FT-WCAG-001');
    expect(fullPage.issues.map((issue) => issue.ruleId)).toContain('FT-WCAG-008');
    expect(fullPage.review.map((issue) => issue.ruleId)).toContain('FT-REVIEW-002');
  });

  it('consumes the ephemeral component scope selected by the in-page picker', () => {
    render('<main><section id="checkout"><button id="inside"></button></section></main>');
    const scope = checkoutScope();
    document.documentElement.setAttribute('data-focustrace-scan-component', JSON.stringify(scope));

    const result = runFocusTraceScan();

    expect(result.scope).toEqual(scope);
    expect(result.issues.flatMap((issue) => issue.targets)).toContain('#inside');
    expect(document.documentElement.hasAttribute('data-focustrace-scan-component')).toBe(false);
  });

  it('keeps normal page scans explicitly marked as page scope', () => {
    render('<main><h1>Page</h1><button aria-label="Continue">Continue</button></main>', '<title>Test</title>');
    document.documentElement.lang = 'en';

    const result = runFocusTraceScan();

    expect(result.scope).toEqual({ type: 'page' });
    expect(result.headings).toHaveLength(1);
    expect(result.rulesRun).toBe(17);
  });

  it('describes the selected component and omitted document-context checks in text exports', () => {
    render('<main><section id="checkout" aria-label="Checkout"><button id="inside"></button></section></main>');
    const scan = runFocusTraceScan(checkoutScope());

    const report = buildTextSessionReport({
      scan,
      events: [],
      language: 'es',
      generatedAt: Date.UTC(2026, 7, 27, 12, 0, 0),
    });

    expect(report).toContain('Alcance estático: Componente');
    expect(report).toContain('Componente: Checkout');
    expect(report).toContain('Selector del componente: #checkout');
    expect(report).toContain('3. ANÁLISIS DE COMPONENTE');
    expect(report).toContain('No evaluada en el alcance de componente');
    expect(report).toContain('La evidencia runtime sigue siendo de toda la sesión');
  });
});
