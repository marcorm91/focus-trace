import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/App.tsx'), 'utf8');
const scanView = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/views/ScanView.tsx'), 'utf8');
const runtime = readFileSync(resolve(process.cwd(), 'entrypoints/runtime.content.ts'), 'utf8');

describe('guided 200% text-resize workflow', () => {
  it('reads browser zoom, captures a 100% reference and sends it into page analysis', () => {
    expect(app).toContain('browser.tabs.getZoom(tabId)');
    expect(app).toContain("type: 'FOCUSTRACE_CAPTURE_TEXT_RESIZE_BASELINE'");
    expect(app).toContain('textResizeBaseline = session.textResizeBaseline');
    expect(app).toContain('baseline: textResizeBaseline');
  });

  it('keeps baseline capture in the inspected page runtime', () => {
    expect(runtime).toContain("message.type === 'FOCUSTRACE_CAPTURE_TEXT_RESIZE_BASELINE'");
    expect(runtime).toContain('captureTextResizeBaseline(message.zoomFactor)');
    expect(runtime).toContain('runFocusTraceScan(message.scope, message.textResize)');
  });

  it('presents the 100% and 200% steps without claiming conformance', () => {
    expect(scanView).toContain('200% text resize check');
    expect(scanView).toContain('Set browser zoom to 200% and analyze this page again.');
    expect(scanView).toContain('check intermediate zoom steps manually');
  });
});
