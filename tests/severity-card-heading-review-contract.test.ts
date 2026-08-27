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

  it('uses meaningful counts in report section bullets and preserves rounded suggestion cards', () => {
    const report = source('entrypoints/sidepanel/views/SessionReportView.tsx');
    const layout = source('entrypoints/sidepanel/workspace-layout.css');

    expect(report).toContain('<span>{model.failures}</span>');
    expect(report).toContain('<span>{model.suggestions.length}</span>');
    expect(layout).toContain('border-radius: var(--ft-radius-md);');
    expect(layout).toContain('box-shadow: inset 4px 0 0 var(--ft-danger);');
    expect(layout).not.toContain('border-radius: 0 var(--ft-radius-md)');
  });
});
