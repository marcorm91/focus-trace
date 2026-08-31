import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('severity card presentation contracts', () => {
  it('does not keep obsolete outcome badge styles alongside severity badges', () => {
    const scanCss = source('entrypoints/sidepanel/scan-accordion.css');
    const reportCss = source('entrypoints/sidepanel/components/report-scan-compact.css');

    expect(scanCss).not.toContain('.scan-rule-outcome');
    expect(reportCss).not.toContain('.report-rule-outcome');
  });

  it('colors scan and report accordion accents by severity instead of outcome', () => {
    const scanCss = source('entrypoints/sidepanel/scan-accordion.css');
    const reportCss = source('entrypoints/sidepanel/components/report-scan-compact.css');

    for (const css of [scanCss, reportCss]) {
      expect(css).not.toContain('.outcome-fail { border-left-color');
      expect(css).not.toContain('.outcome-review { border-left-color');
      expect(css).toContain('.severity-critical { border-left-color: var(--ft-severity-critical-aa); }');
      expect(css).toContain('.severity-serious { border-left-color: var(--ft-severity-serious-aa); }');
      expect(css).toContain('.severity-moderate { border-left-color: var(--ft-severity-moderate-aa); }');
      expect(css).toContain('.severity-minor { border-left-color: var(--ft-severity-minor-aa); }');
    }
  });

  it('uses a neutral one-pixel border and chevron for impact rationale accordions', () => {
    const css = source('entrypoints/sidepanel/components/finding-guidance.css');

    expect(css).toContain('grid-template-columns: minmax(0, 1fr) auto 18px;');
    expect(css).toContain("content: '›';");
    expect(css).toContain('.finding-guidance-severity[open] > summary::after');
    expect(css).not.toContain('.finding-guidance-severity.severity-critical');
    expect(css).not.toContain('border-left-width: 4px;');
  });

  it('separates report section numbering from the meaningful counts and preserves rounded suggestion cards', () => {
    const report = source('entrypoints/sidepanel/views/SessionReportView.tsx');
    const layout = source('entrypoints/sidepanel/workspace-layout.css');

    expect(report).toContain('<span className="report-section-index">01</span>');
    expect(report).toContain('<span className="report-section-index">04</span>');
    expect(report).toContain('className="report-section-count"');
    expect(report).toContain("{model.failures} {tr(language, 'failures', 'fallos')}");
    expect(report).toContain("{model.suggestions.length} {tr(language, 'suggestions', 'sugerencias')}");
    expect(layout).toContain('border-radius: var(--ft-radius-md);');
    expect(layout).toContain('box-shadow: inset 4px 0 0 var(--ft-danger);');
    expect(layout).not.toContain('border-radius: 0 var(--ft-radius-md)');
  });

  it('does not repeat the result group inside each printable finding', () => {
    const printable = source('entrypoints/report-print/main.tsx');

    expect(printable).toContain('className={`print-severity severity-${issue.severity}`}');
    expect(printable).not.toContain('<span>{label}</span>');
    expect(printable).not.toContain('label={group.label}');
  });
});
