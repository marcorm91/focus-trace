import { describe, expect, it } from 'vitest';
import { parseFocusMemorySnapshot } from '../entrypoints/sidepanel/components/focus-memory-snapshot';
import { buildFocusMemoryObservation } from '../shared/focus-memory';
import type { ScanResult } from '../shared/types';

function annotatedScan(): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://example.test/account',
    title: 'Account',
    scannedAt: 1_000,
    issues: [{
      id: 'finding-1',
      ruleId: 'FT-WCAG-003',
      title: 'Missing name',
      description: 'A button needs a name.',
      severity: 'serious',
      outcome: 'fail',
      targets: ['#save'],
      references: [],
      auditorNote: { text: 'Confirmed with keyboard', updatedAt: 1_100 },
    }],
    review: [],
    warnings: [],
    passes: 0,
    rulesRun: 1,
  };
}

describe('FocusTrace Memory JSON snapshots', () => {
  it('keeps auditor notes in the portable observation', () => {
    const observation = buildFocusMemoryObservation(annotatedScan());
    const parsed = parseFocusMemorySnapshot({
      format: 'focustrace-memory-baseline',
      version: 2,
      exportedAt: '2026-09-09T12:00:00.000Z',
      analyzedAt: '1970-01-01T00:00:01.000Z',
      page: {
        url: 'https://example.test/account',
        title: 'Account',
        scopeType: 'page',
        scopeKey: observation.scopeKey,
      },
      observation,
    });

    expect(parsed.version).toBe(2);
    expect(parsed.observation.findingNotes?.[0]?.auditorNote.text).toBe('Confirmed with keyboard');
    expect(parsed.observation.failureDetails?.[0]?.auditorNote?.text).toBe('Confirmed with keyboard');
  });

  it('continues accepting version 1 snapshots without notes', () => {
    const scan = annotatedScan();
    delete scan.issues[0]!.auditorNote;
    const observation = buildFocusMemoryObservation(scan);
    const parsed = parseFocusMemorySnapshot({
      format: 'focustrace-memory-baseline',
      version: 1,
      exportedAt: '2026-09-09T12:00:00.000Z',
      analyzedAt: '1970-01-01T00:00:01.000Z',
      page: {
        url: scan.url,
        title: scan.title,
        scopeType: 'page',
        scopeKey: observation.scopeKey,
      },
      observation,
    });

    expect(parsed.version).toBe(2);
    expect(parsed.observation.findingNotes).toBeUndefined();
  });
});
