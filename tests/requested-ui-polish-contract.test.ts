import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('requested FocusTrace UI polish', () => {
  it('keeps quick actions neutral, semibold and in the requested order', () => {
    const css = source('entrypoints/sidepanel/requested-polish.css');
    const app = source('entrypoints/sidepanel/App.tsx');

    expect(app.indexOf('scan-action')).toBeLessThan(app.indexOf('component-scan-action'));
    expect(css).toContain('.quick-actions .scan-action { order: 1; }');
    expect(css).toContain('.quick-actions .component-scan-action { order: 2; }');
    expect(css).toContain('.quick-actions .site-audit-launch { order: 3; }');
    expect(css).toContain('.quick-actions .focus-walk-action { order: 4; }');
    expect(css).toContain('background: var(--ft-surface);');
    expect(css).toContain('font-weight: 600;');
  });

  it('loads the cross-view polish after the existing sidepanel cascade', () => {
    const entry = source('entrypoints/sidepanel/main.tsx');
    expect(entry.indexOf("import './requested-polish.css';")).toBeGreaterThan(entry.indexOf("import './ui-scale.css';"));
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

  it('offers list and one-by-one Memory history plus dated JSON baseline comparison', () => {
    const component = source('entrypoints/sidepanel/components/FocusMemorySummary.tsx');

    expect(component).toContain("type FindingHistoryMode = 'list' | 'step';");
    expect(component).toContain("tr(language, 'List', 'Lista')");
    expect(component).toContain("tr(language, 'One by one', 'Uno a uno')");
    expect(component).toContain("tr(language, 'Previous finding', 'Fallo anterior')");
    expect(component).toContain("tr(language, 'Next finding', 'Fallo siguiente')");
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
