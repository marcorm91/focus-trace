import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('affected target inspector contract', () => {
  it('uses the same target inspector across scan, report and structure findings', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const report = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');
    const structure = source('entrypoints/sidepanel/views/StructureView.tsx');

    expect(scan).toContain('<TargetInspector');
    expect(report).toContain('<TargetInspector');
    expect(structure).toContain('<TargetInspector');
    expect(scan).toContain('ruleId={issue.ruleId}');
    expect(report).toContain('ruleId={issue.ruleId}');
  });

  it('keeps technical selectors secondary and exposes bounded current HTML on demand', () => {
    const inspector = source('entrypoints/sidepanel/components/TargetInspector.tsx');
    const inspection = source('lib/runtime/scan-target-inspection.ts');

    expect(inspector).toContain("tr(language, 'Affected element', 'Elemento afectado')");
    expect(inspector).toContain("tr(language, 'View HTML', 'Ver HTML')");
    expect(inspector).toContain("tr(language, 'Technical selector', 'Selector técnico')");
    expect(inspector).toContain('inspectScanTargetInPage');
    expect(inspection).toContain('MAX_ATTRIBUTES = 16');
    expect(inspection).toContain("'  …'");
    expect(inspection).not.toContain('outerHTML');
    expect(inspection).not.toContain('document.documentElement.innerHTML');
  });

  it('carries rule and occurrence context into the page highlight', () => {
    const overlay = source('lib/runtime/scan-target-overlay.ts');
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const report = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');

    expect(overlay).toContain('export function scanTargetLocator');
    expect(overlay).toContain("__focustrace_target__:");
    expect(scan).toContain('scanTargetLocator(nextTarget, label)');
    expect(report).toContain('scanTargetLocator(nextTarget, label)');
  });

  it('stores compact target identity and optional relationship context instead of DOM fragments', () => {
    const types = source('shared/types.ts');
    const scan = source('lib/audit/scan.ts');

    expect(types).toContain('element?: ElementSnapshot;');
    expect(types).toContain('context?: ElementSnapshot;');
    expect(types).toContain('className?: string;');
    expect(scan).toContain('compactElementSnapshot');
    expect(scan).toContain('ariaAllowedChildContext');
    expect(scan).not.toContain('outerHTML');
  });

  it('uses a consistent four-pixel attention rule with aligned content spacing', () => {
    const scanCss = source('entrypoints/sidepanel/scan-accordion.css');
    const structureCss = source('entrypoints/sidepanel/structure.css');
    const headingCss = source('entrypoints/sidepanel/heading-tree-visual.css');
    const reportCss = source('entrypoints/sidepanel/components/report-scan-compact.css');

    expect(scanCss).toContain('border-left-width: 4px;');
    expect(scanCss).toContain('padding: 10px;');
    expect(structureCss).toContain('border-left-width: 4px;');
    expect(structureCss).toContain('padding: 10px;');
    expect(headingCss).toContain('border-left-width: 4px;');
    expect(headingCss).toContain('padding-left: 10px;');
    expect(reportCss).toContain('border-left: 4px solid var(--ft-accent);');
    expect(reportCss).toContain('padding: 10px;');
  });
});
