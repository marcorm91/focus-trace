import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

describe('finding Recheck UI contract', () => {
  it('keeps the static finding action keyboard native and announces recheck status', () => {
    const report = source('entrypoints/sidepanel/components/ReportScanCompact.tsx');

    expect(report).toContain("type=\"button\"");
    expect(report).toContain("'Recheck finding'");
    expect(report).toContain('aria-describedby={latestRecheck || live?.error');
    expect(report).toContain('role="status"');
    expect(report).toContain('aria-live="polite"');
    expect(report).toContain('The original finding remains unchanged in this report');
  });

  it('keeps runtime target recheck conservative and announced without rewriting the event', () => {
    const runtime = source('entrypoints/sidepanel/views/RuntimeView.tsx');
    const model = source('lib/runtime/runtime-finding-recheck.ts');

    expect(runtime).toContain("'Recheck runtime target'");
    expect(runtime).toContain('role="status"');
    expect(runtime).toContain('aria-live="polite"');
    expect(runtime).toContain('The original runtime event is preserved');
    expect(model).toContain("state: 'inconclusive'");
    expect(model).toContain('Replay the original interaction');
  });

  it('loads responsive Recheck styles through the canonical sidepanel cascade', () => {
    const cascade = source('entrypoints/sidepanel/index.css');
    const staticCss = source('entrypoints/sidepanel/audit.css');
    const runtimeCss = source('entrypoints/sidepanel/views/runtime-recheck.css');

    expect(cascade).toContain("@import url('./views/runtime-recheck.css') layer(components);");
    expect(staticCss).toContain('.report-rule-target-actions > button');
    expect(staticCss).toContain('@media (max-width: 480px)');
    expect(runtimeCss).toContain('.runtime-finding-recheck > button');
    expect(runtimeCss).toContain('@media (forced-colors: active)');
  });
});
