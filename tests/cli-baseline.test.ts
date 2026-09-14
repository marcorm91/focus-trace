import { describe, expect, it } from 'vitest';
import {
  createFocusTraceCliBaseline,
  parseFocusTraceCliBaseline,
  renderFocusTraceCliBaseline,
} from '../lib/core/baseline';
import type { ScanResult } from '../shared/types';

function scan(): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://example.test/account?token=secret#private',
    title: 'Private account title',
    scannedAt: 100,
    scope: { type: 'page' },
    issues: [{
      id: 'finding-1',
      ruleId: 'FT-WCAG-003',
      title: 'Button has a non-empty accessible name',
      description: 'The button is unnamed.',
      severity: 'critical',
      outcome: 'fail',
      targets: ['#save'],
      evidence: 'Computed accessible name is empty.',
      element: {
        tag: 'button',
        selector: '#save',
        name: 'Private visible label',
        attributes: { href: 'https://example.test/?token=secret-element' },
      },
      context: { tag: 'section', selector: '#private', name: 'Private context' },
      auditorNote: { text: 'Private auditor note', updatedAt: 50 },
      references: [],
    }],
    review: [],
    warnings: [],
    headings: [{ id: 'h-private', level: 1, text: 'Private heading', selector: 'h1', signals: [] }],
    passes: 1,
    rulesRun: 2,
  };
}

describe('FocusTrace CLI baseline', () => {
  it('stores only comparison evidence and redacts URL values', () => {
    const baseline = createFocusTraceCliBaseline(scan(), 200);
    const text = renderFocusTraceCliBaseline(baseline);

    expect(baseline.scan.url).toBe('https://example.test/account?[redacted]#[redacted]');
    expect(baseline.scan.title).toBe('');
    expect(baseline.scan.headings).toBeUndefined();
    expect(baseline.scan.issues[0]?.element).toBeUndefined();
    expect(baseline.scan.issues[0]?.context).toBeUndefined();
    expect(baseline.scan.issues[0]?.auditorNote).toBeUndefined();
    expect(text).not.toContain('token=secret');
    expect(text).not.toContain('Private account title');
    expect(text).not.toContain('Private visible label');
    expect(text).not.toContain('Private auditor note');
    expect(parseFocusTraceCliBaseline(text)).toEqual(baseline);
  });

  it('rejects unknown baseline versions', () => {
    expect(() => parseFocusTraceCliBaseline({ version: 2, savedAt: 0, scan: {} })).toThrow(/baseline/i);
  });
});
