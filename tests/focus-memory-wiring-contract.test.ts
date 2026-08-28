import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('FocusTrace Memory wiring contract', () => {
  it('records eligible Memory observations when scans are saved, not when a view renders', () => {
    const background = source('entrypoints/background.ts');
    const hook = source('entrypoints/sidepanel/hooks/useFocusTraceMemory.ts');

    expect(background).toContain('recordFocusMemoryScan(message.scan)');
    expect(hook).toContain('readFocusMemoryForScan(scan)');
    expect(hook).not.toContain('recordFocusMemoryObservation');
    expect(hook).not.toContain('browser.storage.local.set');
  });

  it('keeps history deletion available from Settings independently of the opt-in checkbox', () => {
    const settings = source('entrypoints/sidepanel/components/FocusMemorySettings.tsx');

    expect(settings).toContain('clearFocusMemoryHistory');
    expect(settings).toContain("tr(language, 'Clear saved history', 'Borrar historial guardado')");
    expect(settings).toContain('disabled={!ready || !hasHistory}');
  });
});
