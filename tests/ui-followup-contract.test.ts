import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { localizedScanIssue } from '../shared/i18n';
import type { ScanIssue } from '../shared/types';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('UI follow-up contract', () => {
  it('gives every enabled button a subtle hover surface in the final cascade layer', () => {
    const css = source('entrypoints/sidepanel/accessibility.css');

    expect(css).toContain('button:not(:disabled):hover');
    expect(css).toContain('background-image: linear-gradient(');
    expect(css).toContain('currentColor 4%');
  });

  it('presents Trace summary metrics as data instead of button-like cards', () => {
    const css = source('entrypoints/sidepanel/information-summaries.css');

    expect(css).toContain('.trace-workspace .trace-metrics > span');
    expect(css).toContain('.trace-workspace .trace-metrics > span::before');
    expect(css).toContain('.trace-workspace .trace-metrics > span.has-signal');
    expect(css).toContain('border: 0;');
    expect(css).toContain('background: transparent;');
    expect(css).toContain('box-shadow: none;');
  });

  it('keeps the PDF impact summary aligned with all Review findings', () => {
    const report = source('entrypoints/report-print/main.tsx');

    expect(report).toContain('const staticFindings = useMemo(');
    expect(report).toContain('...scan.issues, ...scan.review, ...(scan.warnings ?? [])');
    expect(report).toContain('const findingSeverityCounts = useMemo(() => countBySeverity(staticFindings)');
    expect(report).toContain('Impacto de los hallazgos · combina fallos, revisiones y avisos');
    expect(report).not.toContain('failureSeverityCounts');
    expect(report).not.toContain('Impacto de los fallos · priorización');
  });

  it('removes the redundant explanatory example below the impact matrix', () => {
    const matrix = source('entrypoints/sidepanel/components/ImpactMatrix.tsx');

    expect(matrix).not.toContain('Example: a skipped heading level');
    expect(matrix).not.toContain('Ejemplo: un salto de nivel de encabezado');
  });

  it('does not leak raw English structural evidence in Spanish findings', () => {
    const issue: ScanIssue = {
      id: 'structural-1',
      ruleId: 'FT-WARN-008',
      title: 'HTML element is used outside its required semantic context',
      description: 'This native HTML element is outside its required context.',
      severity: 'serious',
      outcome: 'warning',
      targets: ['li'],
      evidence: '<li> requires a direct <ul>, <ol> or <menu> parent; current parent is <div>.',
      references: [],
    };

    const localized = localizedScanIssue(issue, 'es');
    expect(localized.title).toContain('contexto semántico requerido');
    expect(localized.evidence).toContain('<li> requiere un padre directo <ul>, <ol> o <menu>');
    expect(localized.evidence).toContain('el padre actual es <div>');
    expect(localized.evidence).not.toContain('requires a direct');
  });

  it('localizes PDF recommendation priority labels instead of rendering raw enum values', () => {
    const report = source('entrypoints/report-print/main.tsx');

    expect(report).toContain('function suggestionPriorityLabel');
    expect(report).toContain("tr(language, 'High', 'Alta')");
    expect(report).toContain('suggestionPriorityLabel(suggestion.priority, language)');
    expect(report).not.toContain('<div><span>{suggestion.priority}</span>');
  });
});
