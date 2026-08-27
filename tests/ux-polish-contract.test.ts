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

  it('keeps H1-H6 hierarchy compact without the heavy pseudo-tree connectors', () => {
    const css = source('entrypoints/sidepanel/heading-tree-visual.css');
    for (let level = 1; level <= 6; level += 1) {
      expect(css).toContain(`.heading-tree-row.level-${level}`);
    }
    expect(css).toContain('margin-inline-start: calc(var(--heading-depth) * 6px)');
    expect(css).toContain('.heading-tree .heading-tree-row::before');
    expect(css).toContain('display: none;');
    expect(css).toContain('white-space: nowrap;');
    expect(css).toContain('text-overflow: ellipsis;');
    expect(css).not.toContain('!important');
  });

  it('uses one SVG-mask icon language without specificity overrides', () => {
    const css = source('entrypoints/sidepanel/modern-icons.css');
    expect(css).toContain('--ft-i-review');
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
    expect(css).toContain('.finding-location > button::before');
    expect(css).toContain('-webkit-mask: var(--ft-i-focus)');
    expect(css).not.toContain('--ft-i-code');
    expect(css).not.toContain('!important');
  });

  it('keeps patch layers removed from the sidepanel cascade', () => {
    const entry = source('entrypoints/sidepanel/main.tsx');
    expect(entry).toContain("import './workspace-layout.css';");
    expect(entry).toContain("import './control-states.css';");
    expect(entry).toContain("import './modern-icons.css';");
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

  it('keeps hover states legible and contrast metadata in a responsive 2x2 grid', () => {
    const states = source('entrypoints/sidepanel/control-states.css');
    expect(states).toContain('.export-pdf-report:hover:not(:disabled)');
    expect(states).toContain('color: var(--ft-paper, Canvas);');
    expect(states).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(states).toContain('@media (max-width: 400px)');
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

  it('keeps the shipped severity model independent from third-party impact-comparison content', () => {
    const guidance = source('entrypoints/sidepanel/components/FindingGuidance.tsx');
    const siteReport = source('lib/site-audit/text-report.ts');
    const catalog = source('shared/rule-catalog.ts');
    const severityDocs = source('docs/SEVERITY.md');
    const auditDocs = source('docs/SEVERITY-AUDIT.md');
    const rulesDocs = source('docs/RULES.md');
    const readme = source('README.md');

    expect(guidance).not.toContain('impactReferences');
    expect(guidance).not.toContain('dequeuniversity.com');
    expect(guidance).toContain('FocusTrace asigna este impacto base de forma independiente');
    expect(siteReport).not.toContain('Comparable impact reference');
    expect(siteReport).not.toContain('Referencia de impacto comparable');
    expect(catalog).not.toContain('impactReferences');
    expect(catalog).not.toContain('dequeuniversity.com');
    expect(catalog).not.toContain('axe-core');
    expect(severityDocs).not.toContain('axe-core');
    expect(auditDocs).not.toContain('axe-core');
    expect(rulesDocs).not.toContain('axe-core');
    expect(readme).not.toContain('axe-core');
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
    expect(matrix).toContain('Impacto por resultado');
    expect(matrix).toContain('Ejemplo: un salto de nivel de encabezado');
    expect(matrixCss).not.toContain('severity-impact-summary');
    expect(matrixCss).not.toContain('!important');
    expect(entry).not.toContain('<ImpactMatrix />');
  });

  it('renders the compact report scan directly without a hidden legacy tree or portal host', () => {
    const component = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');
    const componentCss = source('entrypoints/sidepanel/components/report-scan-compact.css');
    const report = source('entrypoints/sidepanel/views/SessionReportView.tsx');
    const entry = source('entrypoints/sidepanel/main.tsx');

    expect(component).toContain("import './report-scan-compact.css';");
    expect(component).toContain('report-compact-tabs');
    expect(component).toContain('ReportRuleAccordion');
    expect(component).toContain('report-rule-pager');
    expect(component).toContain('scan: ScanResult');
    expect(component).toContain('language: AppLanguage');
    expect(component).not.toContain('createPortal');
    expect(component).not.toContain('MutationObserver');
    expect(component).not.toContain('FOCUSTRACE_GET_SESSION');
    expect(component).not.toContain('data-focustrace-report-scan-host');
    expect(componentCss).toContain('.report-compact-scan');
    expect(componentCss).not.toContain('!important');

    expect(report).toContain('<ReportScanCompact scan={scan} language={language} />');
    expect(report).not.toContain('className="report-group"');
    expect(report).not.toContain('className="report-finding"');
    expect(entry).not.toContain('<ReportScanCompact />');
  });
});
