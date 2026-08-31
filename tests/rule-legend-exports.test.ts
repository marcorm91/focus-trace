import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTextSessionReport } from '../lib/report/text-report';
import {
  buildAuditEvidenceBundle,
  renderAuditEvidenceMarkdown,
} from '../lib/runtime/audit-evidence';
import { buildFocusGraph } from '../lib/runtime/focus-graph';
import { groupRuntimeInteractions } from '../lib/runtime/causality';
import { ruleLegendCopy } from '../shared/rule-legend';
import type { RuntimeEvent, ScanResult } from '../shared/types';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const scan: ScanResult = {
  engine: 'FocusTrace Rules',
  standard: 'WCAG 2.2',
  url: 'https://example.test/',
  title: 'Example',
  scannedAt: 1,
  issues: [],
  review: [],
  warnings: [],
  passes: 1,
  rulesRun: 1,
};

describe('rule legend exports', () => {
  it('defines one bilingual source for every registered user-facing rule family', () => {
    const english = ruleLegendCopy('en');
    const spanish = ruleLegendCopy('es');
    const expected = [
      'FT-WCAG-###',
      'FT-WARN-###',
      'FT-REVIEW-###',
      'FT-RUNTIME-###',
      'FT-RUNTIME-ARIA-###',
      'FT-APG-###',
    ];

    expect(english.items.map((item) => item.pattern)).toEqual(expected);
    expect(spanish.items.map((item) => item.pattern)).toEqual(expected);
    expect(english.notes.map((note) => note.id)).toEqual(['sequence', 'result-severity', 'external', 'occurrence']);
  });

  it('places the legend before the executive summary in TXT reports', () => {
    const report = buildTextSessionReport({ scan, events: [], language: 'en', generatedAt: 1 });
    const legendIndex = report.indexOf('RULE LEGEND AND IDENTIFIERS');
    const summaryIndex = report.indexOf('EXECUTIVE SUMMARY');

    expect(legendIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(legendIndex);
    expect(report).toContain('FT-RUNTIME-ARIA-###');
    expect(report).toContain('Finding vs occurrence.');
  });

  it('places the same legend before the Markdown evidence summary', () => {
    const events: RuntimeEvent[] = [];
    const bundle = buildAuditEvidenceBundle({
      graph: buildFocusGraph(events),
      interactions: groupRuntimeInteractions(events),
      page: { title: 'Example', url: 'https://example.test/' },
      generatedAt: '2026-08-29T12:00:00.000Z',
    });
    const markdown = renderAuditEvidenceMarkdown(bundle, 'en');
    const legendIndex = markdown.indexOf('## Rule legend and identifiers');
    const summaryIndex = markdown.indexOf('## Summary');

    expect(legendIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(legendIndex);
    expect(markdown).toContain('`FT-APG-###`');
  });

  it('uses the shared legend in Instructions and the printable PDF report', () => {
    const instructions = source('entrypoints/sidepanel/views/InstructionsView.tsx');
    const printable = source('entrypoints/report-print/main.tsx');
    const printCss = source('entrypoints/report-print/audit-guidance.css');

    expect(instructions).toContain("ruleLegendCopy(language)");
    expect(printable).toContain("ruleLegendCopy(language)");
    expect(printable.indexOf('<ReportNotes language={language} />')).toBeLessThan(printable.indexOf('id="summary-title"'));
    expect(printable).toContain('className="print-rule-legend"');
    expect(printCss).toContain('.print-rule-legend');
    expect(printCss).toContain('margin-top: 18px;');
  });
});
