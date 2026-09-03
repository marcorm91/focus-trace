import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('multipage audit UI contract', () => {
  it('asks before mixing another site and records full-page analyses into the audit', () => {
    const app = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/App.tsx'), 'utf8');
    const dialog = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/components/AuditScopeDialog.tsx'), 'utf8');
    expect(app).toContain('preparePageAnalysis(tab.url)');
    expect(app).toContain('recordPageAnalysis(result, auditPlan)');
    expect(app).toContain('<AuditScopeDialog');
    expect(dialog).toContain('Add to current audit');
    expect(dialog).toContain('Start new audit');
    expect(dialog).toContain('Añadir a la auditoría actual');
    expect(dialog).toContain('Empezar una nueva auditoría');
  });

  it('uses a shared empty-state pattern for Report and exposes themed audit PDF export', () => {
    const report = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/AuditReportWorkspace.tsx'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/audit.css'), 'utf8');
    expect(report).toContain('empty structure-empty report-empty-state');
    expect(report).toContain('Todavía no hay datos de análisis');
    expect(report).toContain('Exportar auditoría PDF');
    expect(report).toContain('Revisión realizada');
    expect(css).toContain('.export-audit-report {');
    expect(css).toContain('box-shadow: var(--ft-shadow-sm);');
    expect(css).toContain('border: 1.5px solid var(--ft-border, CanvasText);');
  });

  it('expands each saved page into the complete existing session report without duplicating the current report below', () => {
    const report = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/AuditReportWorkspace.tsx'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/audit.css'), 'utf8');
    expect(report).toContain('<details');
    expect(report).toContain('className={`audit-page-report${active ? \' is-current\' : \'\'}`}');
    expect(report).toContain('className="audit-page-summary"');
    expect(report).toContain('{open && (');
    expect(report).toContain('<SessionReportView');
    expect(report).toContain('events={active ? events : []}');
    expect(report).toContain('structureSnapshot={active ? structureSnapshot : undefined}');
    expect(report).toContain('!hasAuditPages && scan && (');
    expect(css).toContain('.audit-page-summary::after');
    expect(css).toContain('var(--ft-i-chevron-right)');
    expect(css).toContain('.audit-page-report[open] > .audit-page-summary::after');
    expect(css).toContain('var(--ft-i-chevron-down)');
  });

  it('renders audit pages through a dedicated printable entrypoint', () => {
    const printable = readFileSync(resolve(process.cwd(), 'entrypoints/audit-print/main.tsx'), 'utf8');
    expect(printable).toContain('audit.pages.map');
    expect(printable).toContain('Review performed');
    expect(printable).toContain('Revisión realizada');
    expect(printable).toContain('Repeated analyses of the same normalized URL replace the previous result');
  });
});
