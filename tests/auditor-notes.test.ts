import { describe, expect, it } from 'vitest';
import {
  MAX_AUDITOR_NOTE_LENGTH,
  createAuditorNote,
  updateSessionAuditorNote,
} from '../shared/auditor-notes';
import { removeSessionInteraction } from '../lib/runtime/session-state';
import type { ScanResult, SessionState } from '../shared/types';

const scan: ScanResult = {
  engine: 'FocusTrace Rules',
  standard: 'WCAG 2.2',
  url: 'https://example.test/',
  title: 'Example',
  scannedAt: 100,
  issues: [{
    id: 'finding-1',
    ruleId: 'FT-WCAG-003',
    title: 'Missing name',
    description: 'A button needs a name.',
    severity: 'serious',
    outcome: 'fail',
    targets: ['button'],
    references: [],
  }],
  review: [],
  warnings: [],
  passes: 0,
  rulesRun: 1,
};

const session: SessionState = {
  tabId: 7,
  recording: false,
  scan,
  events: [{
    id: 'event-1',
    timestamp: 90,
    kind: 'focus',
    severity: 'info',
    title: 'Focus moved',
  }],
};

describe('auditor notes', () => {
  it('normalizes whitespace and enforces the bounded note length', () => {
    expect(createAuditorNote('  first\r\nsecond  ', 123)).toEqual({
      text: 'first\nsecond',
      updatedAt: 123,
    });
    expect(createAuditorNote('x'.repeat(MAX_AUDITOR_NOTE_LENGTH + 20), 123)?.text)
      .toHaveLength(MAX_AUDITOR_NOTE_LENGTH);
    expect(createAuditorNote('   ', 123)).toBeUndefined();
  });

  it('adds, edits and removes a note on a static finding', () => {
    const added = updateSessionAuditorNote(
      session,
      { kind: 'scan-finding', findingId: 'finding-1' },
      'Needs product review',
      200,
    );
    expect(added.scan?.issues[0]?.auditorNote).toEqual({ text: 'Needs product review', updatedAt: 200 });

    const edited = updateSessionAuditorNote(
      added,
      { kind: 'scan-finding', findingId: 'finding-1' },
      'Confirmed with keyboard',
      300,
    );
    expect(edited.scan?.issues[0]?.auditorNote?.text).toBe('Confirmed with keyboard');

    const removed = updateSessionAuditorNote(
      edited,
      { kind: 'scan-finding', findingId: 'finding-1' },
      '',
      400,
    );
    expect(removed.scan?.issues[0]?.auditorNote).toBeUndefined();
  });

  it('updates runtime events without disturbing unrelated evidence', () => {
    const next = updateSessionAuditorNote(
      session,
      { kind: 'runtime-event', eventId: 'event-1' },
      'Unexpected destination',
      200,
    );
    expect(next.events[0]?.auditorNote?.text).toBe('Unexpected destination');
    expect(next.scan).toBe(session.scan);
    expect(updateSessionAuditorNote(
      next,
      { kind: 'runtime-event', eventId: 'missing' },
      'Ignored',
      300,
    )).toBe(next);
  });

  it('drops event notes when their parent Trace interaction is removed', () => {
    const interaction: SessionState = {
      ...session,
      events: [{
        ...session.events[0]!,
        interactionId: 'ix-manual-1',
        auditorNote: { text: 'Remove with interaction', updatedAt: 200 },
      }],
    };
    const removed = removeSessionInteraction(interaction, 'ix-manual-1');
    expect(removed.events).toEqual([]);
    expect(JSON.stringify(removed)).not.toContain('Remove with interaction');
  });
});
