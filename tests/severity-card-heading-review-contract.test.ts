import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('severity cards and heading review contract', () => {
  it('keeps critical red and serious orange visually distinct', () => {
    const css = source('entrypoints/sidepanel/severity.css');
    expect(css).toContain('--ft-severity-critical-aa: #b91c1c;');
    expect(css).toContain('--ft-severity-serious-aa: #c2410c;');
    expect(css).toContain('--ft-severity-critical-aaa: #991b1b;');
    expect(css).toContain('--ft-severity-serious-aaa: #9a3412;');
  });

  it('shows severity but not duplicated outcome badges inside scan and report accordions', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const report = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');
    const scanCss = source('entrypoints/sidepanel/scan-accordion.css');
    const reportCss = source('entrypoints/sidepanel/components/report-scan-compact.css');

    expect(scan).toContain('severity-badge severity-${first.severity}');
    expect(scan).not.toContain('scan-rule-outcome');
    expect(report).toContain('severity-badge severity-${first.severity}');
    expect(report).not.toContain('report-rule-outcome');
    expect(scanCss).not.toContain('.scan-rule-outcome');
    expect(reportCss).not.toContain('.report-rule-outcome');
  });

  it('uses meaningful counts in report section bullets and preserves rounded suggestion cards', () => {
    const report = source('entrypoints/sidepanel/views/SessionReportView.tsx');
    const layout = source('entrypoints/sidepanel/workspace-layout.css');

    expect(report).toContain('<span>{model.failures}</span>');
    expect(report).toContain('<span>{model.suggestions.length}</span>');
    expect(layout).toContain('border-radius: var(--ft-radius-md);');
    expect(layout).toContain('box-shadow: inset 4px 0 0 var(--ft-danger);');
    expect(layout).not.toContain('border-radius: 0 var(--ft-radius-md)');
  });

  it('treats a first H2-H6 before H1 as review rather than failure', () => {
    const scan = source('lib/audit/scan.ts');
    expect(scan).toContain('index === 0 && level > 1');
    expect(scan).toContain('The heading outline starts below H1.');
    expect(scan).toContain("RULES.headingJump,\n        'review'");
  });
});
