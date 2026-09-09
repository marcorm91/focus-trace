import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('FocusTrace DevTools DOM inspection contract', () => {
  it('reveals the selected finding in the native browser DOM inspector', () => {
    const main = source('entrypoints/sidepanel/main.tsx');

    expect(main).toContain('chrome?.devtools?.inspectedWindow');
    expect(main).toContain('document.querySelector(${JSON.stringify(selector)})');
    expect(main).toContain('inspect(element)');
    expect(main).toContain("'inspected'");
    expect(main).toContain("'not-found'");
    expect(main).toContain('event.stopPropagation()');
  });

  it('uses the eval callback form shared by Chromium and Firefox', () => {
    const main = source('entrypoints/sidepanel/main.tsx');

    expect(main).toContain('inspectedWindow.eval(devtoolsInspectExpression(selector), (result, exceptionInfo) => {');
    expect(main).toContain('Firefox does not implement eval options');
    expect(main).not.toContain('devtoolsInspectExpression(selector), {},');
  });

  it('keeps native DOM inspection scoped to DevTools while visual location remains available everywhere', () => {
    const main = source('entrypoints/sidepanel/main.tsx');
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');

    expect(main).toContain('if (inspectedTabId == null)');
    expect(main).toContain("target.closest('.finding-location > button')");
    expect(main).toContain('const inspectedWindow = devtoolsInspectedWindow();');
    expect(main).toContain('requestSurfacePageAccess()');
    expect(main).toContain('locateScanTargetInPage');
    expect(scan).toContain('disabled={!devtoolsSurface}');
    expect(scan).toContain('available from FocusTrace in DevTools');
    expect(scan).toContain('disponible desde FocusTrace en DevTools');
  });

  it('renders separate visual-highlight and native DOM-inspection controls without layout gaps', () => {
    const scan = source('entrypoints/sidepanel/views/ScanView.tsx');
    const css = source('entrypoints/sidepanel/element-location-actions.css');

    expect(scan).toContain("dataset.ftSurface === 'devtools'");
    expect(scan).toContain('finding-location-highlight-action');
    expect(scan).toContain('finding-location-inspect-action');
    expect(scan).toContain('data-ft-action="inspect-dom"');
    expect(scan).toContain('Highlight element visually on page');
    expect(scan).toContain('Destacar visualmente el elemento en la página');
    expect(scan).toContain('Inspect element in DOM');
    expect(scan).toContain('Inspeccionar elemento en el DOM');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) 44px 44px');
    expect(css).toContain('gap: 0;');
  });

  it('does not patch the React-rendered DOM to implement DevTools inspection', () => {
    const main = source('entrypoints/sidepanel/main.tsx');

    expect(main).not.toContain('MutationObserver');
    expect(main).not.toContain("setAttribute('aria-label'");
    expect(main).not.toContain('dataset.ftDevtoolsInspect');
  });
});
