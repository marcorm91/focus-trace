import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('standards coverage UI contract', () => {
  it('exposes the matrix from Instructions without adding another page-analysis action', () => {
    const instructions = source('entrypoints/sidepanel/views/InstructionsView.tsx');
    const matrix = source('entrypoints/sidepanel/components/StandardsCoverageMatrix.tsx');

    expect(instructions).toContain("import { StandardsCoverageMatrix } from '../components/StandardsCoverageMatrix';");
    expect(instructions).toContain('<StandardsCoverageMatrix language={language} />');
    expect(matrix).toContain("WCAG 2.2 A + AA / EN 301 549 §9");
    expect(matrix).toContain("type=\"search\"");
    expect(matrix).not.toContain('requestPageAccess');
    expect(matrix).not.toContain('browser.scripting');
  });

  it('states the non-conformance boundary and exposes every requested coverage class', () => {
    const matrix = source('entrypoints/sidepanel/components/StandardsCoverageMatrix.tsx');
    const coverage = source('shared/wcag-coverage.ts');

    expect(matrix).toContain("'Coverage is not conformance.'");
    for (const mode of ['automated', 'review', 'runtime', 'site-audit', 'manual', 'not-covered']) {
      expect(coverage).toContain(`'${mode}'`);
    }
    expect(coverage).toContain('FULLY_EVALUATED_WCAG_CRITERIA');
    expect(coverage).toContain('manualReviewRequired: boolean;');
  });

  it('keeps official EN 301 549 V4.1.1 traceability visible beside WCAG references', () => {
    const common = source('entrypoints/sidepanel/components/Common.tsx');
    const coverage = source('shared/wcag-coverage.ts');

    expect(common).toContain('wcagCoverageForCriterion(reference.id)?.en301549');
    expect(common).toContain('{en301549.standard} § {en301549.clause} · {en301549.version}');
    expect(coverage).toContain("standard: 'EN 301 549'");
    expect(coverage).toContain("version: 'V4.1.1 (2026-09)'");
    expect(coverage).toContain("clause: `9.${criterionId}`");
    expect(coverage).toContain('en_301549v040101p.pdf');
  });

  it('carries standards references into the session report and shared TXT/PDF legend', () => {
    const compact = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');
    const legend = source('shared/rule-legend.ts');
    const textReport = source('lib/report/text-report.ts');
    const printable = source('entrypoints/report-print/main.tsx');

    expect(compact).toContain("import { ReferenceList } from './Common';");
    expect(compact).toContain('<ReferenceList references={first.references} language={language} />');
    expect(legend).toContain("id: 'standards-coverage'");
    expect(legend).toContain('EN 301 549 V4.1.1 (2026-09)');
    expect(legend).toContain('§9.x.y.z');
    expect(textReport).toContain('ruleLegendCopy(language)');
    expect(printable).toContain('ruleLegendCopy(language)');
  });

  it('keeps the coverage table responsive instead of compressing criterion text into the sidepanel width', () => {
    const css = source('entrypoints/sidepanel/components/standards-coverage.css');
    const index = source('entrypoints/sidepanel/index.css');

    expect(css).toContain('overflow-x: auto;');
    expect(css).toContain('min-width: 660px;');
    expect(css).toContain('@media (max-width: 520px)');
    expect(index).toContain("@import url('./components/standards-coverage.css') layer(components);");
  });
});
