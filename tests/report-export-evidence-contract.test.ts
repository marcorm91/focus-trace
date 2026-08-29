import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('report export evidence contract', () => {
  it('captures every eligible visual evidence component without an arbitrary count cap', () => {
    const evidence = source('lib/report/visual-evidence.ts');

    expect(evidence).not.toContain('MAX_VISUAL_EVIDENCE');
    expect(evidence).not.toContain('eligible.slice(');
    expect(evidence).toContain('for (const component of eligible)');
    expect(evidence).toContain('return { visuals, limitReached: false };');
  });

  it('scales oversized evidence proportionally and constrains it again in print layout', () => {
    const evidence = source('lib/report/visual-evidence.ts');
    const css = source('entrypoints/report-print/visual-evidence.css');

    expect(evidence).toContain('MAX_CAPTURE_WIDTH_PX');
    expect(evidence).toContain('MAX_CAPTURE_HEIGHT_PX');
    expect(evidence).toContain('visualEvidenceOutputScale(sw, sh)');
    expect(evidence).toContain('Math.min(1, MAX_CAPTURE_WIDTH_PX / width, MAX_CAPTURE_HEIGHT_PX / height)');
    expect(css).toContain('max-width: 100%;');
    expect(css).toContain('max-height: 68mm;');
    expect(css).toContain('object-fit: contain;');
    expect(css).toContain('page-break-inside: avoid;');
    expect(css).toContain('overflow: hidden;');
  });

  it('opens additional export formats as an out-of-flow popover', () => {
    const css = source('entrypoints/sidepanel/views/report-export.css');

    expect(css).toContain('.report-more-formats {\n  position: relative;');
    expect(css).toContain('.report-format-options {\n  position: absolute;');
    expect(css).toContain('inset-block-start: calc(100% + 6px);');
    expect(css).toContain('z-index: 31;');
  });
});
