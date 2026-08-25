import { describe, expect, it } from 'vitest';
import { buildPageInspectorEntries } from '../lib/runtime/page-inspector';
import type { ObservedFocusPathTarget } from '../lib/runtime/focus-graph';
import type { RuntimeEvent, ScanResult } from '../shared/types';

function target(overrides: Partial<ObservedFocusPathTarget> = {}): ObservedFocusPathTarget {
  return {
    id: '#save',
    label: 'Save',
    element: { tag: 'button', name: 'Save', selector: '#save' },
    orders: [1],
    firstSeenAt: 1,
    lastSeenAt: 1,
    ...overrides,
  };
}

const emptyScan: ScanResult = {
  engine: 'FocusTrace Rules',
  standard: 'WCAG 2.2',
  url: 'https://example.test',
  title: 'Example',
  scannedAt: 1,
  issues: [],
  review: [],
  warnings: [],
  passes: 1,
  rulesRun: 1,
};

describe('page inspector entries', () => {
  it('marks a named component without linked findings as clear', () => {
    const [entry] = buildPageInspectorEntries([target()], emptyScan, [], 'en');
    expect(entry).toMatchObject({ tone: 'ok', status: 'No signals', findingCount: 0 });
  });

  it('links descendant scan findings and exposes their evidence in context', () => {
    const scan: ScanResult = {
      ...emptyScan,
      issues: [{
        id: 'issue-1',
        ruleId: 'button-name',
        title: 'Button has no accessible name',
        description: 'Provide a programmatic name.',
        severity: 'serious',
        outcome: 'fail',
        targets: ['#save svg'],
        references: [],
      }],
    };
    const [entry] = buildPageInspectorEntries([target()], scan, [], 'es');
    expect(entry).toMatchObject({ tone: 'fail', status: 'Fallo probable', findingCount: 1 });
    expect(entry?.detail).toContain('Button has no accessible name');
  });

  it('marks missing names, positive tabindex and repeated targets', () => {
    const [missing] = buildPageInspectorEntries([
      target({ element: { tag: 'button', selector: '#save' } }),
    ], emptyScan, [], 'en');
    const [positive] = buildPageInspectorEntries([
      target({ element: { tag: 'div', name: 'Save', selector: '#save', attributes: { tabIndex: 2 } } }),
    ], emptyScan, [], 'en');
    const [repeated] = buildPageInspectorEntries([
      target({ orders: [1, 4] }),
    ], emptyScan, [], 'en');

    expect(missing?.tone).toBe('fail');
    expect(positive?.tone).toBe('fail');
    expect(repeated?.tone).toBe('review');
  });

  it('links serious runtime findings to the same selector', () => {
    const events: RuntimeEvent[] = [{
      id: 'runtime-1',
      timestamp: 1,
      kind: 'focus-obscured',
      severity: 'serious',
      outcome: 'fail',
      title: 'Focus is obscured',
      element: { tag: 'button', name: 'Save', selector: '#save' },
    }];
    const [entry] = buildPageInspectorEntries([target()], emptyScan, events, 'en');
    expect(entry).toMatchObject({ tone: 'fail', findingCount: 1 });
    expect(entry?.detail).toContain('Focus is obscured');
  });
});
