import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('FocusTrace DevTools panel contract', () => {
  it('registers a Chromium DevTools page and opens the canonical FocusTrace workspace', () => {
    const html = source('entrypoints/devtools/index.html');
    const main = source('entrypoints/devtools/main.ts');

    expect(html).toContain("['chrome', 'edge']");
    expect(html).toContain('./main.ts');
    expect(main).toContain("chrome?.devtools");
    expect(main).toContain('inspectedWindow.tabId');
    expect(main).toContain("'FocusTrace'");
    expect(main).toContain("'icon/16.png'");
    expect(main).toContain('sidepanel.html?focustraceTabId=');
    expect(main).not.toContain('devtools-panel.html');
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

  it('keeps the DevTools surface on the compact locator UI', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');

    expect(scan).toContain('className="finding-location"');
    expect(scan).not.toContain('TargetInspector');
    expect(scan).not.toContain('View HTML');
  });
});
