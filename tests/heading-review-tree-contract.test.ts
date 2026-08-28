import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('heading review and tree UX', () => {
  it('shows the full affected heading in Review without ellipsis truncation', () => {
    const guidance = source('entrypoints/sidepanel/components/FindingGuidance.tsx');
    const guidanceCss = source('entrypoints/sidepanel/components/finding-guidance.css');
    const scanCss = source('entrypoints/sidepanel/scan-accordion.css');

    expect(guidance).toContain("const HEADING_JUMP_RULE_ID = 'FT-REVIEW-002'");
    expect(guidance).toContain("document.querySelector(selector)");
    expect(guidance).toContain('finding-heading-context');
    expect(guidance).toContain("tr(language, 'Affected heading', 'Encabezado afectado')");
    expect(guidance).toContain("element.textContent?.replace(/\\s+/g, ' ').trim()");
    expect(guidanceCss).toContain('.finding-heading-context strong');
    expect(guidanceCss).toContain('overflow-wrap: anywhere;');
    expect(guidanceCss).toContain('white-space: normal;');

    const locationRule = scanCss.slice(scanCss.indexOf('.finding-location code'), scanCss.indexOf('.finding-location > button'));
    expect(locationRule).not.toContain('text-overflow: ellipsis');
    expect(locationRule).not.toContain('white-space: nowrap');
    expect(locationRule).toContain('overflow-wrap: anywhere;');
    expect(locationRule).toContain('white-space: normal;');
  });

  it('builds independent heading branches collapsed by default and exposes global controls', () => {
    const view = source('entrypoints/sidepanel/views/HeadingTreeView.tsx');
    const css = source('entrypoints/sidepanel/heading-tree-visual.css');

    expect(view).toContain('function buildHeadingForest');
    expect(view).toContain('const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set(collapsibleIds))');
    expect(view).toContain('setCollapsedIds(new Set(collapsibleIds))');
    expect(view).toContain('aria-expanded={hasChildren ? expanded : undefined}');
    expect(view).toContain('className="heading-branch-toggle"');
    expect(view).toContain("'Expand all', 'Expandir todo'");
    expect(view).toContain("'Collapse all', 'Contraer todo'");
    expect(view).toContain('role="group"');
    expect(view).not.toContain('className="heading-selection"');

    expect(css).toContain('.heading-tree-branch');
    expect(css).toContain('.heading-tree-children');
    expect(css).toContain('.heading-branch-toggle');
    expect(css).not.toContain('text-overflow: ellipsis');
  });

  it('indents by real tree depth instead of the H1-H6 rank', () => {
    const view = source('entrypoints/sidepanel/views/HeadingTreeView.tsx');
    const css = source('entrypoints/sidepanel/heading-tree-visual.css');

    expect(view).toContain('depth: number;');
    expect(view).toContain("const rowStyle = { '--heading-depth': depth } as CSSProperties;");
    expect(view).toContain('aria-level={depth + 1}');
    expect(view).toContain('depth={depth + 1}');
    expect(view).toContain('depth={0}');
    expect(css).toContain('padding-inline-start: calc(var(--heading-depth) * 10px);');
    expect(css).not.toContain('.heading-tree-row.level-2 { --heading-depth: 1; }');
  });

  it('uses a neutral level gradient, semibold labels and compact left branch toggles', () => {
    const css = source('entrypoints/sidepanel/heading-tree-visual.css');
    const view = source('entrypoints/sidepanel/views/HeadingTreeView.tsx');

    expect(css).toContain('--heading-level-tone:');
    expect(css).toContain('.heading-tree-row.level-6');
    expect(css).toContain('font-weight: 600;');
    expect(css).toContain('grid-template-columns: 22px 32px minmax(0, 1fr);');
    expect(css).toContain('width: 22px;');
    expect(view).toContain('className="heading-branch-toggle-spacer"');
    expect(view.indexOf('className="heading-branch-toggle"')).toBeLessThan(view.indexOf('className="heading-level"'));
  });
});
