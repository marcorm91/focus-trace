import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('FocusTrace Memory resolved finding UI', () => {
  it('offers an explicit checkbox only for findings no longer reproduced', () => {
    const component = source('entrypoints/sidepanel/components/FocusMemorySummary.tsx');
    const history = source('entrypoints/sidepanel/components/FocusMemoryHistory.tsx');
    const css = source('entrypoints/sidepanel/components/focus-memory.css');

    expect(history).toContain("item.state === 'resolved'");
    expect(history).toContain('type="checkbox"');
    expect(history).toContain("'Mark as resolved', 'Marcar como solucionado'");
    expect(component).toContain('memory.resolveFinding(item.fingerprint, item.ruleId)');
    expect(history).toContain('keeps only a minimal fingerprint');
    expect(css).toContain('.focus-memory-resolve');
    expect(css).toContain(".focus-memory-resolve input[type='checkbox']");
  });

  it('clears resolved markers together with normal Memory history', () => {
    const storage = source('lib/focus-memory/storage.ts');

    expect(storage).toContain('FOCUS_MEMORY_RESOLVED_STORAGE_KEY');
    expect(storage).toContain('markFocusMemoryFindingResolved');
    expect(storage).toContain('archiveResolvedFinding');
    expect(storage).toContain('applyResolvedFindingMemory');
    expect(storage).toContain('browser.storage.local.remove([');
  });
});
