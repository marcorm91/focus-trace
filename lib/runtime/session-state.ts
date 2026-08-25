import { defaultRuntimeBreakpointSettings, normalizeRuntimeBreakpointSettings } from './breakpoints';
import type {
  RuntimeBreakpointSettings,
  RuntimeEvent,
  ScanResult,
  SessionState,
} from '../../shared/types';

export const MAX_RUNTIME_EVENTS = 500;

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
    events: [...state.events, event].slice(-MAX_RUNTIME_EVENTS),
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
