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

  it('keeps known static findings localized in Spanish recommendations', () => {
    const localizedScan: ScanResult = {
      ...scan,
      issues: [{
        id: 'image-1',
        ruleId: 'FT-WCAG-002',
        title: 'Image has an accessible name or is marked decorative',
        description: 'The image is exposed as image content but has an empty accessible name and is not marked decorative.',
        severity: 'serious',
        outcome: 'fail',
        targets: ['#hero'],
        references: [],
      }],
    };

    const suggestion = buildSessionSuggestions(localizedScan, [], 'es')
      .find((item) => item.id === 'analysis-FT-WCAG-002');

    expect(suggestion?.title).toBe('La imagen tiene un nombre accesible o está marcada como decorativa');
    expect(suggestion?.detail).toContain('La imagen se expone como contenido gráfico');
    expect(suggestion?.detail).not.toContain('The image is exposed');
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
    expect(suggestions.map((item) => item.title)).toContain('The focused control may be covered by other content');
    expect(suggestions.map((item) => item.id)).not.toContain('coverage-focus');
  });

  it('does not leak raw English runtime detail into Spanish suggestions', () => {
    const events: RuntimeEvent[] = [{
      id: 'runtime-1',
      timestamp: 2,
      kind: 'focus-obscured',
      severity: 'serious',
      outcome: 'fail',
      title: 'Focus is obscured',
      detail: 'A sticky layer covers the focused control.',
    }];

    const suggestion = buildSessionSuggestions(scan, events, 'es')
      .find((item) => item.id === 'focus-runtime-1');

    expect(suggestion?.detail).toBe('Revisa el componente enfocado dentro del contexto grabado de la página.');
    expect(suggestion?.detail).not.toContain('sticky layer');
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
            kind: 'text',
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

  it('counts non-text contrast failures and recommends a visual color', () => {
    const nonTextScan: ScanResult = {
      ...scan,
      issues: [
        ...scan.issues,
        {
          id: 'non-text-1',
          ruleId: 'FT-WCAG-011',
          title: 'Required non-text visual information has sufficient contrast',
          description: 'The icon contrast is below 3:1.',
          severity: 'serious',
          outcome: 'fail',
          targets: ['#settings'],
          contrast: {
            kind: 'graphic',
            subject: 'icon fill',
            ratio: 2.32,
            requiredRatio: 3,
            foreground: 'rgb(170, 170, 170)',
            background: 'rgb(255, 255, 255)',
          },
          references: [],
        },
      ],
    };

    const model = buildSessionReportModel(nonTextScan, [], 'en');
    expect(model.contrastFailures).toBe(1);
    expect(model.categories).toContainEqual({ id: 'contrast', label: 'Contrast', count: 1 });
    const suggestion = model.suggestions.find((item) => item.id === 'analysis-FT-WCAG-011');
    expect(suggestion?.detail).toContain('Suggested visual color');
    expect(suggestion?.detail).toContain('recorded adjacent color');
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
