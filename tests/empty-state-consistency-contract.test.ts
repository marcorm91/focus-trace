import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('neutral empty-state consistency', () => {
  it('loads one policy after view-specific styles', () => {
    const index = source('entrypoints/sidepanel/index.css');
    const buttonPolicy = index.indexOf("@import url('./button-affordance-followup.css') layer(policy);");
    const emptyPolicy = index.indexOf("@import url('./empty-state-consistency.css') layer(policy);");

    expect(buttonPolicy).toBeGreaterThan(-1);
    expect(emptyPolicy).toBeGreaterThan(buttonPolicy);
  });

  it('uses the same frame and typography for shared Empty, Trace and neutral no-result notices', () => {
    const css = source('entrypoints/sidepanel/empty-state-consistency.css');

    expect(css).toContain('.empty,');
    expect(css).toContain('.focus-empty-state,');
    expect(css).toContain('.notice:not(.structure-limit-note)');
    expect(css).toContain('border: 1.5px dashed var(--ft-border-soft);');
    expect(css).toContain('padding: 34px 16px;');
    expect(css).toContain('text-align: center;');
    expect(css).toContain('font-size: 17px;');
    expect(css).toContain('max-width: 300px;');
  });

  it('keeps informational and safety notices outside the empty-state treatment', () => {
    const css = source('entrypoints/sidepanel/empty-state-consistency.css');
    const structure = source('entrypoints/sidepanel/views/StructureView.tsx');

    for (const className of [
      'structure-limit-note',
      'about-support',
      'about-privacy',
      'settings-note',
      'graph-scope-note',
      'instructions-note',
    ]) {
      expect(css).toContain(`:not(.${className})`);
    }
    expect(structure).toContain('notice structure-limit-note');
    expect(css).toContain('.notice.structure-limit-note {');
    expect(css).toContain('min-height: 0;');
    expect(css).toContain('text-align: left;');
  });

  it('covers the existing neutral no-data and no-result surfaces', () => {
    const focus = source('entrypoints/sidepanel/views/FocusView.tsx');
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const headings = source('entrypoints/sidepanel/views/HeadingTreeView.tsx');
    const structure = source('entrypoints/sidepanel/views/StructureView.tsx');
    const report = source('entrypoints/sidepanel/views/SessionReportView.tsx');
    const auditReport = source('entrypoints/sidepanel/views/AuditReportWorkspace.tsx');

    expect(focus).toContain('focus-empty-state');
    expect(scan).toContain('No automated findings');
    expect(headings).toContain('No exposed headings');
    expect(structure).toContain('No semantic opportunities found');
    expect(report).toContain('Structure metrics not generated');
    expect(auditReport).toContain('<Empty');
    expect(auditReport).not.toContain('report-empty-panel');
    expect(auditReport).not.toContain('report-empty-state');
  });
});
