import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('FocusTrace DevTools panel contract', () => {
  it('registers a cross-browser DevTools page and opens the canonical FocusTrace workspace', () => {
    const html = source('entrypoints/devtools/index.html');
    const main = source('entrypoints/devtools/main.ts');

    expect(html).toContain("['chrome', 'edge', 'firefox']");
    expect(html).toContain('./main.ts');
    expect(main).toContain("chrome?.devtools");
    expect(main).toContain('inspectedWindow.tabId');
    expect(main).toContain("'FocusTrace'");
    expect(main).toContain("'icon/16.png'");
    expect(main).toContain('sidepanel.html?focustraceTabId=');
    expect(main).not.toContain('devtools-panel.html');
  });

  it('keeps Firefox DevTools opt-in while preserving the regular sidebar', () => {
    const config = source('wxt.config.ts');
    const settings = source('entrypoints/sidepanel/views/SettingsView.tsx');
    const firefoxSettings = source('entrypoints/sidepanel/components/FirefoxDevtoolsSettings.tsx');
    const validator = source('tools/validate-browser-builds.mjs');

    expect(config).toContain("'devtools'");
    expect(config).toContain('optional_permissions: FIREFOX_115_OPTIONAL_PERMISSIONS');
    expect(settings).toContain('<FirefoxDevtoolsSettings language={language} />');
    expect(firefoxSettings).toContain("permissions.contains({ permissions: ['devtools'] })");
    expect(firefoxSettings).toContain("permissions.request({ permissions: ['devtools'] })");
    expect(firefoxSettings).toContain("'Enable DevTools integration', 'Activar integración DevTools'");
    expect(validator).toContain("firefox.devtools_page === 'devtools.html'");
    expect(validator).toContain("firefox.sidebar_action?.default_panel === 'sidepanel.html'");
  });

  it('pins the shared sidepanel workspace to the inspected DevTools tab', () => {
    const bootstrap = source('entrypoints/sidepanel/main.tsx');
    const session = source('entrypoints/sidepanel/hooks/useSidepanelSession.ts');
    const css = source('entrypoints/sidepanel/devtools-surface.css');

    expect(bootstrap).toContain("get('focustraceTabId')");
    expect(bootstrap).toContain("dataset.ftSurface = 'devtools'");
    expect(bootstrap).toContain('requestTabPageAccess(inspectedTabId)');
    expect(bootstrap).toContain('if (inspectedTabId == null)');
    expect(bootstrap).toContain('syncBreakpointPreferencesToTab(inspectedTabId');

    expect(session).toContain("get('focustraceTabId')");
    expect(session).toContain('if (inspectedTabId != null)');
    expect(session).toContain('void selectTab(inspectedTabId).catch(onError)');
    expect(session).toContain('if (inspectedTabId != null) return;');

    expect(css).toContain("html[data-ft-surface='devtools'] .app-shell");
    expect(css).toContain('max-width: none;');
  });

  it('keeps the compact locator UI with separate visual and DOM actions on every surface', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const css = source('entrypoints/sidepanel/element-location-actions.css');

    expect(scan).toContain('className="finding-location finding-location-dual-actions"');
    expect(scan).toContain('finding-location-highlight-action');
    expect(scan).toContain('finding-location-inspect-action');
    expect(scan).toContain('data-ft-action="inspect-dom"');
    expect(scan).toContain('disabled={!devtoolsSurface}');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) 44px 44px');
    expect(css).toContain('gap: 0;');
    expect(scan).not.toContain('TargetInspector');
    expect(scan).not.toContain('View HTML');
  });
});
