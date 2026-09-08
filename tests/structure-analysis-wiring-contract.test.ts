import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/App.tsx'), 'utf8');

describe('unified page and Structure analysis wiring', () => {
  it('collects semantic and metric Structure evidence during full-page analysis', () => {
    const scanStart = app.indexOf("type: 'FOCUSTRACE_RUN_SCAN'");
    const structureCollection = app.indexOf('func: collectStructureEvidenceInPage', scanStart);
    const memoryCollection = app.indexOf('collectFocusMemoryEvidence(tabId, result)', scanStart);

    expect(scanStart).toBeGreaterThan(-1);
    expect(structureCollection).toBeGreaterThan(scanStart);
    expect(memoryCollection).toBeGreaterThan(structureCollection);
    expect(app.slice(scanStart, memoryCollection)).toContain('setStructureSnapshot(nextStructure);');
  });

  it('keeps explicit Structure refresh available and avoids stale full-page structure for component scans', () => {
    expect(app.match(/func: collectStructureEvidenceInPage/g)).toHaveLength(2);
    const componentStart = app.indexOf('const runComponentScan');
    const locateStart = app.indexOf('const locateScanTarget', componentStart);
    expect(app.slice(componentStart, locateStart)).toContain('setStructureSnapshot(undefined);');
  });
});
