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

  it('uses the shared Empty component for Report and exposes themed audit PDF export', () => {
    const report = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/AuditReportWorkspace.tsx'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/audit.css'), 'utf8');
    expect(report).toContain("import { Empty } from '../components/Common';");
    expect(report).toContain('<Empty');
    expect(report).not.toContain('report-empty-state');
    expect(report).not.toContain('report-empty-panel');
    expect(report).toContain('Todavía no hay datos de análisis');
    expect(report).toContain('Exportar auditoría PDF completa');
    expect(report).toContain('Revisión realizada');
    expect(css).not.toContain('.report-empty-state');
    expect(css).not.toContain('.report-empty-panel');
    expect(css).toContain('.export-audit-report {');
    expect(css).toContain('box-shadow: var(--ft-shadow-sm);');
    expect(css).toContain('border: 1.5px solid var(--ft-border, CanvasText);');
  });

  it('keeps one saved report expanded, preserves historical export and never mixes live page actions into history', () => {
    const workspace = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/AuditReportWorkspace.tsx'), 'utf8');
    const report = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/SessionReportView.tsx'), 'utf8');
    const compact = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/components/ReportScanCompact.tsx'), 'utf8');

    expect(workspace).toContain('const [openPageKey, setOpenPageKey] = useState<string>();');
    expect(workspace).toContain('const open = openPageKey === page.key;');
    expect(workspace).toContain('livePage={active}');
    expect(workspace).toContain("className={`audit-page-report${active ? ' is-current' : ' is-history'}`}");
    expect(workspace).toContain('events={active ? events : []}');
    expect(workspace).toContain('structureSnapshot={active ? structureSnapshot : undefined}');
    expect(workspace).toContain('savedVisualEvidence={page.visualEvidence}');
    expect(report).toContain('livePage = true');
    expect(report).toContain('buildReportComponentIndex(scan, events, [])');
    expect(report).toContain('session: {');
    expect(report).toContain('savedVisualEvidence?.visuals');
    expect(report).toContain('onLocate={livePage ? onLocate : undefined}');
    expect(report).toContain('Historical Trace unavailable');
    expect(report).toContain('Historical Structure unavailable');
    expect(compact).not.toContain('requestActivePageAccess');
    expect(compact).not.toContain('locateScanTargetInPage');
    expect(compact).toContain('{onLocate && (');
  });

  it('deletes saved page reports and explains page-by-page audit image capture', () => {
    const workspace = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/AuditReportWorkspace.tsx'), 'utf8');
    const report = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/SessionReportView.tsx'), 'utf8');
    const hook = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/hooks/useMultipageAudit.ts'), 'utf8');
    const storage = readFileSync(resolve(process.cwd(), 'lib/audit/multipage-audit-storage.ts'), 'utf8');

    expect(report).toContain('Delete saved report');
    expect(report).toContain('Eliminar informe guardado');
    expect(report).toContain('className="delete-saved-report"');
    expect(workspace).toContain('onDeletePage(audit.id, pageKey)');
    expect(workspace).not.toContain('Include saved images');
    expect(workspace).not.toContain('Incluir imágenes guardadas');
    expect(workspace).toContain('Las imágenes de la auditoría completa se guardan página a página.');
    expect(workspace).toContain('storeAuditPrintEvidence(audit)');
    expect(hook).toContain('deleteMultipageAuditPage');
    expect(storage).toContain('removeAuditPage(current, auditId, pageKey)');
  });

  it('clears saved audits and reports when starting over', () => {
    const app = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/App.tsx'), 'utf8');
    const hook = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/hooks/useMultipageAudit.ts'), 'utf8');
    const storage = readFileSync(resolve(process.cwd(), 'lib/audit/multipage-audit-storage.ts'), 'utf8');

    expect(app).toContain('await clearAuditHistory()');
    expect(app).toContain('todas las auditorías e informes guardados');
    expect(hook).toContain('clearMultipageAudits');
    expect(storage).toContain('browser.storage.local.remove(MULTIPAGE_AUDIT_STORAGE_KEY)');
  });

  it('stores bounded visual evidence per review and bounds the complete audit store', () => {
    const hook = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/hooks/useMultipageAudit.ts'), 'utf8');
    const printable = readFileSync(resolve(process.cwd(), 'entrypoints/audit-print/main.tsx'), 'utf8');
    const storage = readFileSync(resolve(process.cwd(), 'lib/audit/multipage-audit-storage.ts'), 'utf8');

    expect(hook).toContain('captureReportVisualEvidence');
    expect(hook).toContain('MAX_AUDIT_VISUALS_PER_REVIEW = 3');
    expect(storage).toContain('MAX_VISUALS_PER_PAGE = 3');
    expect(storage).toContain('MAX_VISUAL_DATA_CHARS = 3_000_000');
    expect(storage).toContain('MAX_AUDIT_STORE_CHARS = 4_500_000');
    expect(storage).toContain('trimAuditHistoryToBudget');
    expect(storage).toContain('oldestInactiveIndex');
    expect(storage).toContain('pages: audit.pages.slice(1)');
    expect(storage).toContain('storageTrimmed: true');
    expect(printable).toContain('page.visualEvidence?.visuals');
    expect(printable).toContain('print-visual-evidence');
    expect(printable).not.toContain('No se pudo capturar evidencia visual para esta revisión');
  });

  it('renders audit pages through a dedicated printable entrypoint', () => {
    const printable = readFileSync(resolve(process.cwd(), 'entrypoints/audit-print/main.tsx'), 'utf8');
    expect(printable).toContain('audit.pages.map');
    expect(printable).toContain('Review performed');
    expect(printable).toContain('Revisión realizada');
    expect(printable).toContain('Repeated analyses of the same normalized URL replace the previous result');
    expect(printable).toContain('Audit index');
    expect(printable).toContain('Índice de la auditoría');
    expect(printable).toContain("id={`audit-page-${index + 1}-${group.id}`}");
    expect(printable).toContain('measuredPrintPageNumbers');
    expect(printable).toContain('audit-print-toc-leader');
    expect(printable).not.toContain('<span>{section.count}</span>');
  });

  it('uses flat report metrics, compact accordions and no accordion hover fill', () => {
    const auditCss = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/audit.css'), 'utf8');
    const accordionCss = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/report-accordion.css'), 'utf8');

    expect(auditCss).toContain('.audit-overview-metrics span::before');
    expect(auditCss).toContain('padding: 12px;');
    expect(auditCss).not.toContain('.audit-page-summary:hover');
    expect(accordionCss).toContain('padding: 8px 10px;');
    expect(accordionCss).toContain('padding: 0;');
    expect(accordionCss).not.toContain('.report-accordion-summary:hover');
  });

  it('keeps saved-report chrome minimal and formats the printable audit summary', () => {
    const workspace = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/AuditReportWorkspace.tsx'), 'utf8');
    const auditCss = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/audit.css'), 'utf8');
    const exportCss = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/report-export.css'), 'utf8');
    const printCss = readFileSync(resolve(process.cwd(), 'entrypoints/audit-print/index.css'), 'utf8');

    expect(workspace).not.toContain('Open a reviewed page to inspect its saved report.');
    expect(workspace).not.toContain('Abre una página revisada para consultar su informe guardado.');
    expect(auditCss).toContain('border: 1px solid var(--ft-border, CanvasText);');
    expect(auditCss).toContain('.audit-page-report.is-current {\n  border-color: var(--ft-border, CanvasText);\n  box-shadow: none;');
    expect(exportCss).toContain('.audit-page-report-body .trace-first-report > .report-hero');
    expect(exportCss).toContain('box-shadow: none;');
    expect(exportCss).not.toContain('border-bottom: 1px solid var(--ft-border-soft);');
    expect(exportCss).toContain('.audit-page-report-body .report-visual-evidence-option {\n  justify-self: end;');
    expect(exportCss).toContain('.report-more-formats > summary,\n.report-export-actions .delete-saved-report {\n  box-shadow: var(--ft-shadow-sm);');
    const sessionCss = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/session-report.css'), 'utf8');
    const emptyCss = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/empty-state-consistency.css'), 'utf8');
    expect(sessionCss).toContain('.report-section > .notice,\n.report-section > .report-pending {\n  margin-block: 8px;');
    expect(sessionCss).toContain('.report-section > .notice {\n  border-block-end: 0;');
    expect(emptyCss).toContain('.focus-empty-state,\n.report-pending,');
    expect(printCss).toContain('.audit-print-summary {');
    expect(printCss).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(printCss).toContain('.audit-print-summary > div + div');
  });
});
