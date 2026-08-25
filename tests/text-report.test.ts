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
  issues: [
    {
      id: 'issue-1',
      ruleId: 'button-name',
      title: 'Button has no name',
      description: 'Provide an accessible name.',
      severity: 'serious',
      outcome: 'fail',
      targets: ['#save'],
      evidence: 'The computed name is empty.',
      references: [{ type: 'WCAG', id: '4.1.2', label: 'Name, Role, Value', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' }],
    },
    {
      id: 'contrast-1',
      ruleId: 'FT-WCAG-010',
      title: 'Text contrast is below the required minimum',
      description: 'Rendered text contrast is below the required ratio.',
      severity: 'serious',
      outcome: 'fail',
      targets: ['#muted'],
      contrast: {
        ratio: 4.48,
        requiredRatio: 4.5,
        foreground: 'rgb(119, 119, 119)',
        background: 'rgb(255, 255, 255)',
      },
      references: [{ type: 'WCAG', id: '1.4.3', label: 'Contrast (Minimum)', url: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html' }],
    },
  ],
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
  it('creates a trace-first Spanish report without exposing CSS selectors', () => {
    const report = buildTextSessionReport({
      scan,
      events: [],
      language: 'es',
      generatedAt: Date.UTC(2026, 7, 25, 12, 0, 0),
    });

    expect(report).toContain('FOCUS TRACE - INFORME DE ACCESIBILIDAD');
    expect(report).toContain('RESUMEN EJECUTIVO');
    expect(report).toContain('1. MÁXIMA PRIORIDAD');
    expect(report).toContain('2. TRAZA RUNTIME');
    expect(report).toContain('3. BARRIDO COMPLETO DE PÁGINA');
    expect(report).toContain('Color accesible sugerido: #767676');
    expect(report).toContain('4. ESTRUCTURA DE ENCABEZADOS');
    expect(report).toContain('H3: Featured [salto de nivel]');
    expect(report).toContain('5. SUGERENCIAS DE MEJORA');
    expect(report).not.toContain('#save');
    expect(report).not.toContain('main > h1');
  });

  it('includes automatic focus results in the executive summary', () => {
    const events: RuntimeEvent[] = [
      { id: 'start', timestamp: 1, kind: 'focus-walk-start', severity: 'info', title: 'Walk started', focusWalk: { totalCandidates: 1, focusedSteps: 0, skipped: 0, stopped: false } },
      { id: 'focus', timestamp: 2, kind: 'focus', severity: 'info', title: 'Focus moved', element: { tag: 'button', role: 'button', name: 'Save', selector: '#save' } },
      { id: 'end', timestamp: 3, kind: 'focus-walk-end', severity: 'info', title: 'Walk ended', focusWalk: { totalCandidates: 1, focusedSteps: 1, skipped: 0, stopped: false } },
    ];
    const report = buildTextSessionReport({ scan, events, language: 'en', generatedAt: 1 });
    expect(report).toContain('Focus journey: Automatic Tab walk · 1 steps');
    expect(report).toContain('2. RUNTIME TRACE');
    expect(report).not.toContain('#save');
  });

  it('exports causal interaction stories with result and recommendation', () => {
    const events: RuntimeEvent[] = [
      {
        id: 'key-1', timestamp: 10, kind: 'keydown', severity: 'info', title: 'Key: Enter', interactionId: 'ix-a-1',
        element: { tag: 'button', role: 'button', name: 'Open settings', selector: '#settings' },
      },
      {
        id: 'lost-1', timestamp: 20, kind: 'focus-lost', severity: 'serious', outcome: 'review', title: 'Focus lost', interactionId: 'ix-a-1',
        element: { tag: 'button', role: 'button', name: 'Open settings', selector: '#settings' },
        causes: [{ type: 'FOCUS_FELL_BACK_TO_BODY', confidence: 'deterministic', summary: 'Focus fell back to body.' }],
        references: [{ type: 'WCAG', id: '2.4.3', label: 'Focus Order', url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html' }],
      },
    ];
    const report = buildTextSessionReport({ scan, events, language: 'en', generatedAt: 1 });
    expect(report).toContain('Interaction #1');
    expect(report).toContain('Result: Focus lost');
    expect(report).toContain('Recommendation: Choose a meaningful focus destination');
    expect(report).toContain('WCAG 2.4.3');
    expect(report).not.toContain('#settings');
  });

  it('creates a Windows-friendly filename', () => {
    expect(buildTextReportFilename(scan, Date.UTC(2026, 7, 25))).toBe(
      'focus-trace-example.test-2026-08-25.txt',
    );
  });
});
