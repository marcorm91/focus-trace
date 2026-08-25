import { describe, expect, it } from 'vitest';
import { buildSessionSuggestions } from '../lib/report/session-report';
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
});
