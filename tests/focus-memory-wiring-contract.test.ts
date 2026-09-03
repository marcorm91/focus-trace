import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('FocusTrace Memory wiring contract', () => {
  it('records eligible Memory observations and evidence when scans are saved, not when a view renders', () => {
    const background = source('entrypoints/background.ts');
    const app = source('entrypoints/sidepanel/App.tsx');
    const evidence = source('lib/focus-memory/visual-evidence.ts');
    const hook = source('entrypoints/sidepanel/hooks/useFocusTraceMemory.ts');

    expect(background).toContain('recordFocusMemoryScan(message.scan, message.memoryEvidence)');
    expect(app).toContain('collectFocusMemoryEvidence(tabId, result)');
    expect(app).toContain('memoryEvidence,');
    expect(evidence).toContain('focusMemorySettingsState()');
    expect(evidence).toContain('browser.tabs.captureVisibleTab');
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

  it('documents local previews and selector fallback only when Memory is enabled in Instructions', () => {
    const instructions = source('entrypoints/sidepanel/views/InstructionsView.tsx');
    const settings = source('entrypoints/sidepanel/components/FocusMemorySettings.tsx');

    expect(instructions).toContain('const [memoryEnabled, setMemoryEnabled] = useState(false);');
    expect(instructions).toContain('{memoryEnabled && (');
    expect(instructions).toContain("'Local visual evidence:', 'Evidencia visual local:'");
    expect(instructions).toContain('CSS selector');
    expect(settings).toContain('small screenshot crop');
    expect(settings).toContain('selector CSS');
  });
});
