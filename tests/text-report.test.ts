import { describe, expect, it } from 'vitest';
import {
  buildTextReportFilename,
  buildTextSessionReport,
} from '../lib/report/text-report';
import type { RuntimeEvent, ScanResult } from '../shared/types';

const scan: ScanResult = {
  engine: 'FocusTrace Rules',
  standard: 'WCAG 2.2',
  url: 'https://www.example.test/products',
  title: 'Example products',
  scannedAt: 1,
  issues: [{
    id: 'issue-1',
    ruleId: 'button-name',
    title: 'Button has no name',
    description: 'Provide an accessible name.',
    severity: 'serious',
    outcome: 'fail',
    targets: ['#save'],
    evidence: 'The computed name is empty.',
    references: [{ type: 'WCAG', id: '4.1.2', label: 'Name, Role, Value', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' }],
  }],
  review: [],
  warnings: [],
  headings: [
    { id: 'h1', level: 1, text: 'Products', selector: 'main > h1', signals: [] },
    { id: 'h2', level: 3, text: 'Featured', selector: 'main > h3', signals: ['level-jump'] },
  ],
  passes: 4,
  rulesRun: 5,
};

describe('text session report', () => {
  it('creates a complete Spanish report without exposing CSS selectors', () => {
    const report = buildTextSessionReport({
      scan,
      events: [],
      language: 'es',
      generatedAt: Date.UTC(2026, 7, 25, 12, 0, 0),
    });

    expect(report).toContain('FOCUS TRACE - INFORME DE ACCESIBILIDAD');
    expect(report).toContain('1. ANÁLISIS AUTOMÁTICO');
    expect(report).toContain('2. RECORRIDO DE FOCO POR TECLADO');
    expect(report).toContain('Modo: No realizado');
    expect(report).toContain('3. ESTRUCTURA DE ENCABEZADOS');
    expect(report).toContain('H3: Featured [salto de nivel]');
    expect(report).toContain('4. SUGERENCIAS DE MEJORA');
    expect(report).not.toContain('#save');
    expect(report).not.toContain('main > h1');
  });

  it('includes automatic focus results and component order', () => {
    const events: RuntimeEvent[] = [
      { id: 'start', timestamp: 1, kind: 'focus-walk-start', severity: 'info', title: 'Walk started', focusWalk: { totalCandidates: 1, focusedSteps: 0, skipped: 0, stopped: false } },
      { id: 'focus', timestamp: 2, kind: 'focus', severity: 'info', title: 'Focus moved', element: { tag: 'button', role: 'button', name: 'Save', selector: '#save' } },
      { id: 'end', timestamp: 3, kind: 'focus-walk-end', severity: 'info', title: 'Walk ended', focusWalk: { totalCandidates: 1, focusedSteps: 1, skipped: 0, stopped: false } },
    ];
    const report = buildTextSessionReport({ scan, events, language: 'en', generatedAt: 1 });
    expect(report).toContain('Mode: Automatic Tab walk');
    expect(report).toContain('1. Save');
    expect(report).toContain('Reached: 1');
    expect(report).not.toContain('#save');
  });

  it('creates a Windows-friendly filename', () => {
    expect(buildTextReportFilename(scan, Date.UTC(2026, 7, 25))).toBe(
      'focus-trace-example.test-2026-08-25.txt',
    );
  });
});
