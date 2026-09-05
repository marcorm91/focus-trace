import { browser, defineContentScript } from '#imports';
import { INTERACTION_WINDOW_MS } from '../lib/runtime/causality';
import { createRuntimeEventId } from '../lib/runtime/events';
import {
  createStatusMessageReviewEvent,
  findPotentialStatusMessages,
  statusMessageFingerprint,
} from '../lib/runtime/status-messages';
import type { ExtensionMessage, RuntimeEvent, SessionState } from '../shared/types';

const STABILIZATION_MS = 240;
const FOCUS_CONTEXT_GRACE_MS = 40;

type PendingCandidate = {
  element: Element;
  observedAt: number;
};

type StatusMessageControlMessage =
  | ExtensionMessage
  | { type: 'FOCUSTRACE_STATUS_MESSAGES_PING' };

function isActivationTrigger(event: RuntimeEvent): boolean {
  if (!event.interactionId) return false;
  if (event.kind === 'click') return true;
  if (event.kind !== 'keydown') return false;
  return /^Key:\s*(?:Enter|Space)$/.test(event.title);
}

function recentTrigger(state: SessionState, observedAt: number): RuntimeEvent | undefined {
  return [...state.events]
    .reverse()
    .find((event) =>
      isActivationTrigger(event)
      && event.timestamp <= observedAt
      && observedAt - event.timestamp <= INTERACTION_WINDOW_MS,
    );
}

function changedContextAfterObservation(state: SessionState, observedAt: number): boolean {
  return state.events.some((event) => {
    if (event.timestamp <= observedAt + FOCUS_CONTEXT_GRACE_MS) return false;
    if (event.kind === 'route') return true;
    if (event.kind === 'focus') return true;
    if (event.kind === 'dialog-open') return true;
    return false;
  });
}

function isFocusTraceUi(element: Element): boolean {
  return Boolean(element.closest('[data-focustrace-focus-walk-backdrop]'));
}

export default defineContentScript({
  registration: 'status-messages',
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main(ctx) {
    let recording = false;
    let explicitStateVersion = 0;
    let observerActive = false;
    const pending = new Map<Element, number>();
    const emitted = new Set<string>();

    const stop = () => {
      if (observerActive) {
        observer.disconnect();
        observerActive = false;
      }
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };

    const evaluate = async ({ element, observedAt }: PendingCandidate) => {
      pending.delete(element);
      if (!recording || !element.isConnected || isFocusTraceUi(element)) return;
      if (document.activeElement === element || (document.activeElement instanceof Element && element.contains(document.activeElement))) {
        return;
      }

      let state: SessionState | undefined;
      try {
        state = await browser.runtime.sendMessage({
          type: 'FOCUSTRACE_GET_CONTENT_STATE',
        } satisfies ExtensionMessage) as SessionState | undefined;
      } catch {
        return;
      }
      if (!recording || !state?.recording) return;

      const trigger = recentTrigger(state, observedAt);
      if (!trigger?.interactionId) return;
      if (changedContextAfterObservation(state, observedAt)) return;

      const finding = createStatusMessageReviewEvent(element);
      if (!finding) return;

      const key = `${trigger.interactionId}|${statusMessageFingerprint(element)}`;
      if (emitted.has(key)) return;
      emitted.add(key);

      const event: RuntimeEvent = {
        id: createRuntimeEventId(),
        timestamp: Date.now(),
        ...finding,
        interactionId: trigger.interactionId,
      };
      void browser.runtime.sendMessage({ type: 'FOCUSTRACE_EVENT', event } satisfies ExtensionMessage).catch(() => undefined);
    };

    const schedule = (element: Element, observedAt = Date.now()) => {
      if (!recording || isFocusTraceUi(element)) return;
      const existing = pending.get(element);
      if (existing != null) clearTimeout(existing);
      const timer = ctx.setTimeout(() => void evaluate({ element, observedAt }), STABILIZATION_MS);
      pending.set(element, timer);
    };

    const observer = new MutationObserver((mutations) => {
      if (!recording) return;
      const observedAt = Date.now();

      for (const mutation of mutations) {
        const mutationElement = mutation.target instanceof Element
          ? mutation.target
          : mutation.target.parentElement;
        if (mutationElement && isFocusTraceUi(mutationElement)) continue;

        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            for (const candidate of findPotentialStatusMessages(node)) schedule(candidate, observedAt);
          }
          if (mutationElement) {
            for (const candidate of findPotentialStatusMessages(mutationElement)) schedule(candidate, observedAt);
          }
          continue;
        }

        if (mutationElement) {
          for (const candidate of findPotentialStatusMessages(mutationElement)) schedule(candidate, observedAt);
        }
      }
    });

    const start = () => {
      if (observerActive) return;
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'role', 'aria-live', 'aria-busy'],
      });
      observerActive = true;
    };

    ctx.onInvalidated(stop);

    browser.runtime.onMessage.addListener((message: StatusMessageControlMessage) => {
      if (message.type === 'FOCUSTRACE_STATUS_MESSAGES_PING') return 'FOCUSTRACE_STATUS_MESSAGES_READY';
      if (message.type !== 'FOCUSTRACE_SET_RECORDING') return;
      explicitStateVersion += 1;
      recording = message.enabled;
      emitted.clear();
      if (recording) start();
      else stop();
    });

    const restoreVersion = explicitStateVersion;
    void browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_CONTENT_STATE',
    } satisfies ExtensionMessage).then((state: SessionState | undefined) => {
      if (!state || explicitStateVersion !== restoreVersion) return;
      recording = state.recording;
      if (recording) start();
      else stop();
    }).catch(() => undefined);
  },
});
