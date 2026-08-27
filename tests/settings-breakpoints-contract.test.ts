import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Trace breakpoint settings contract', () => {
  it('keeps breakpoint configuration in Settings with explanatory subtitles', () => {
    const settings = source('entrypoints/sidepanel/views/SettingsView.tsx');
    const css = source('entrypoints/sidepanel/breakpoint-settings.css');

    expect(settings).toContain("tr(language, 'Accessibility breakpoints', 'Breakpoints de accesibilidad')");
    expect(settings).toContain('RUNTIME_BREAKPOINTS.map');
    expect(settings).toContain('BREAKPOINT_SUBTITLES');
    expect(settings).toContain('settings-breakpoint-option');
    expect(css).toContain('.breakpoint-panel');
    expect(css).toContain('display: none;');
  });

  it('persists breakpoint preferences and reapplies them when the active tab changes', () => {
    const settings = source('entrypoints/sidepanel/views/SettingsView.tsx');
    const main = source('entrypoints/sidepanel/main.tsx');

    expect(settings).toContain('RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY');
    expect(settings).toContain("type: 'FOCUSTRACE_SAVE_BREAKPOINTS'");
    expect(main).toContain('browser.tabs.onActivated.addListener');
    expect(main).toContain('syncBreakpointPreferencesToTab');
    expect(main).toContain('RUNTIME_BREAKPOINT_SETTINGS_STORAGE_KEY');
  });
});
