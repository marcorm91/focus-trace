import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const printableReport = readFileSync('entrypoints/report-print/main.tsx', 'utf8');
const exportCss = readFileSync('entrypoints/sidepanel/views/report-export.css', 'utf8');

describe('report export UX contracts', () => {
  it('allows every static finding with a selector to render its captured visual evidence', () => {
    expect(printableReport).toContain('showVisual={Boolean(selector) || firstVisualIssueIds.has(issue.id)}');
  });

  it('keeps the more-formats panel out of normal layout flow', () => {
    expect(exportCss).toMatch(/\.report-more-formats\s*\{[\s\S]*?block-size:\s*36px;[\s\S]*?overflow:\s*visible;/);
    expect(exportCss).toMatch(/\.report-more-formats\s*>\s*\.report-format-options\s*\{[\s\S]*?position:\s*absolute;/);
  });

  it('draws a proper rotating chevron instead of using a text glyph', () => {
    expect(exportCss).toContain('.report-more-formats > summary::after');
    expect(exportCss).toContain("content: '';");
    expect(exportCss).toContain('border-inline-end: 2px solid currentColor;');
    expect(exportCss).toContain('border-block-end: 2px solid currentColor;');
    expect(exportCss).toContain('.report-more-formats[open] > summary::after');
    expect(exportCss).not.toContain("content: '⌄';");
    expect(exportCss).not.toContain("content: '⌃';");
  });
});
