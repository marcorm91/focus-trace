import { describe, expect, it } from 'vitest';
import { buildFocusJourney } from '../lib/runtime/focus-journey';
import {
  MAX_RUNTIME_EVENTS,
  appendRuntimeEventToSession,
  clearSessionEvents,
  emptySessionState,
  invalidateSessionScanForUrl,
  normalizeSessionState,
  resetSessionState,
  setSessionRecordingState,
  updateSessionBreakpoints,
} from '../lib/runtime/session-state';
import type { RuntimeBreakpointHit, RuntimeEvent, SessionState } from '../shared/types';

function event(id: string, overrides: Partial<RuntimeEvent> = {}): RuntimeEvent {
  return {
    id,
    timestamp: Number(id) || 1,
    kind: 'focus',
    severity: 'info',
    title: `Event ${id}`,
    ...overrides,
  };
}

function session(overrides: Partial<SessionState> = {}): SessionState {
  return {
    tabId: 7,
    recording: true,
    events: [],
    ...overrides,
  };
}

describe('runtime session state helpers', () => {
  it('creates and normalizes sessions with default breakpoint settings', () => {
    expect(emptySessionState(12)).toMatchObject({
      tabId: 12,
      recording: false,
      events: [],
      breakpoints: expect.objectContaining({
        'focused-node-removed': false,
        'dialog-opened-without-focus': false,
      }),
    });

    expect(normalizeSessionState(session({ breakpoints: undefined })).breakpoints).toEqual(
      emptySessionState(7).breakpoints,
    );
  });

  it('appends runtime events, caps history and pauses on breakpoint hits', () => {
    const breakpointHit: RuntimeBreakpointHit = {
      breakpointId: 'focused-node-removed',
      causeType: 'FOCUSED_NODE_REMOVED',
      eventId: '999',
      timestamp: 999,
      label: 'Focused node removed',
      summary: 'Focused node was removed.',
    };
    const previousEvents = Array.from({ length: MAX_RUNTIME_EVENTS }, (_, index) => event(String(index + 1)));

    const next = appendRuntimeEventToSession(
      session({ events: previousEvents }),
      event('999', { breakpointHits: [breakpointHit] }),
    );

    expect(next.recording).toBe(false);
    expect(next.pausedByBreakpoint).toBe(breakpointHit);
    expect(next.events).toHaveLength(MAX_RUNTIME_EVENTS);
    expect(next.events[0]?.id).toBe('2');
    expect(next.events.at(-1)?.id).toBe('999');
  });

  it('resets runtime evidence without losing scan or breakpoint settings', () => {
    const scan = { url: 'https://example.com/' } as SessionState['scan'];
    const current = session({
      startedAt: 1234,
      events: [event('1')],
      scan,
      pausedByBreakpoint: {
        breakpointId: 'modal-focus-escape',
        causeType: 'MODAL_FOCUS_ESCAPE',
        eventId: '1',
        timestamp: 1,
        label: 'Modal escape',
        summary: 'Focus escaped a modal.',
      },
      breakpoints: emptySessionState(7).breakpoints,
    });

    const next = clearSessionEvents(current);

    expect(next.recording).toBe(false);
    expect(next.events).toEqual([]);
    expect(next.startedAt).toBeUndefined();
    expect(next.pausedByBreakpoint).toBeUndefined();
    expect(next.scan).toBe(scan);
    expect(next.breakpoints).toBe(current.breakpoints);

    const restarted = appendRuntimeEventToSession(next, event('2', {
      element: { tag: 'button', selector: '#fresh-start', name: 'Fresh start' },
    }));
    expect(buildFocusJourney(restarted.events).steps[0]?.order).toBe(1);
  });

  it('starts over without discarding configured breakpoint preferences', () => {
    const configured = {
      ...emptySessionState(7).breakpoints,
      'focused-node-removed': true,
      'modal-focus-escape': true,
    };
    const current = session({
      startedAt: 1234,
      events: [event('1')],
      scan: { url: 'https://example.com/' } as SessionState['scan'],
      breakpoints: configured,
    });

    const reset = resetSessionState(current);

    expect(reset.recording).toBe(false);
    expect(reset.events).toEqual([]);
    expect(reset.scan).toBeUndefined();
    expect(reset.startedAt).toBeUndefined();
    expect(reset.breakpoints).toEqual(configured);
  });

  it('starts recording from a clean pause state and normalizes saved breakpoints', () => {
    const current = session({
      recording: false,
      pausedByBreakpoint: {
        breakpointId: 'route-changed-without-focus-move',
        causeType: 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE',
        eventId: '1',
        timestamp: 1,
        label: 'Route changed',
        summary: 'Route changed without focus move.',
      },
    });

    const recording = setSessionRecordingState(current, true, 1234);
    expect(recording).toMatchObject({ recording: true, startedAt: 1234 });
    expect(recording.pausedByBreakpoint).toBeUndefined();

    const breakpoints = updateSessionBreakpoints(current, {
      'focused-node-removed': true,
    } as never).breakpoints;
    expect(breakpoints).toMatchObject({
      'focused-node-removed': true,
      'focus-fell-back-to-body': false,
      'focused-element-became-hidden': false,
    });
  });

  it('invalidates stale scans when the inspected document URL changes', () => {
    const scan = { url: 'https://example.com/account?tab=profile#heading' } as SessionState['scan'];
    const current = session({ scan });

    expect(invalidateSessionScanForUrl(current, 'https://example.com/account?tab=profile#details')).toBe(current);

    const navigated = invalidateSessionScanForUrl(current, 'https://example.com/account?tab=security');
    expect(navigated).not.toBe(current);
    expect(navigated.scan).toBeUndefined();
    expect(navigated.events).toBe(current.events);
    expect(navigated.recording).toBe(current.recording);
  });
});
