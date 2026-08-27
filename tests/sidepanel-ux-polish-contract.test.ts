import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('sidepanel UX polish contract', () => {
  it('keeps zero-count result tabs non-interactive', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const report = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');
    const scanCss = source('entrypoints/sidepanel/scan-settings.css');
    const reportCss = source('entrypoints/sidepanel/components/report-scan-compact.css');

    expect(scan).toContain('disabled={tab.count === 0}');
    expect(report).toContain('disabled={group.findings.length === 0}');
    expect(scanCss).toContain('.scan-filter-tabs button:disabled');
    expect(reportCss).toContain('.report-compact-tabs button:disabled');
  });

  it('starts every scan and report finding accordion collapsed', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const report = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');

    expect(scan).toContain('<details className={`scan-rule-group outcome-${first.outcome} severity-${first.severity}`}>');
    expect(report).toContain('<details className={`report-rule-group outcome-${first.outcome} severity-${first.severity}`}>');
    expect(scan).not.toContain('defaultOpen');
    expect(report).not.toContain('defaultOpen');
    expect(scan).not.toContain('open={');
    expect(report).not.toContain('open={');
  });

  it('keeps impact colors in the severity header and the body neutral', () => {
    const matrix = source('entrypoints/sidepanel/components/ImpactMatrix.tsx');
    const css = source('entrypoints/sidepanel/components/impact-matrix.css');

    expect(matrix).toContain('<th scope="col" aria-label={tr(language, \'Result\', \'Resultado\')} />');
    expect(matrix).toContain("className={count ? 'has-findings' : 'is-empty'}");
    expect(css).toContain('.impact-matrix thead .severity-critical');
    expect(css).toContain('.impact-matrix thead .severity-serious');
    expect(css).toContain('.impact-matrix thead .severity-moderate');
    expect(css).toContain('.impact-matrix thead .severity-minor');
    expect(css).not.toContain('.impact-matrix tr.outcome-fail th');
    expect(css).not.toContain('td.has-findings.severity-');
    expect(css).toContain('border-collapse: collapse;');
  });

  it('exposes a localized native tooltip on the settings control', () => {
    const app = source('entrypoints/sidepanel/App.tsx');

    expect(app).toContain("title={tr(language, 'Settings', 'Ajustes')}");
    expect(app).toContain("aria-label={tr(language, 'Open settings', 'Abrir ajustes')}");
  });
});
