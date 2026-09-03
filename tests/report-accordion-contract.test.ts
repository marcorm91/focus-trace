import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const reportView = readFileSync(
  resolve(process.cwd(), 'entrypoints/sidepanel/views/SessionReportView.tsx'),
  'utf8',
);
const accordionCss = readFileSync(
  resolve(process.cwd(), 'entrypoints/sidepanel/views/report-accordion.css'),
  'utf8',
);
const sidepanelCss = readFileSync(
  resolve(process.cwd(), 'entrypoints/sidepanel/index.css'),
  'utf8',
);
const printableReport = readFileSync(
  resolve(process.cwd(), 'entrypoints/report-print/main.tsx'),
  'utf8',
);

describe('report accordion contract', () => {
  it('uses native disclosures for the five interactive report sections', () => {
    expect(reportView.match(/className="report-accordion-summary"/g)).toHaveLength(5);
    expect(reportView).toContain('<details className="report-section report-accordion-section report-priority" open>');
    expect(reportView).toContain('Runtime trace');
    expect(reportView).toContain('Full page scan');
    expect(reportView).toContain('Document structure');
    expect(reportView).toContain('Recommended next steps');
  });

  it('keeps only Highest priority expanded by default', () => {
    expect(reportView.match(/<details className="report-section report-accordion-section[^>]* open>/g)).toHaveLength(1);
    expect(reportView).toContain('report-accordion-section report-trace-section">');
    expect(reportView).toContain('report-accordion-section report-recommendations">');
  });

  it('uses the shared SVG-mask chevrons and native keyboard-focusable summaries', () => {
    expect(accordionCss).toContain('.report-accordion-summary:focus-visible');
    expect(accordionCss).toContain('.report-accordion-summary::after');
    expect(accordionCss).toContain('var(--ft-i-chevron-right)');
    expect(accordionCss).toContain('.report-accordion-section[open] > .report-accordion-summary::after');
    expect(accordionCss).toContain('var(--ft-i-chevron-down)');
    expect(accordionCss).not.toContain("content: '⌄';");
    expect(sidepanelCss).toContain("@import url('./views/report-accordion.css') layer(components);");
  });

  it('does not collapse the printable report', () => {
    expect(printableReport).not.toContain('report-accordion-section');
    expect(printableReport).not.toContain('report-accordion-summary');
  });
});
