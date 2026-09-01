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

  it('links descendant failures and localizes the exact rule in Spanish', () => {
    const scan: ScanResult = {
      ...emptyScan,
      issues: [{
        id: 'issue-1',
        ruleId: 'FT-WCAG-003',
        title: 'Button has no accessible name',
        description: 'Provide a programmatic name.',
        severity: 'serious',
        outcome: 'fail',
        targets: ['#save svg'],
        references: [],
      }],
    };
    const [entry] = buildPageInspectorEntries([target()], scan, [], 'es');
    expect(entry).toMatchObject({
      tone: 'fail',
      status: 'FALLO · FT-WCAG-003',
      findingCount: 1,
      findingSummary: '1 hallazgo vinculado',
    });
    expect(entry?.detail).toContain('El botón tiene un nombre accesible no vacío');
    expect(entry?.detail).not.toContain('Button has no accessible name');
  });

  it('localizes contrast reviews instead of leaking the English scan copy', () => {
    const scan: ScanResult = {
      ...emptyScan,
      review: [{
        id: 'review-contrast',
        ruleId: 'FT-WCAG-010',
        title: 'Text color contrast',
        description: 'FocusTrace could not determine the rendered text/background contrast reliably.',
        severity: 'serious',
        outcome: 'review',
        targets: ['#save'],
        references: [],
        contrast: {
          kind: 'text',
          subject: 'text',
          requiredRatio: 4.5,
          reason: 'The rendered background could not be resolved reliably.',
        },
      }],
    };

    const [entry] = buildPageInspectorEntries([target()], scan, [], 'es');
    expect(entry).toMatchObject({
      tone: 'review',
      status: 'REVISIÓN · FT-WCAG-010',
      findingCount: 1,
      findingSummary: '1 hallazgo vinculado',
    });
    expect(entry?.detail).toContain('Contraste de color del texto');
    expect(entry?.detail).toContain('FocusTrace no puede determinar con fiabilidad');
    expect(entry?.detail).not.toContain('Text color contrast');
  });

  it('keeps contextual focus-path signals as review instead of red failure', () => {
    const [missing] = buildPageInspectorEntries([
      target({ element: { tag: 'button', selector: '#save' } }),
    ], emptyScan, [], 'en');
    const [positive] = buildPageInspectorEntries([
      target({ element: { tag: 'div', name: 'Save', selector: '#save', attributes: { tabIndex: 2 } } }),
    ], emptyScan, [], 'en');
    const [repeated] = buildPageInspectorEntries([
      target({ orders: [1, 4] }),
    ], emptyScan, [], 'en');

    expect(missing).toMatchObject({ tone: 'review', status: 'REVIEW · accessible name' });
    expect(positive).toMatchObject({ tone: 'review', status: 'REVIEW · tabindex' });
    expect(repeated).toMatchObject({ tone: 'review', status: 'REVIEW · repeated focus' });
  });

  it('links deterministic runtime failures to the same selector', () => {
    const events: RuntimeEvent[] = [{
      id: 'runtime-1',
      timestamp: 1,
      kind: 'focus-obscured',
      severity: 'serious',
      outcome: 'fail',
      ruleId: 'FT-RUNTIME-002',
      title: 'Focus is obscured',
      element: { tag: 'button', name: 'Save', selector: '#save' },
    }];
    const [entry] = buildPageInspectorEntries([target()], emptyScan, events, 'en');
    expect(entry).toMatchObject({ tone: 'fail', status: 'FAIL · FT-RUNTIME-002', findingCount: 1 });
    expect(entry?.detail).toContain('Focus is obscured');
  });

  it('does not promote a serious runtime review to deterministic failure', () => {
    const events: RuntimeEvent[] = [{
      id: 'runtime-review',
      timestamp: 2,
      kind: 'focus-obscured',
      severity: 'serious',
      outcome: 'review',
      ruleId: 'FT-RUNTIME-002',
      title: 'Focus may be obscured',
      element: { tag: 'button', name: 'Save', selector: '#save' },
    }];
    const [entry] = buildPageInspectorEntries([target()], emptyScan, events, 'en');
    expect(entry).toMatchObject({ tone: 'review', status: 'REVIEW · FT-RUNTIME-002' });
  });
});
