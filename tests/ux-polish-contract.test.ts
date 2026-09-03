import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('UX polish contract', () => {
  it('keeps the representative-template Site Audit copy concise in both languages', () => {
    const copy = source('entrypoints/site-audit/hero-copy.ts');
    expect(copy).toContain('Analyze representative site templates');
    expect(copy).toContain('Analiza plantillas representativas del sitio');
    expect(copy).not.toContain('thousands of duplicates');
    expect(source('entrypoints/site-audit/index.html')).toContain('./hero-copy.ts');
  });

  it('keeps H1-H6 hierarchy compact and contained without clipping long headings', () => {
    const css = source('entrypoints/sidepanel/heading-tree-visual.css');
    const view = source('entrypoints/sidepanel/views/HeadingTreeView.tsx');
    for (let level = 1; level <= 6; level += 1) {
      expect(css).toContain(`.heading-tree-row.level-${level}`);
    }
    expect(css).toContain('padding-inline-start: calc(var(--heading-depth) * 10px)');
    expect(css).not.toContain('margin-inline-start: calc(var(--heading-depth)');
    expect(css).toContain('overflow-x: hidden;');
    expect(css).toContain('grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));');
    expect(css).toContain('overflow-wrap: anywhere;');
    expect(css).toContain('white-space: normal;');
    expect(css).not.toContain('text-overflow: ellipsis;');
    expect(css).not.toContain('!important');
    expect(view).toContain("const rowStyle = { '--heading-depth': depth } as CSSProperties;");
    expect(view).toContain("tr(language, 'H1 count', 'Cantidad de H1')");
  });

  it('uses one SVG-mask icon language without specificity overrides', () => {
    const css = source('entrypoints/sidepanel/modern-icons.css');
    expect(css).toContain('--ft-i-review');
    expect(css).toContain('--ft-i-structure');
    expect(css).toContain('--ft-i-trace');
    expect(css).toContain('--ft-i-headings');
    expect(css).toContain('--ft-i-report');
    expect(css).toContain('--ft-i-page-scan');
    expect(css).toContain('--ft-i-site');
    expect(css).toContain('--ft-i-focus');
    expect(css).toContain('--ft-i-copy');
    expect(css).toContain('--ft-i-chevron-left');
    expect(css).toContain('-webkit-mask: var(--ft-mask)');
    expect(css).toContain('width: 28px;');
    expect(css).toContain('height: 28px;');
    expect(css).toContain('.topbar-tools .reset-all-trigger > span');
    expect(css).toContain('--ft-mask: var(--ft-i-reset)');
    expect(css).toContain('.topbar-tools .settings-trigger > span');
    expect(css).toContain('--ft-mask: var(--ft-i-settings)');
    expect(css).not.toContain('--ft-i-code');
    expect(css).not.toContain('!important');
  });

  it('keeps patch layers removed from the sidepanel cascade', () => {
    const entry = source('entrypoints/sidepanel/index.css');
    expect(entry).toContain("url('./workspace-layout.css') layer(layout)");
    expect(entry).toContain("url('./control-states.css') layer(policy)");
    expect(entry).toContain("url('./modern-icons.css') layer(components)");
    expect(entry).not.toContain("import './workflow-fixes.css';");
    expect(entry).not.toContain("import './regression-fixes.css';");
    expect(entry).not.toContain("import './final-review-polish.css';");
    expect(entry).not.toContain("import './icon-followup-fixes.css';");
    expect(entry).not.toContain("import './accessibility-guardrails.css';");
    expect(entry).not.toContain("import './heading-text-overflow.css';");
  });

  it('keeps the cleaned component styles free of important declarations', () => {
    const ownedStyles = [
      'entrypoints/sidepanel/workspace-layout.css',
      'entrypoints/sidepanel/control-states.css',
      'entrypoints/sidepanel/heading-tree-visual.css',
      'entrypoints/sidepanel/modern-icons.css',
      'entrypoints/sidepanel/scan-accordion.css',
      'entrypoints/sidepanel/components/report-scan-compact.css',
      'entrypoints/sidepanel/components/impact-matrix.css',
      'entrypoints/sidepanel/components/site-audit-launcher.css',
    ];

    for (const path of ownedStyles) {
      expect(source(path)).not.toContain('!important');
    }
  });

  it('does not keep removed scan surfaces or DOM snippets hidden in CSS or the rendered tree', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const overlay = source('lib/runtime/scan-target-overlay.ts');
    const scanCss = source('entrypoints/sidepanel/scan-accordion.css');

    expect(scan).not.toContain('scan-results-note');
    expect(scan).not.toContain('Less repetition, more context');
    expect(scan).not.toContain('<div className="metrics">');
    expect(scan).not.toContain('domSnippet');
    expect(scan).not.toContain('DOM fragment');
    expect(scan).toContain('Highlight element on page');
    expect(overlay).not.toContain('outerHTML');
    expect(overlay).not.toContain('snippet');
    expect(scanCss).not.toContain('.scan-results-note');
    expect(scanCss).not.toContain('.finding-dom');
  });

  it('keeps all finding accordions collapsed initially in scan and report surfaces', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const reportScan = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');

    expect(scan).not.toContain('defaultOpen');
    expect(reportScan).not.toContain('defaultOpen');
    expect(scan).not.toContain('open={');
    expect(reportScan).not.toContain('open={');
  });

  it('wraps scan and contrast content instead of forcing horizontal overflow', () => {
    const scanCss = source('entrypoints/sidepanel/scan-accordion.css');
    const states = source('entrypoints/sidepanel/control-states.css');

    expect(scanCss).toContain('.scan-rule-statuses');
    expect(scanCss).toContain('flex-wrap: wrap;');
    expect(scanCss).toContain('overflow-wrap: anywhere;');
    expect(scanCss).toContain('grid-template-columns: auto minmax(0, 1fr) auto auto;');
    expect(scanCss).not.toContain('grid-column: 1 / -1;');
    expect(states).toContain('.contrast-color-value');
    expect(states).toContain('grid-template-columns: 18px minmax(0, 1fr) 30px;');
    expect(states).toContain('text-overflow: ellipsis;');
    expect(states).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(states).toContain('grid-template-columns: 24px minmax(0, 1fr) 30px;');
    expect(states).toContain('@media (max-width: 560px)');
  });

  it('labels unresolved contrast as indeterminate and exposes the missing background', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const contrastCss = source('entrypoints/sidepanel/scan-settings.css');

    expect(scan).toContain("tr(language, 'Indeterminate', 'Indeterminado')");
    expect(scan).toContain('Manual review · required');
    expect(scan).toContain("tr(language, 'Unresolved', 'No resuelto')");
    expect(scan).toContain('!issue.contrast.background && issue.contrast.ratio == null');
    expect(contrastCss).toContain('grid-template-columns: minmax(0, 1fr) auto;');
    expect(contrastCss).toContain('white-space: nowrap;');
    expect(contrastCss).toContain('overflow-wrap: normal;');
    expect(contrastCss).toContain('word-break: normal;');
    expect(contrastCss).not.toContain('.contrast-evidence.fail');
    expect(contrastCss).not.toContain('.contrast-evidence.review');
  });

  it('uses the neutral border color for finding evidence', () => {
    const visualSystem = source('entrypoints/sidepanel/visual-system.css');

    expect(visualSystem).toContain('.evidence {');
    expect(visualSystem).toContain('border-left-width: 4px;');
    expect(visualSystem).toContain('border-left-color: var(--ft-border);');
  });

  it('keeps hover states legible and contrast metadata responsive', () => {
    const states = source('entrypoints/sidepanel/control-states.css');
    const exportCss = source('entrypoints/sidepanel/views/report-export.css');

    expect(states).toContain('button:not(:disabled):hover');
    expect(states).toContain('opacity: .94;');
    expect(states).toContain('.report-export-actions button:hover:not(:disabled)');
    expect(states).toContain('color: var(--ft-ink, CanvasText);');
    expect(exportCss).toContain('.report-export-actions .export-pdf-report');
    expect(exportCss).toContain('background: var(--ft-surface, ButtonFace);');
    expect(states).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(states).toContain('@media (max-width: 560px)');
    expect(states).not.toContain('!important');
  });

  it('localizes report source labels inside React instead of patching rendered DOM', () => {
    const entry = source('entrypoints/sidepanel/main.tsx');
    const report = source('entrypoints/sidepanel/views/SessionReportView.tsx');

    expect(report).toContain('suggestionSourceLabel');
    expect(report).toContain("tr(language, 'Analysis', 'Análisis')");
    expect(report).toContain("tr(language, 'Headings', 'Encabezados')");
    expect(entry).not.toContain('localizedSuggestionSource');
    expect(entry).not.toContain('syncDynamicPolish');
    expect(entry).not.toContain('MutationObserver');
  });

  it('keeps axe as a versioned severity benchmark without making it a runtime dependency', () => {
    const guidance = source('entrypoints/sidepanel/components/FindingGuidance.tsx');
    const siteReport = source('lib/site-audit/text-report.ts');
    const catalog = source('shared/rule-catalog.ts');
    const benchmark = source('generated/axe-rule-severities.json');
    const mappings = source('config/axe-equivalents.json');
    const benchmarkDocs = source('docs/AXE-SEVERITY-BENCHMARK.md');
    const packageJson = source('package.json');

    expect(guidance).not.toContain('impactReferences');
    expect(guidance).not.toContain('dequeuniversity.com');
    expect(siteReport).not.toContain('Comparable impact reference');
    expect(siteReport).not.toContain('Referencia de impacto comparable');
    expect(catalog).not.toContain('impactReferences');
    expect(catalog).not.toContain('dequeuniversity.com');
    expect(benchmark).toContain('"repository": "dequelabs/axe-core"');
    expect(benchmark).toMatch(/"tag": "v\d+\.\d+\.\d+/);
    expect(mappings).toContain('"benchmark": "axe-core"');
    expect(mappings).toContain('"focusTraceRuleId": "FT-WCAG-002"');
    expect(mappings).toContain('"image-alt"');
    expect(benchmarkDocs).toContain('does **not** mean FocusTrace runs axe-core');
    expect(packageJson).not.toContain('"axe-core":');
  });

  it('renders the impact matrix directly from ScanView without a portal or duplicate session observer', () => {
    const matrix = source('entrypoints/sidepanel/components/ImpactMatrix.tsx');
    const matrixCss = source('entrypoints/sidepanel/components/impact-matrix.css');
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const entry = source('entrypoints/sidepanel/main.tsx');

    expect(scan).toContain('<ImpactMatrix scan={scan} language={language} />');
    expect(scan).not.toContain('severity-impact-summary');
    expect(matrix).not.toContain('createPortal');
    expect(matrix).not.toContain('MutationObserver');
    expect(matrix).not.toContain('FOCUSTRACE_GET_SESSION');
    expect(matrix).not.toContain('SETTINGS_STORAGE_KEY');
    expect(matrixCss).toContain('.impact-matrix');
    expect(matrixCss).not.toContain('!important');
  });

  it('renders the compact report scan directly without a hidden legacy tree or portal host', () => {
    const component = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');
    const componentCss = source('entrypoints/sidepanel/components/report-scan-compact.css');
    const report = source('entrypoints/sidepanel/views/SessionReportView.tsx');
    const entry = source('entrypoints/sidepanel/main.tsx');

    expect(entry).toContain("import './index.css';");
    expect(component).toContain('report-compact-tabs');
    expect(component).toContain('ReportRuleAccordion');
    expect(component).toContain('report-rule-pager');
    expect(component).toContain('scan: ScanResult');
    expect(component).toContain('language: AppLanguage');
    expect(component).toContain('onLocate?: LocateHandler | undefined;');
    expect(component).not.toContain('createPortal');
    expect(component).not.toContain('MutationObserver');
    expect(component).not.toContain('FOCUSTRACE_GET_SESSION');
    expect(component).not.toContain('data-focustrace-report-scan-host');
    expect(componentCss).toContain('.report-compact-scan');
    expect(componentCss).toContain('overflow-wrap: anywhere;');
    expect(componentCss).not.toContain('!important');

    expect(report).toContain('<ReportScanCompact scan={scan} language={language} onLocate={livePage ? onLocate : undefined} />');
    expect(report).not.toContain('className="report-group"');
    expect(report).not.toContain('className="report-finding"');
    expect(entry).not.toContain('<ReportScanCompact />');
  });
});
