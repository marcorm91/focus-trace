import { describe, expect, it } from 'vitest';
import { buildSessionReportModel, buildSessionSuggestions } from '../lib/report/session-report';
import type { RuntimeEvent, ScanResult } from '../shared/types';

const scan: ScanResult = {
  engine: 'FocusTrace Rules',
  standard: 'WCAG 2.2',
  url: 'https://example.test',
  title: 'Example',
  scannedAt: 1,
  issues: [{
    id: 'issue-1',
    ruleId: 'button-name',
    title: 'Name the button',
    description: 'Provide an accessible name.',
    severity: 'serious',
    outcome: 'fail',
    targets: ['#save'],
    references: [],
  }],
  review: [],
  warnings: [],
  headings: [
    { id: 'h-1', level: 1, text: 'Store', selector: 'h1:first-of-type', signals: ['multiple-h1'] },
    { id: 'h-2', level: 1, text: 'Help', selector: 'h1:nth-of-type(2)', signals: ['multiple-h1'] },
    { id: 'h-3', level: 3, text: 'Contact', selector: 'h3', signals: ['level-jump'] },
  ],
  passes: 1,
  rulesRun: 1,
};

describe('session report suggestions', () => {
  it('combines analysis, heading and missing-focus coverage suggestions by priority', () => {
    const suggestions = buildSessionSuggestions(scan, [], 'en');
    expect(suggestions.map((item) => item.id)).toContain('analysis-button-name');
    expect(suggestions.map((item) => item.id)).toContain('headings-multiple-h1');
    expect(suggestions.map((item) => item.id)).toContain('headings-level-jump');
    expect(suggestions.at(-1)?.id).toBe('coverage-focus');
    expect(suggestions[0]?.priority).toBe('high');
  });

  it('adds runtime findings and removes the missing-focus coverage suggestion', () => {
    const events: RuntimeEvent[] = [
      {
        id: 'focus-1',
        timestamp: 1,
        kind: 'focus',
        severity: 'info',
        title: 'Focus moved',
        element: { tag: 'button', name: 'Save', selector: '#save' },
      },
      {
        id: 'runtime-1',
        timestamp: 2,
        kind: 'focus-obscured',
        severity: 'serious',
        outcome: 'fail',
        title: 'Focus is obscured',
        detail: 'A sticky layer covers the focused control.',
      },
    ];
    const suggestions = buildSessionSuggestions(scan, events, 'en');
    expect(suggestions.map((item) => item.title)).toContain('Focus is obscured');
    expect(suggestions.map((item) => item.id)).not.toContain('coverage-focus');
  });

  it('builds executive counts and accessibility-area summaries', () => {
    const contrastScan: ScanResult = {
      ...scan,
      issues: [
        ...scan.issues,
        {
          id: 'contrast-1',
          ruleId: 'FT-WCAG-010',
          title: 'Text has sufficient contrast',
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
          references: [],
        },
      ],
    };

    const model = buildSessionReportModel(contrastScan, [], 'en');
    expect(model.failures).toBe(2);
    expect(model.contrastFailures).toBe(1);
    expect(model.categories).toContainEqual({ id: 'contrast', label: 'Contrast', count: 1 });
    expect(model.suggestions.find((item) => item.id === 'analysis-FT-WCAG-010')?.detail).toContain('#767676');
  });

  it('turns a correlated runtime cause into a trace story with remediation', () => {
    const events: RuntimeEvent[] = [
      {
        id: 'key-1',
        timestamp: 10,
        kind: 'keydown',
        severity: 'info',
        title: 'Key: Enter',
        interactionId: 'ix-a-1',
        element: { tag: 'button', role: 'button', name: 'Save profile', selector: '#save' },
      },
      {
        id: 'mutation-1',
        timestamp: 20,
        kind: 'dom-mutation',
        severity: 'info',
        title: 'DOM removed',
        interactionId: 'ix-a-1',
      },
      {
        id: 'lost-1',
        timestamp: 30,
        kind: 'focus-lost',
        severity: 'serious',
        outcome: 'review',
        title: 'Focused element removed',
        interactionId: 'ix-a-1',
        element: { tag: 'button', role: 'button', name: 'Save profile', selector: '#save' },
        causes: [{
          type: 'FOCUSED_NODE_REMOVED',
          confidence: 'deterministic',
          summary: 'Focused node was removed.',
        }],
      },
    ];

    const model = buildSessionReportModel(scan, events, 'en');
    expect(model.runtimeFindings).toBe(1);
    expect(model.causalInteractions).toBe(1);
    expect(model.transitionReviews).toBeGreaterThanOrEqual(1);
    expect(model.traceStories).toHaveLength(1);
    expect(model.traceStories[0]).toMatchObject({
      tone: 'review',
      interactionNumber: 1,
      result: 'Focus lost',
      selector: '#save',
    });
    expect(model.traceStories[0]?.chain.join(' → ')).toContain('Page content changed');
    expect(model.traceStories[0]?.recommendation).toContain('Move focus');
  });
});
