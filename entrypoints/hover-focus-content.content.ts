import { browser, defineContentScript } from '#imports';
import {
  HoverFocusContentTracker,
  type HoverFocusRequirement,
  type HoverFocusTriggerMode,
} from '../lib/runtime/hover-focus-content';
import { createRuntimeEventId as uid } from '../lib/runtime/events';
import type { ExtensionMessage, RuntimeEvent, SessionState } from '../shared/types';

type LocalMessage = ExtensionMessage | { type: 'FOCUSTRACE_HOVER_FOCUS_PING' };

const REVEAL_SETTLE_MS = 180;
const DISMISS_SETTLE_MS = 160;
const LIFECYCLE_POLL_MS = 180;
const USER_FOCUS_WINDOW_MS = 700;
const CORRELATION_WINDOW_MS = 2_500;

function detailToken(detail: string | undefined, key: string): string | undefined {
  if (!detail) return undefined;
  return detail.match(new RegExp(`(?:^| · )${key}=([^·]+)`))?.[1]?.trim();
}

function hoverTriggerFor(target: Element): Element {
  const candidate = target.closest(
    '[aria-describedby], [aria-controls], [aria-details], button, a[href], input, select, textarea, summary, abbr, [tabindex], [role]',
  );
  if (!candidate || candidate === document.body || candidate === document.documentElement) return target;
  return candidate;
}

export default defineContentScript({
  registration: 'runtime',
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main(ctx) {
    let recording = false;
    let stateVersion = 0;
    let lastTrustedInputAt = 0;
    let lastTrustedInputKind: 'keyboard' | 'pointer' | undefined;
    let triggerVersions = new WeakMap<Element, Map<HoverFocusTriggerMode, number>>();
    const reported = new Set<string>();
    const tracker = new HoverFocusContentTracker();

    const reset = () => {
      stateVersion += 1;
      triggerVersions = new WeakMap();
      reported.clear();
      lastTrustedInputAt = 0;
      lastTrustedInputKind = undefined;
      if (recording) tracker.reset(document);
      else tracker.clear();
    };

    const interactionIdFor = async (
      selector: string,
      mode: HoverFocusTriggerMode,
    ): Promise<string | undefined> => {
      if (mode !== 'focus') return undefined;
      const state = await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_GET_CONTENT_STATE',
      } satisfies ExtensionMessage).catch(() => undefined) as SessionState | undefined;
      if (!state) return undefined;
      const now = Date.now();
      const event = [...state.events].reverse().find((candidate) =>
        Boolean(candidate.interactionId)
        && (candidate.kind === 'focus' || candidate.kind === 'keydown' || candidate.kind === 'click')
        && now - candidate.timestamp <= CORRELATION_WINDOW_MS
        && (!candidate.element?.selector || candidate.element.selector === selector),
      );
      return event?.interactionId;
    };

    const emitReview = async (event: Omit<RuntimeEvent, 'id' | 'timestamp'>) => {
      const selector = event.element?.selector ?? 'unknown';
      const requirement = detailToken(event.detail, 'requirement') as HoverFocusRequirement | undefined;
      const additional = detailToken(event.detail, 'additional') ?? 'unknown';
      const mode = (detailToken(event.detail, 'mode') ?? 'hover') as HoverFocusTriggerMode;
      const dedupeKey = `${event.ruleId ?? event.title}:${mode}:${requirement ?? 'review'}:${selector}:${additional}`;
      if (reported.has(dedupeKey)) return;

      const interactionId = await interactionIdFor(selector, mode);
      const runtimeEvent: RuntimeEvent = {
        id: uid(),
        timestamp: Date.now(),
        ...event,
        ...(interactionId ? { interactionId } : {}),
      };
      reported.add(dedupeKey);
      await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_EVENT',
        event: runtimeEvent,
      } satisfies ExtensionMessage).catch(() => undefined);
    };

    const emitReviews = (reviews: Omit<RuntimeEvent, 'id' | 'timestamp'>[]) => {
      for (const review of reviews) void emitReview(review);
    };

    const scheduleObserve = (trigger: Element, mode: HoverFocusTriggerMode) => {
      if (!recording || !trigger.isConnected) return;
      let versions = triggerVersions.get(trigger);
      if (!versions) {
        versions = new Map();
        triggerVersions.set(trigger, versions);
      }
      const version = (versions.get(mode) ?? 0) + 1;
      versions.set(mode, version);
      const currentStateVersion = stateVersion;

      ctx.setTimeout(() => {
        if (!recording || stateVersion !== currentStateVersion) return;
        if (triggerVersions.get(trigger)?.get(mode) !== version || !trigger.isConnected) return;
        tracker.observeTriggeredContent(trigger, mode, document);
      }, REVEAL_SETTLE_MS);
    };

    const pollLifecycle = (version: number) => {
      ctx.setTimeout(() => {
        if (!recording || version !== stateVersion) return;
        emitReviews(tracker.lifecycleReviews());
        emitReviews(tracker.dismissibilityReviews());
        pollLifecycle(version);
      }, LIFECYCLE_POLL_MS);
    };

    ctx.addEventListener(document, 'keydown', (rawEvent) => {
      const event = rawEvent as KeyboardEvent;
      if (!recording || !event.isTrusted) return;
      lastTrustedInputAt = Date.now();
      lastTrustedInputKind = 'keyboard';
      if (event.key !== 'Escape' || tracker.activeObservations.length === 0) return;
      tracker.markDismissalAttempt();
      const version = stateVersion;
      ctx.setTimeout(() => {
        if (!recording || version !== stateVersion) return;
        emitReviews(tracker.dismissibilityReviews());
      }, DISMISS_SETTLE_MS);
    }, true);

    ctx.addEventListener(document, 'pointerdown', (rawEvent) => {
      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted) return;
      lastTrustedInputAt = Date.now();
      lastTrustedInputKind = 'pointer';
      if (tracker.activeObservations.length > 0) tracker.markDismissalAttempt();
    }, true);

    ctx.addEventListener(document, 'pointerover', (rawEvent) => {
      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted || !(event.target instanceof Element)) return;
      const trigger = hoverTriggerFor(event.target);
      const previous = event.relatedTarget instanceof Element ? hoverTriggerFor(event.relatedTarget) : undefined;
      if (previous === trigger) return;
      scheduleObserve(trigger, 'hover');
    }, true);

    ctx.addEventListener(document, 'pointermove', (rawEvent) => {
      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted || tracker.activeObservations.length === 0) return;
      emitReviews(tracker.recordPointerPosition(event.clientX, event.clientY));
    }, true);

    ctx.addEventListener(document, 'focusin', (rawEvent) => {
      const event = rawEvent as FocusEvent;
      if (!recording || !(event.target instanceof Element)) return;
      const recentTrustedInput = Date.now() - lastTrustedInputAt <= USER_FOCUS_WINDOW_MS;
      if (!recentTrustedInput || !lastTrustedInputKind) return;
      scheduleObserve(event.target, 'focus');
    }, true);

    browser.runtime.onMessage.addListener((message: LocalMessage) => {
      if (message.type === 'FOCUSTRACE_HOVER_FOCUS_PING') return Promise.resolve(true);
      if (message.type !== 'FOCUSTRACE_SET_RECORDING') return;
      recording = message.enabled;
      reset();
      if (recording) pollLifecycle(stateVersion);
      return Promise.resolve({ recording });
    });

    const restoreVersion = stateVersion;
    void browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_CONTENT_STATE',
    } satisfies ExtensionMessage).then((state: SessionState | undefined) => {
      if (!state || stateVersion !== restoreVersion) return;
      recording = state.recording;
      reset();
      if (recording) pollLifecycle(stateVersion);
    }).catch(() => undefined);

    ctx.onInvalidated(() => {
      recording = false;
      reset();
    });
  },
});