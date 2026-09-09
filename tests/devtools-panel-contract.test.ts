import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('FocusTrace DevTools panel contract', () => {
  it('registers a Chromium DevTools page and a FocusTrace panel', () => {
    const html = source('entrypoints/devtools/index.html');
    const main = source('entrypoints/devtools/main.ts');

    expect(html).toContain("['chrome', 'edge']");
    expect(html).toContain('./main.ts');
    expect(main).toContain("chrome?.devtools");
    expect(main).toContain('inspectedWindow.tabId');
    expect(main).toContain("'FocusTrace'");
    expect(main).toContain("'icon/16.png'");
    expect(main).toContain('devtools-panel.html?focustraceTabId=');
  });

  it('mounts the shared FocusTrace workspace against the inspected tab', () => {
    const html = source('entrypoints/devtools-panel/index.html');
    const main = source('entrypoints/devtools-panel/main.tsx');
    const session = source('entrypoints/sidepanel/hooks/useSidepanelSession.ts');

    expect(html).toContain("['chrome', 'edge']");
    expect(main).toContain("new URLSearchParams(window.location.search).get('focustraceTabId')");
    expect(main).toContain('requestTabPageAccess(inspectedTabId)');
    expect(main).toContain("document.documentElement.dataset.ftSurface = 'devtools'");
    expect(main).toContain('<App />');

    expect(session).toContain("get('focustraceTabId')");
    expect(session).toContain('if (inspectedTabId != null)');
    expect(session).toContain('void selectTab(inspectedTabId).catch(onError)');
    expect(session).toContain('if (inspectedTabId != null) return;');
  });

  it('keeps the DevTools surface on the compact locator UI', () => {
    const panel = source('entrypoints/devtools-panel/main.tsx');
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');

    expect(panel).not.toContain('TargetInspector');
    expect(scan).toContain('className="finding-location"');
    expect(scan).not.toContain('TargetInspector');
  });
});
