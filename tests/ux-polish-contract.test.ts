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
    const base = source('entrypoints/sidepanel/heading-tree-visual.css');
    const polish = source('entrypoints/sidepanel/final-review-polish.css');
    for (let level = 1; level <= 6; level += 1) {
      expect(base).toContain(`.heading-tree-row.level-${level}`);
    }
    expect(polish).toContain('margin-inline-start: calc(var(--heading-depth) * 6px)');
    expect(polish).toContain('.heading-tree-row::before');
    expect(polish).toContain('display: none !important');
  });

  it('uses the same modern SVG-mask icon language without shrinking navigation affordances', () => {
    const css = source('entrypoints/sidepanel/modern-icons.css');
    expect(css).toContain('--ft-i-review');
    expect(css).toContain('--ft-i-trace');
    expect(css).toContain('--ft-i-headings');
    expect(css).toContain('--ft-i-report');
    expect(css).toContain('--ft-i-page-scan');
    expect(css).toContain('--ft-i-site');
    expect(css).toContain('--ft-i-focus');
    expect(css).toContain('-webkit-mask: var(--ft-mask)');
    expect(css).toContain('width: 28px !important');
    expect(css).toContain('height: 28px !important');
    expect(css).toContain('font-size: 19px !important');

    const polish = source('entrypoints/sidepanel/final-review-polish.css');
    expect(polish).toContain('.topbar-tools button > span');
    expect(polish).toContain('width: 24px !important');
    expect(polish).toContain('--ft-i-copy');
    expect(polish).toContain('--ft-i-chevron-left');

    const followup = source('entrypoints/sidepanel/icon-followup-fixes.css');
    expect(followup).toContain('.topbar-tools .reset-all-trigger > span');
    expect(followup).toContain('--ft-mask: var(--ft-i-reset) !important');
    expect(followup).toContain('.topbar-tools .settings-trigger > span');
    expect(followup).toContain('--ft-mask: var(--ft-i-settings) !important');
    expect(followup).toContain('-webkit-mask: var(--ft-i-focus)');
    expect(followup).toContain('place-items: center !important');

    const entry = source('entrypoints/sidepanel/main.tsx');
    expect(entry).toContain("import './modern-icons.css';");
    expect(entry).toContain("import './final-review-polish.css';");
    expect(entry).toContain("import './icon-followup-fixes.css';");
  });

  it('keeps redundant scan summary blocks out of the visible result surface', () => {
    const followup = source('entrypoints/sidepanel/icon-followup-fixes.css');
    expect(followup).toContain('.scan-results-note');
    expect(followup).toContain('.scan-heading-actions > strong');
    expect(followup).toContain('display: none !important');
  });

  it('keeps hover states legible and contrast metadata in a responsive 2x2 grid', () => {
    const followup = source('entrypoints/sidepanel/icon-followup-fixes.css');
    expect(followup).toContain('.export-pdf-report:hover:not(:disabled)');
    expect(followup).toContain('color: var(--ft-paper, Canvas) !important');
    expect(followup).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important');
    expect(followup).toContain('@media (max-width: 400px)');
  });

  it('keeps report source labels localized instead of exposing internal source ids', () => {
    const entry = source('entrypoints/sidepanel/main.tsx');
    expect(entry).toContain('localizedSuggestionSource');
    expect(entry).toContain("spanish ? 'Análisis' : 'Analysis'");
    expect(entry).toContain("spanish ? 'Encabezados' : 'Headings'");
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

  it('keeps the impact matrix synchronized with the persisted app language', () => {
    const matrix = source('entrypoints/sidepanel/components/ImpactMatrix.tsx');
    expect(matrix).toContain('SETTINGS_STORAGE_KEY');
    expect(matrix).toContain('browser.storage.onChanged.addListener');
    expect(matrix).toContain('Impacto por resultado');
    expect(matrix).toContain('Ejemplo: un salto de nivel de encabezado');
  });

  it('replaces the long report finding list with a filtered rule accordion surface', () => {
    const component = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');
    const polish = source('entrypoints/sidepanel/final-review-polish.css');
    expect(component).toContain('report-compact-tabs');
    expect(component).toContain('ReportRuleAccordion');
    expect(component).toContain('report-rule-pager');
    expect(polish).toContain('.report-group');
    expect(polish).toContain('display: none !important');
  });
});
