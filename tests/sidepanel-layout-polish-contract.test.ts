import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('sidepanel layout polish contract', () => {
  it('keeps four primary workspaces and groups headings inside a simplified Structure view', () => {
    const structureNavigation = source('entrypoints/sidepanel/structure-navigation.css');
    const structureView = source('entrypoints/sidepanel/views/StructureView.tsx');
    const app = source('entrypoints/sidepanel/App.tsx');
    const about = source('entrypoints/sidepanel/about.css');
    const focusGraph = source('entrypoints/sidepanel/focus-graph.css');

    expect(structureNavigation).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(structureNavigation).toContain('--ft-i-structure');
    expect(structureNavigation).toContain('button:nth-child(4) > span');
    expect(structureView).toContain("type StructureMode = 'headings' | 'semantics' | 'metrics';");
    expect(structureView).not.toContain("'map'");
    expect(structureView).toContain('<HeadingTreeView scan={scan} language={language} onLocate={onLocate} />');
    expect(structureView).toContain('structure-element-details');
    expect(structureView).toContain('groupLocateSelector');
    expect(app).not.toContain("view === 'headings'");
    expect(about).not.toMatch(/(^|\n)\.tabs\s*\{/);
    expect(focusGraph).not.toMatch(/(^|\n)\.tabs\s*\{/);
  });

  it('keeps the semantic/metric Structure collection explicitly on demand', () => {
    const structureView = source('entrypoints/sidepanel/views/StructureView.tsx');

    expect(structureView).toContain("tr(language, 'Analyze structure', 'Analizar estructura')");
    expect(structureView).toContain("tr(language, 'Refresh', 'Actualizar')");
    expect(structureView).not.toContain('if (!snapshot && !busy) void onRefresh();');
  });

  it('renders four composed quick actions as 2x2 and one column when narrow', () => {
    const css = source('entrypoints/sidepanel/workspace-layout.css');
    const siteAudit = source('entrypoints/sidepanel/components/SiteAuditLauncher.tsx');

    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(css).toContain('@media (max-width: 620px)');
    expect(css).toContain('grid-template-columns: 1fr;');
    expect(siteAudit).not.toContain('createPortal');
    expect(siteAudit).not.toContain('document.querySelector');
  });

  it('keeps component context compact and removes duplicated actions from the rendered layout', () => {
    const css = source('entrypoints/sidepanel/component-scan.css');

    expect(css).toContain(":has(.scan-scope-banner) #scan-title + p");
    expect(css).toContain('.scan-scope-copy strong');
    expect(css).toContain('.scan-scope-actions button + button');
    expect(css).toContain('align-items: start;');
    expect(css).toContain('align-self: start;');
  });

  it('uses the danger palette for heading hierarchy signals and gives the signal badge more emphasis', () => {
    const css = source('entrypoints/sidepanel/heading-tree-visual.css');

    expect(css).toContain('.heading-tree-row.has-signal .heading-level');
    expect(css).toContain('background: var(--ft-danger-soft);');
    expect(css).toContain('color: var(--ft-danger);');
    expect(css).toContain('box-shadow: inset 4px 0 0 var(--ft-danger);');
    expect(css).toContain('font-size: 14px;');
    expect(css).not.toContain('!important');
  });

  it('presents summary metrics as flat information instead of button-like cards', () => {
    const css = source('entrypoints/sidepanel/information-summaries.css');
    const entry = source('entrypoints/sidepanel/main.tsx');

    expect(entry).toContain("import './index.css';");
    expect(css).toContain('.report-scoreline > div');
    expect(css).toContain('.focus-journey-summary > span');
    expect(css).toContain('.heading-outline-summary > span');
    expect(css).toContain('.scan-coverage-summary > div');
    expect(css).toContain('.report-coverage > div');
    expect(css).toContain('.metric,');
    expect(css).toContain('border: 0;');
    expect(css).toContain('border-radius: 0;');
    expect(css).toContain('background: transparent;');
    expect(css).toContain('box-shadow: none;');
    expect(css).toContain('cursor: default;');
    expect(source('entrypoints/sidepanel/views/session-report.css')).toContain('border-radius: 0;');
    expect(css).toContain('.report-inline-summary > span');
    expect(css).toContain('.report-category-summary > span');
    expect(css).not.toContain(':hover');
    expect(css).not.toContain('cursor: pointer');
    expect(css).not.toContain('!important');
  });

  it('shows report category totals as metadata instead of pill buttons', () => {
    const css = source('entrypoints/sidepanel/views/session-report.css');
    const categorySummary = css.slice(css.indexOf('.report-category-summary {'), css.indexOf('.report-scope-note {'));

    expect(categorySummary).toContain('border: 0;');
    expect(categorySummary).toContain('border-radius: 0;');
    expect(categorySummary).toContain('background: transparent;');
    expect(categorySummary).toContain('cursor: default;');
    expect(categorySummary).toContain('span:not(:last-child)::after');
    expect(categorySummary).not.toContain('border-radius: 999px;');
  });

  it('shows the complete runtime trace chain without horizontal scrolling or ellipsis', () => {
    const css = source('entrypoints/sidepanel/views/session-report.css');
    const chain = css.slice(css.indexOf('.trace-story-chain {'), css.indexOf('.trace-story-result {'));

    expect(chain).toContain('flex-wrap: wrap;');
    expect(chain).toContain('overflow-wrap: anywhere;');
    expect(chain).toContain('white-space: normal;');
    expect(chain).not.toContain('overflow-x: auto;');
    expect(chain).not.toContain('text-overflow: ellipsis;');
    expect(chain).not.toContain('white-space: nowrap;');
    expect(chain).not.toContain('max-width: 180px;');
  });

  it('shows compact Memory summary chips, a disclosure chevron and tabular evidence history', () => {
    const component = source('entrypoints/sidepanel/components/FocusMemorySummary.tsx');
    const history = source('entrypoints/sidepanel/components/FocusMemoryHistory.tsx');
    const css = source('entrypoints/sidepanel/components/focus-memory.css');

    expect(history).toContain("tr(language, 'Finding history', 'Historial por fallo')");
    expect(component).toContain('focus-memory-summary-row');
    expect(history).toContain('focus-memory-evidence-table');
    expect(history).toContain('<table');
    expect(history).toContain('<th scope="col">');
    expect(component).not.toContain('focus-memory-status');
    expect(component).not.toContain('focus-memory-finding-timeline');
    expect(component).toContain('${FOCUS_MEMORY_MAX_FAILURE_FINGERPRINTS} failure details per scan');
    expect(component).toContain('${FOCUS_MEMORY_MAX_FAILURE_FINGERPRINTS} detalles de fallo por análisis');
    expect(css).toContain('.focus-memory-summary-row');
    expect(css).toContain('.focus-memory-history > summary::after');
    expect(css).toContain('.focus-memory-evidence-table');
    expect(css).toContain('border-collapse: collapse;');
    expect(css).toContain('flex-wrap: wrap;');
    expect(css).toContain('overflow-wrap: anywhere;');
    expect(css).toContain('overflow: hidden;');
    expect(css).not.toContain('.focus-memory-status');
  });

  it('keeps Memory contained and visually neutral while preserving state labels', () => {
    const memory = source('entrypoints/sidepanel/components/focus-memory.css');
    const interactions = source('entrypoints/sidepanel/memory-interactions.css');
    const controls = source('entrypoints/sidepanel/ui-consistency.css');

    expect(memory).toContain('width: 100%;');
    expect(memory).toContain('border: 1px solid var(--ft-border);');
    expect(memory).toContain('box-shadow: none;');
    expect(memory).not.toContain('border-left: 5px');
    expect(interactions).toContain('background: var(--ft-surface-subtle);');
    expect(interactions).not.toContain('border-left: 4px');
    expect(controls).toContain('border-bottom-color: var(--ft-border);');
  });

  it('keeps heading and scan coverage totals on the same flat informational treatment', () => {
    const css = source('entrypoints/sidepanel/information-summaries.css');

    expect(css).toContain('.heading-outline-summary > span,');
    expect(css).toContain('.scan-coverage-summary > div,');
    expect(css).not.toContain('Heading totals belong to the headings workspace');
  });

  it('gives enabled buttons subtle feedback, a pointer cursor and reduced-motion fallback', () => {
    const controls = source('entrypoints/sidepanel/control-states.css');
    const exportCss = source('entrypoints/sidepanel/views/report-export.css');

    expect(controls).toContain('button:not(:disabled) {');
    expect(controls).toContain('cursor: pointer;');
    expect(controls).toContain('opacity 120ms ease');
    expect(controls).toContain('button:not(:disabled):hover');
    expect(controls).toContain('opacity: .94;');
    expect(controls).toContain('@media (prefers-reduced-motion: reduce)');
    expect(controls).toContain('button:disabled {');
    expect(controls).toContain('cursor: not-allowed;');
    expect(exportCss).toContain('.report-export-actions .export-pdf-report');
    expect(exportCss).toContain('background: var(--ft-surface, ButtonFace);');
  });

  it('uses a neutral one-pixel Replay card border and a drawn Trace disclosure chevron', () => {
    const replay = source('entrypoints/sidepanel/views/replay.css');
    const trace = source('entrypoints/sidepanel/views/trace-polish.css');
    const event = replay.slice(replay.indexOf('.replay-event {'), replay.indexOf('.replay-event-header {'));
    const chevron = trace.slice(trace.indexOf('.trace-accordion > summary {'), trace.indexOf('.trace-accordion-icon {'));

    expect(event).toContain('border: 1px solid var(--ft-border');
    expect(event).not.toContain('border-left: 4px');
    expect(replay).toContain('background: var(--ft-surface-subtle');
    expect(chevron).toContain('grid-template-columns: 30px minmax(0, 1fr) auto 14px;');
    expect(chevron).toContain("content: '';");
    expect(chevron).toContain('border-inline-end: 2px solid currentColor;');
    expect(chevron).not.toContain("content: '⌄';");
  });
});
