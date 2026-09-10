import type {
  AuditorNote,
  AuditorNoteTarget,
  RuntimeEvent,
  ScanIssue,
  ScanResult,
  SessionState,
} from './types';

export const MAX_AUDITOR_NOTE_LENGTH = 2_000;

export function normalizeAuditorNote(value: unknown): AuditorNote | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<AuditorNote>;
  if (typeof candidate.text !== 'string'
    || typeof candidate.updatedAt !== 'number'
    || !Number.isFinite(candidate.updatedAt)) return undefined;

  const text = candidate.text.replace(/\r\n?/g, '\n').trim().slice(0, MAX_AUDITOR_NOTE_LENGTH);
  return text ? { text, updatedAt: candidate.updatedAt } : undefined;
}

export function createAuditorNote(text: string, updatedAt = Date.now()): AuditorNote | undefined {
  return normalizeAuditorNote({ text, updatedAt });
}

export function isAuditorNote(value: unknown): value is AuditorNote {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuditorNote>;
  const normalized = normalizeAuditorNote(candidate);
  return normalized != null
    && normalized.text === candidate.text
    && normalized.updatedAt === candidate.updatedAt;
}

function withAuditorNote<T extends { auditorNote?: AuditorNote }>(
  value: T,
  auditorNote: AuditorNote | undefined,
): T {
  if (value.auditorNote?.text === auditorNote?.text) return value;
  const next = { ...value };
  if (auditorNote) next.auditorNote = auditorNote;
  else delete next.auditorNote;
  return next;
}

export function updateScanFindingAuditorNote(
  scan: ScanResult,
  findingId: string,
  auditorNote: AuditorNote | undefined,
): ScanResult {
  let changed = false;
  const update = (issues: ScanIssue[]) => issues.map((issue) => {
    if (issue.id !== findingId) return issue;
    const next = withAuditorNote(issue, auditorNote);
    if (next !== issue) changed = true;
    return next;
  });
  const issues = update(scan.issues);
  const review = update(scan.review);
  const warnings = update(scan.warnings ?? []);
  if (!changed) return scan;
  return { ...scan, issues, review, warnings };
}

export function updateRuntimeEventAuditorNote(
  events: RuntimeEvent[],
  eventId: string,
  auditorNote: AuditorNote | undefined,
): RuntimeEvent[] {
  let changed = false;
  const next = events.map((event) => {
    if (event.id !== eventId) return event;
    const updated = withAuditorNote(event, auditorNote);
    if (updated !== event) changed = true;
    return updated;
  });
  return changed ? next : events;
}

export function updateSessionAuditorNote(
  state: SessionState,
  target: AuditorNoteTarget,
  text: string,
  updatedAt = Date.now(),
): SessionState {
  const auditorNote = createAuditorNote(text, updatedAt);
  if (target.kind === 'runtime-event') {
    const events = updateRuntimeEventAuditorNote(state.events, target.eventId, auditorNote);
    return events === state.events ? state : { ...state, events };
  }
  if (!state.scan) return state;
  const scan = updateScanFindingAuditorNote(state.scan, target.findingId, auditorNote);
  return scan === state.scan ? state : { ...state, scan };
}
