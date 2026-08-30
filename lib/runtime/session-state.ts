import { defaultRuntimeBreakpointSettings, normalizeRuntimeBreakpointSettings } from './breakpoints';
import { focusWalkIntervals, isManualTraceInteractionId } from './trace-evidence-editing';
import type {
  RuntimeBreakpointSettings,
  RuntimeEvent,
  ScanResult,
  SessionState,
} from '../../shared/types';

export const MAX_RUNTIME_EVENTS = 500;

function comparableDocumentUrl(value: string): string {
  try {
    const url = new URL(value);
    // Ordinary fragments identify a position inside the same document, while
    // hash-router fragments identify a different rendered SPA view. Preserve
    // only route-shaped hashes so an anchor jump keeps the current scan and a
    // #/route navigation invalidates stale evidence.
    if (!/^#!?\//.test(url.hash)) url.hash = '';
    return url.href;
  } catch {
    const hashIndex = value.indexOf('#');
    if (hashIndex < 0) return value;
    const hash = value.slice(hashIndex);
    return /^#!?\//.test(hash) ? value : value.slice(0, hashIndex);
  }
}

export function trimRuntimeEvents(
  events: RuntimeEvent[],
  maxEvents = MAX_RUNTIME_EVENTS,
): RuntimeEvent[] {
  if (events.length <= maxEvents) return events;

  const intervals = focusWalkIntervals(events);
  let start = Math.max(0, events.length - maxEvents);

  // The retention limit is a target, not permission to corrupt evidence. Move
  // the cut backwards until no correlated interaction crosses the boundary and
  // it no longer lands inside an automatic focus-walk interval. Interactions
  // are not guaranteed to be contiguous because ambient runtime evidence can
  // be emitted between two events carrying the same interactionId.
  while (start > 0) {
    let nextStart = start;
    const retainedInteractionIds = new Set(
      events.slice(start).flatMap((candidate) => candidate.interactionId ? [candidate.interactionId] : []),
    );

    for (let index = 0; index < start; index += 1) {
      const interactionId = events[index]?.interactionId;
      if (interactionId && retainedInteractionIds.has(interactionId)) {
        nextStart = Math.min(nextStart, index);
      }
    }

    const boundary = events[nextStart];
    if (boundary) {
      const interval = intervals.find(
        (candidate) => boundary.timestamp >= candidate.startedAt && boundary.timestamp <= candidate.endedAt,
      );
      if (interval) {
        const focusWalkStart = events.findIndex(
          (candidate) => candidate.kind === 'focus-walk-start' && candidate.timestamp === interval.startedAt,
        );
        if (focusWalkStart >= 0) nextStart = Math.min(nextStart, focusWalkStart);
      }
    }

    if (nextStart === start) break;
    start = nextStart;
  }

  return events.slice(start);
}

export function emptySessionState(tabId: number): SessionState {
  return {
    tabId,
    recording: false,
    events: [],
    breakpoints: defaultRuntimeBreakpointSettings(),
  };
}

export function normalizeSessionState(state: SessionState): SessionState {
  return {
    ...state,
    breakpoints: normalizeRuntimeBreakpointSettings(state.breakpoints),
  };
}

export function appendRuntimeEventToSession(state: SessionState, event: RuntimeEvent): SessionState {
  const firstBreakpointHit = event.breakpointHits?.[0];
  return {
    ...state,
    recording: firstBreakpointHit ? false : state.recording,
    events: trimRuntimeEvents([...state.events, event]),
    ...(firstBreakpointHit ? { pausedByBreakpoint: firstBreakpointHit } : {}),
  };
}

export function clearSessionEvents(state: SessionState, tabId = state.tabId): SessionState {
  const {
    pausedByBreakpoint: _paused,
    startedAt: _startedAt,
    ...rest
  } = state;
  return {
    ...rest,
    tabId,
    recording: false,
    events: [],
  };
}

export function removeSessionInteraction(state: SessionState, interactionId: string): SessionState {
  if (state.recording || !isManualTraceInteractionId(state.events, interactionId)) return state;
  const nextEvents = state.events.filter((event) => event.interactionId !== interactionId);
  if (nextEvents.length === state.events.length) return state;

  const pausedByBreakpoint = state.pausedByBreakpoint?.interactionId === interactionId
    ? undefined
    : state.pausedByBreakpoint;

  const next: SessionState = {
    ...state,
    events: nextEvents,
  };

  if (pausedByBreakpoint) next.pausedByBreakpoint = pausedByBreakpoint;
  else delete next.pausedByBreakpoint;

  return next;
}

export function resetSessionState(state: SessionState, tabId = state.tabId): SessionState {
  return {
    ...emptySessionState(tabId),
    breakpoints: normalizeRuntimeBreakpointSettings(state.breakpoints),
  };
}

export function setSessionRecordingState(
  state: SessionState,
  enabled: boolean,
  startedAt?: number,
): SessionState {
  const { pausedByBreakpoint: _paused, ...rest } = state;
  return {
    ...rest,
    recording: enabled,
    ...(enabled && startedAt ? { startedAt } : {}),
  };
}

export function updateSessionBreakpoints(
  state: SessionState,
  breakpoints: RuntimeBreakpointSettings,
): SessionState {
  return {
    ...state,
    breakpoints: normalizeRuntimeBreakpointSettings(breakpoints),
  };
}

export function updateSessionScan(state: SessionState, scan: ScanResult): SessionState {
  return { ...state, scan };
}

export function invalidateSessionScanForUrl(state: SessionState, url: string): SessionState {
  if (!state.scan || comparableDocumentUrl(state.scan.url) === comparableDocumentUrl(url)) return state;
  const { scan: _scan, ...rest } = state;
  return rest;
}
