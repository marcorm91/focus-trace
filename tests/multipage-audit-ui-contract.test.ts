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

  it('reuses the standard Empty component for Report and exposes audit PDF export', () => {
    const report = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/AuditReportWorkspace.tsx'), 'utf8');
    expect(report).toContain("import { Empty } from '../components/Common';");
    expect(report).toContain('<Empty');
    expect(report).not.toContain('report-empty-state');
    expect(report).not.toContain('report-empty-panel');
    expect(report).toContain('Todavía no hay datos de análisis');
    expect(report).toContain('Exportar auditoría PDF');
    expect(report).toContain('Revisión realizada');
  });

  it('renders audit pages through a dedicated printable entrypoint', () => {
    const printable = readFileSync(resolve(process.cwd(), 'entrypoints/audit-print/main.tsx'), 'utf8');
    expect(printable).toContain('audit.pages.map');
    expect(printable).toContain('Review performed');
    expect(printable).toContain('Revisión realizada');
    expect(printable).toContain('Repeated analyses of the same normalized URL replace the previous result');
  });
});
