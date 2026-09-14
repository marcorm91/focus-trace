import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function source(file: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
}

describe('saved user-flow regression UI contract', () => {
  it('keeps the saved-flow panel mounted inside Replay even when the current Trace is cleared', () => {
    const trace = source('entrypoints/sidepanel/views/TraceView.tsx');
    expect(trace).toContain("hidden={mode !== 'replay'}");
    expect(trace).toContain('<SavedFlowRegressionPanel');
    expect(trace.indexOf('<SavedFlowRegressionPanel')).toBeGreaterThan(trace.indexOf("hidden={mode !== 'replay'}"));
  });

  it('exposes local save, run, delete and manual-stop cancellation controls', () => {
    const panel = source('entrypoints/sidepanel/views/SavedFlowRegressionPanel.tsx');
    expect(panel).toContain("'Save current Trace'");
    expect(panel).toContain("'Run saved regression'");
    expect(panel).toContain("'Delete flow'");
    expect(panel).toContain("'Delete all'");
    expect(panel).toContain("'Manual stop required'");
    expect(panel).toContain("'Cancel replay'");
    expect(panel).toContain('aria-live="polite"');
  });

  it('documents all six regression states in the product model', () => {
    const model = source('lib/runtime/saved-flow.ts');
    for (const state of ['new', 'resolved', 'persistent', 'changed', 'missing-element', 'broken-flow']) {
      expect(model).toContain(`'${state}'`);
    }
    expect(model).toContain('complete = true');
  });

  it('bounds persistent flow storage and supports lifecycle deletion', () => {
    const storage = source('lib/runtime/saved-flow-storage.ts');
    expect(storage).toContain('MAX_SAVED_FLOWS = 20');
    expect(storage).toContain('MAX_SAVED_FLOW_STEPS');
    expect(storage).toContain('MAX_SAVED_FLOW_FINDINGS');
    expect(storage).toContain('deleteSavedUserFlow');
    expect(storage).toContain('clearSavedUserFlows');
  });
});
