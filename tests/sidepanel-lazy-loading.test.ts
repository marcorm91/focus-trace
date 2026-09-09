import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('sidepanel workspace loading boundary', () => {
  it('loads each workspace through a React lazy boundary', () => {
    const app = source('entrypoints/sidepanel/App.tsx');
    for (const view of [
      'AuditReportWorkspace',
      'InstructionsView',
      'ScanView',
      'SettingsView',
      'StructureView',
      'TraceView',
    ]) {
      expect(app).toContain(`const ${view} = lazy(() => import('./views/${view}')`);
      expect(app).not.toContain(`import { ${view} } from './views/${view}'`);
    }
    expect(app).toContain('<Suspense fallback={<WorkspaceLoading language={language} />}>');
    expect(app).toContain('role="status"');
    expect(app).toContain('aria-live="polite"');
    expect(app).toContain('aria-busy="true"');
  });

  it('keeps view-specific styles behind their matching module boundary', () => {
    const index = source('entrypoints/sidepanel/index.css');
    const workspaces = {
      ScanView: 'scan-workspace.css',
      StructureView: 'structure-workspace.css',
      TraceView: 'trace-workspace.css',
      AuditReportWorkspace: 'report-workspace.css',
      InstructionsView: 'instructions-workspace.css',
      SettingsView: 'settings-workspace.css',
    } as const;

    for (const [view, stylesheet] of Object.entries(workspaces)) {
      expect(source(`entrypoints/sidepanel/views/${view}.tsx`)).toContain(`import './${stylesheet}';`);
    }
    expect(index).not.toContain("url('./views/session-report.css')");
    expect(index).not.toContain("url('./views/replay.css')");
    expect(index).not.toContain("url('./structure.css')");
    expect(index).not.toContain("url('./components/focus-memory.css')");
  });
});
