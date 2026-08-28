import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('requested FocusTrace UI polish', () => {
  it('keeps quick actions neutral, semibold and in the requested order', () => {
    const css = source('entrypoints/sidepanel/requested-polish.css');
    const finalCss = source('entrypoints/sidepanel/memory-walkthrough-polish.css');
    const app = source('entrypoints/sidepanel/App.tsx');

    expect(app.indexOf('scan-action')).toBeLessThan(app.indexOf('component-scan-action'));
    expect(css).toContain('.quick-actions .scan-action { order: 1; }');
    expect(css).toContain('.quick-actions .component-scan-action { order: 2; }');
    expect(css).toContain('.quick-actions .site-audit-launch { order: 3; }');
    expect(css).toContain('.quick-actions .focus-walk-action { order: 4; }');
    expect(css).toContain('background: var(--ft-surface);');
    expect(css).toContain('font-weight: 600;');
    expect(finalCss).toContain('.quick-actions .primary,');
    expect(finalCss).toContain('background: var(--ft-surface);');
    expect(finalCss).toContain('background: var(--ft-accent-soft);');
  });

  it('loads the final cross-view polish after the existing sidepanel cascade', () => {
    const entry = source('entrypoints/sidepanel/main.tsx');
    expect(entry.indexOf("import './requested-polish.css';")).toBeGreaterThan(entry.indexOf("import './ui-scale.css';"));
    expect(entry.indexOf("import './memory-walkthrough-polish.css';")).toBeGreaterThan(entry.indexOf("import './requested-polish.css';"));
  });

  it('uses the same light-blue hover language for reset, Instructions and Settings', () => {
    const css = source('entrypoints/sidepanel/memory-walkthrough-polish.css');

    expect(css).toContain('.topbar-tools .reset-all-trigger:not(:disabled):hover');
    expect(css).toContain('.topbar-tools .instructions-trigger:not(:disabled):hover');
    expect(css).toContain('.topbar-tools .settings-trigger:not(:disabled):hover');
    expect(css).toContain('background: var(--ft-accent-soft);');
  });

  it('uses flat runtime surfaces and a tab-style Trace inspector switcher', () => {
    const css = source('entrypoints/sidepanel/requested-polish.css');

    expect(css).toContain('.trace-hero {');
    expect(css).toContain('.replay-event.has-cause');
    expect(css).toContain('.session-console.live');
    expect(css).toContain('background-image: none;');
    expect(css).toContain('.trace-workspace .trace-mode-switcher');
    expect(css).toContain('border-bottom: 3px solid transparent;');
    expect(css).toContain('border-bottom-color: var(--ft-accent);');
    expect(css).toContain('box-shadow: none;');
  });

  it('makes heading level tones more distinct and switches foreground at mid-scale', () => {
    const css = source('entrypoints/sidepanel/requested-polish.css');

    expect(css).toContain('color-mix(in srgb, var(--ft-ink) 80%, var(--ft-surface))');
    expect(css).toContain('color-mix(in srgb, var(--ft-ink) 60%, var(--ft-surface))');
    expect(css).toContain('color-mix(in srgb, var(--ft-ink) 42%, var(--ft-surface))');
    expect(css).toContain('color-mix(in srgb, var(--ft-ink) 24%, var(--ft-surface))');
    expect(css).toContain('color-mix(in srgb, var(--ft-ink) 10%, var(--ft-surface))');
    expect(css).toContain('--heading-level-foreground: var(--ft-surface);');
    expect(css).toContain('--heading-level-foreground: var(--ft-ink);');
  });

  it('offers list and walkthrough Memory history plus dated JSON baseline comparison', () => {
    const component = source('entrypoints/sidepanel/components/FocusMemorySummary.tsx');
    const css = source('entrypoints/sidepanel/memory-walkthrough-polish.css');

    expect(component).toContain("type FindingHistoryMode = 'list' | 'step';");
    expect(component).toContain("tr(language, 'List', 'Lista')");
    expect(component).toContain("tr(language, 'Walkthrough', 'Recorrido')");
    expect(component).toContain("tr(language, 'Previous finding', 'Fallo anterior')");
    expect(component).toContain("tr(language, 'Next finding', 'Fallo siguiente')");
    expect(component).toContain('currentFindingSelectors(scan)');
    expect(component).toContain('locateMemoryFindingInPage');
    expect(component).toContain('focus-memory-finding-link');
    expect(component).toContain('focusTarget: false');
    expect(component).toContain("className=\"focus-memory-clear\"");
    expect(component.indexOf('className="focus-memory-clear"')).toBeLessThan(component.indexOf('className="focus-memory-controls"'));
    expect(css).toContain('.focus-memory-finding.state-present');
    expect(css).toContain('.focus-memory-finding.state-regressed');
    expect(css).toContain('.focus-memory-finding.state-resolved');
    expect(css).toContain('.focus-memory-history-list.is-step');
    expect(component).toContain("format: 'focustrace-memory-baseline'");
    expect(component).toContain('exportedAt: new Date().toISOString()');
    expect(component).toContain('analyzedAt: new Date(scan.scannedAt).toISOString()');
    expect(component).toContain('recordFocusMemoryObservation(');
    expect(component).toContain("tr(language, 'Export JSON', 'Exportar JSON')");
    expect(component).toContain("tr(language, 'Compare JSON', 'Comparar JSON')");
    expect(component).toContain("throw new Error('scope-mismatch')");
    expect(component).toContain("throw new Error('not-older')");
  });
});