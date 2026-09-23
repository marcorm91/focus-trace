import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('scan preferences settings contract', () => {
  it('exposes a persistent iframe-content toggle in Settings', () => {
    const settings = source('entrypoints/sidepanel/views/SettingsView.tsx');
    const preferences = source('shared/scan-preferences.ts');

    expect(settings).toContain("tr(language, 'Ignore iframe contents', 'Ignorar contenido de iframes')");
    expect(settings).toContain('SCAN_PREFERENCES_STORAGE_KEY');
    expect(settings).toContain('ignoreIframeContents');
    expect(preferences).toContain('ignoreIframeContents: false');
  });

  it('sends the current preference with full-page and component scan requests', () => {
    const app = source('entrypoints/sidepanel/App.tsx');
    const runtime = source('entrypoints/runtime.content.ts');
    const scan = source('lib/audit/scan.ts');

    expect(app).toContain('currentScanPreferences');
    expect(app).toContain('preferences,');
    expect(runtime).toContain('message.preferences');
    expect(scan).toContain('includeFrameContents: !normalizedPreferences.ignoreIframeContents');
  });
});
