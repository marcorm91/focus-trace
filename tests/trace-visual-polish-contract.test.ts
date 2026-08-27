import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Trace visual polish contract', () => {
  it('keeps impact labels contained and uses sentence-case severity labels', () => {
    const matrix = source('entrypoints/sidepanel/components/impact-matrix.css');
    const severity = source('entrypoints/sidepanel/severity.css');

    expect(matrix).toContain('min-width: 0;');
    expect(matrix).toContain('overflow-wrap: anywhere;');
    expect(matrix).toContain('text-transform: capitalize;');
    expect(matrix).not.toContain('min-width: 360px;');
    expect(severity).toContain('.scan-severity-filter button > span');
    expect(severity).toContain('text-transform: capitalize;');
  });

  it('keeps the Trace hero concise and action-led', () => {
    const view = source('entrypoints/sidepanel/views/TraceView.tsx');
    const css = source('entrypoints/sidepanel/views/trace-polish.css');

    expect(view).toContain("'Trace real interactions', 'Traza interacciones reales'");
    expect(view).toContain("'Recording. Return to the page and interact normally.'");
    expect(view).not.toContain('Runtime accessibility debugger');
    expect(view).not.toContain('Trace what happened, not only what failed');
    expect(css).toContain('.trace-hero-actions');
    expect(css).toContain('justify-content: flex-start;');
  });

  it('uses the shared SVG-mask icon language for Trace modes', () => {
    const icons = source('entrypoints/sidepanel/modern-icons.css');
    const css = source('entrypoints/sidepanel/views/trace-polish.css');

    expect(icons).toContain('--ft-i-replay');
    expect(icons).toContain('--ft-i-journey');
    expect(icons).toContain('--ft-i-interactions');
    expect(icons).toContain('--ft-i-graph');
    expect(icons).toContain('.trace-mode-switcher .trace-tab-icon::before');
    expect(css).toContain('min-height: 46px;');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(css).not.toContain('!important');
  });

  it('gives the report context line padding and wrapping room', () => {
    const css = source('entrypoints/sidepanel/views/session-report.css');

    expect(css).toContain('.report-context-line {');
    expect(css).toContain('padding: 9px 10px;');
    expect(css).toContain('flex: 1 1 220px;');
    expect(css).toContain('overflow-wrap: anywhere;');
  });
});
