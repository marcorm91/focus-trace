import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('sidepanel layout polish contract', () => {
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
    expect(css).toContain('.report-coverage > div');
    expect(css).toContain('.metric,');
    expect(css).toContain('border: 0;');
    expect(css).toContain('border-radius: 0;');
    expect(css).toContain('background: transparent;');
    expect(css).toContain('box-shadow: none;');
    expect(css).toContain('cursor: default;');
    expect(css).toContain('.report-inline-summary > span');
    expect(css).toContain('.report-category-summary > span');
    expect(css).not.toContain(':hover');
    expect(css).not.toContain('cursor: pointer');
    expect(css).not.toContain('!important');
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
    expect(css).not.toContain('.focus-memory-status');
  });
});
