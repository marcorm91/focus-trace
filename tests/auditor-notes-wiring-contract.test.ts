import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('auditor-note wiring contract', () => {
  it('serializes edits through the session owner and synchronizes static history copies', () => {
    const types = source('shared/types.ts');
    const background = source('entrypoints/background.ts');
    const app = source('entrypoints/sidepanel/App.tsx');

    expect(types).toContain("type: 'FOCUSTRACE_SAVE_AUDITOR_NOTE'");
    expect(background).toContain('updateSessionAuditorNote(current, message.target, message.text)');
    expect(background).toContain('updateFocusMemoryScanNotes(next.scan)');
    expect(background).toContain('updateStoredMultipageAuditScan(next.scan)');
    expect(app).toContain("{ kind: 'scan-finding', findingId }");
    expect(app).toContain("{ kind: 'runtime-event', eventId }");
  });

  it('offers add, edit and removal controls on static findings and Trace events', () => {
    const editor = source('entrypoints/sidepanel/components/AuditorNoteEditor.tsx');
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const runtime = source('entrypoints/sidepanel/views/RuntimeView.tsx');

    expect(editor).toContain("'Add auditor note', 'Añadir nota del auditor'");
    expect(editor).toContain("'Edit', 'Editar'");
    expect(editor).toContain("'Remove', 'Eliminar'");
    expect(editor).toContain('maxLength={MAX_AUDITOR_NOTE_LENGTH}');
    expect(scan).toContain('note={issue.auditorNote}');
    expect(runtime).toContain('note={event.auditorNote}');
  });

  it('includes notes in every applicable report and structured export surface', () => {
    const report = source('entrypoints/sidepanel/views/SessionReportView.tsx');
    const reportScan = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');
    const singlePrint = source('entrypoints/report-print/main.tsx');
    const auditPrint = source('entrypoints/audit-print/main.tsx');
    const textReport = source('lib/report/text-report.ts');
    const traceEvidence = source('lib/runtime/audit-evidence.ts');
    const memorySnapshot = source('entrypoints/sidepanel/components/focus-memory-snapshot.ts');

    expect(report).toContain('annotatedRuntimeEvents');
    expect(reportScan).toContain('issue.auditorNote.text');
    expect(singlePrint).toContain('issue.auditorNote.text');
    expect(singlePrint).toContain('event.auditorNote?.text');
    expect(auditPrint).toContain('issue.auditorNote.text');
    expect(textReport).toContain("'Auditor note', 'Nota del auditor'");
    expect(traceEvidence).toContain('schemaVersion: 2');
    expect(traceEvidence).toContain('auditorNote: event.auditorNote');
    expect(memorySnapshot).toContain('version: 2');
  });
});
