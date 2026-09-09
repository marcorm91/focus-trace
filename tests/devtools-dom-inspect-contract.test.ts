import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('FocusTrace DevTools DOM inspection contract', () => {
  it('reveals the selected finding in the native Elements panel', () => {
    const main = source('entrypoints/sidepanel/main.tsx');

    expect(main).toContain('chrome?.devtools?.inspectedWindow');
    expect(main).toContain('document.querySelector(${JSON.stringify(selector)})');
    expect(main).toContain('inspect(element)');
    expect(main).toContain("'inspected'");
    expect(main).toContain("'not-found'");
    expect(main).toContain('event.stopPropagation()');
  });

  it('keeps the action scoped to the DevTools surface and leaves the normal side panel locator intact', () => {
    const main = source('entrypoints/sidepanel/main.tsx');

    expect(main).toContain('if (inspectedTabId == null)');
    expect(main).toContain("target.closest('.finding-location > button')");
    expect(main).toContain('const inspectedWindow = devtoolsInspectedWindow();');
    expect(main).toContain('requestSurfacePageAccess()');
    expect(main).toContain('locateScanTargetInPage');
  });

  it('exposes an accurate bilingual accessible name for the DevTools action', () => {
    const main = source('entrypoints/sidepanel/main.tsx');

    expect(main).toContain('Inspect element in DOM');
    expect(main).toContain('Inspeccionar elemento en el DOM');
    expect(main).toContain("button.setAttribute('aria-label', label)");
    expect(main).toContain('button.title = label');
  });
});
