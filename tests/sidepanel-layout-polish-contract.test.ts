import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('sidepanel layout polish contract', () => {
  it('lays out the four quick actions as 2x2 and collapses to one column', () => {
    const css = source('entrypoints/sidepanel/workspace-layout.css');

    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(css).toContain('.quick-actions .component-scan-action { order: 1; }');
    expect(css).toContain('.quick-actions .scan-action { order: 2; }');
    expect(css).toContain('.quick-actions .site-audit-launch { order: 3; }');
    expect(css).toContain('.quick-actions .focus-walk-action { order: 4; }');
    expect(css).toContain('@media (max-width: 430px)');
    expect(css).toContain('grid-template-columns: 1fr;');
  });

  it('keeps component context compact and removes duplicated actions from the rendered layout', () => {
    const css = source('entrypoints/sidepanel/component-scan.css');

    expect(css).toContain(":has(.scan-scope-banner) #scan-title + p");
    expect(css).toContain('.scan-scope-copy strong');
    expect(css).toContain('.scan-scope-actions button + button');
    expect(css).toContain('align-items: start;');
    expect(css).toContain('align-self: start;');
  });

  it('uses the danger palette for heading hierarchy signals and gives the signal badge more emphasis', () => {
    const css = source('entrypoints/sidepanel/heading-tree-visual.css');

    expect(css).toContain('.heading-tree-row.has-signal .heading-level');
    expect(css).toContain('background: var(--ft-danger-soft);');
    expect(css).toContain('color: var(--ft-danger);');
    expect(css).toContain('box-shadow: inset 4px 0 0 var(--ft-danger);');
    expect(css).toContain('font-size: 9.5px;');
    expect(css).not.toContain('!important');
  });

  it('presents summary metrics as flat information instead of button-like cards', () => {
    const css = source('entrypoints/sidepanel/information-summaries.css');
    const entry = source('entrypoints/sidepanel/main.tsx');

    expect(entry).toContain("import './information-summaries.css';");
    expect(css).toContain('.report-scoreline > div');
    expect(css).toContain('.focus-journey-summary > span');
    expect(css).toContain('.heading-outline-summary > span');
    expect(css).toContain('.report-coverage > div');
    expect(css).toContain('.metric,');
    expect(css).toContain('border: 0;');
    expect(css).toContain('border-radius: 0;');
    expect(css).toContain('background: transparent;');
    expect(css).toContain('box-shadow: none;');
    expect(css).toContain('cursor: default;');
    expect(css).toContain('.report-inline-summary > span');
    expect(css).toContain('.report-category-summary > span');
    expect(css).not.toContain(':hover');
    expect(css).not.toContain('cursor: pointer');
    expect(css).not.toContain('!important');
  });
});
