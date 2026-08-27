import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('sidepanel visual polish contract', () => {
  it('keeps disabled result tabs visibly distinct', () => {
    const scanCss = source('entrypoints/sidepanel/scan-settings.css');
    const reportCss = source('entrypoints/sidepanel/components/report-scan-compact.css');

    expect(scanCss).toContain('.scan-filter-tabs button:disabled');
    expect(reportCss).toContain('.report-compact-tabs button:disabled');
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
});
