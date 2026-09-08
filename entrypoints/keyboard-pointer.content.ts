import { browser, defineContentScript } from '#imports';
import {
  createKeyboardTrapReviewEvent,
  createPointerCancellationReviewEvent,
  KeyboardTrapTracker,
  keyboardOperabilityReviewForPointerAction,
  observedPointerActionTarget,
  PointerCancellationTracker,
  type KeyboardTrapFocusInput,
  type TabDirection,
} from '../lib/runtime/keyboard-pointer';
import { createRuntimeEventId as uid } from '../lib/runtime/events';
import { sequentialFocusPosition } from '../lib/runtime/focus-walk';
import { isDialogOpen, isModalDialog, snapshot } from '../lib/runtime/page-inspection';
import type { ExtensionMessage, RuntimeEvent, SessionState } from '../shared/types';

type LocalMessage = ExtensionMessage | { type: 'FOCUSTRACE_KEYBOARD_POINTER_PING' };

const TAB_SETTLE_MS = 180;
const CORRELATION_WINDOW_MS = 2_500;

function containingOpenModal(element: Element): boolean {
  const dialog = element.closest('dialog, [role="dialog"], [role="alertdialog"]');
  return Boolean(dialog && isDialogOpen(dialog) && isModalDialog(dialog));
}

export default defineContentScript({
  registration: 'runtime',
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main(ctx) {
    let recording = false;
    let explicitStateVersion = 0;
    let pendingTabVersion = 0;
    let pendingTab: KeyboardTrapFocusInput | undefined;
    const keyboardTrapTracker = new KeyboardTrapTracker();
    const pointerCancellationTracker = new PointerCancellationTracker();
    const reportedRuleTargets = new Set<string>();

    const reset = () => {
      pendingTabVersion += 1;
      pendingTab = undefined;
      keyboardTrapTracker.reset();
      pointerCancellationTracker.reset();
      reportedRuleTargets.clear();
    };

    const interactionIdFor = async (selector: string, kinds: RuntimeEvent['kind'][]): Promise<string | undefined> => {
      const state = await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_GET_CONTENT_STATE',
      } satisfies ExtensionMessage).catch(() => undefined) as SessionState | undefined;
      if (!state) return undefined;
      const now = Date.now();
      const event = [...state.events].reverse().find((candidate) =>
        Boolean(candidate.interactionId)
        && kinds.includes(candidate.kind)
        && now - candidate.timestamp <= CORRELATION_WINDOW_MS
        && (!candidate.element?.selector || candidate.element.selector === selector),
      );
      return event?.interactionId;
    };

    const emit = async (
      event: Omit<RuntimeEvent, 'id' | 'timestamp'>,
      correlationKinds: RuntimeEvent['kind'][] = [],
    ) => {
      const selector = event.element?.selector ?? 'unknown';
      const ruleId = event.ruleId ?? event.title;
      const dedupeKey = `${ruleId}:${selector}`;
      if (reportedRuleTargets.has(dedupeKey)) return;

      const interactionId = correlationKinds.length
        ? await interactionIdFor(selector, correlationKinds)
        : undefined;
      const runtimeEvent: RuntimeEvent = {
        id: uid(),
        timestamp: Date.now(),
        ...event,
        ...(interactionId ? { interactionId } : {}),
      };
      reportedRuleTargets.add(dedupeKey);
      await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_EVENT',
        event: runtimeEvent,
      } satisfies ExtensionMessage).catch(() => undefined);
    };

    const tabInputFor = (element: Element, direction: TabDirection): KeyboardTrapFocusInput => {
      const focusPosition = sequentialFocusPosition(element);
      return {
        selector: snapshot(element, focusPosition).selector,
        element: snapshot(element, focusPosition),
        direction,
        tabOrderSize: focusPosition?.size ?? 0,
        inModal: containingOpenModal(element),
      };
    };

    ctx.addEventListener(document, 'keydown', (rawEvent) => {
      const event = rawEvent as KeyboardEvent;
      if (!recording || !event.isTrusted || event.key !== 'Tab') return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const active = document.activeElement;
      if (!(active instanceof Element) || active === document.body || active === document.documentElement) return;

      const direction: TabDirection = event.shiftKey ? 'backward' : 'forward';
      pendingTab = tabInputFor(active, direction);
      pendingTabVersion += 1;
      const version = pendingTabVersion;
      ctx.setTimeout(() => {
        if (!recording || pendingTabVersion !== version || !pendingTab) return;
        const stillFocused = document.activeElement instanceof Element
          && snapshot(document.activeElement).selector === pendingTab.selector;
        const input = pendingTab;
        pendingTab = undefined;
        if (!stillFocused) return;
        const observation = keyboardTrapTracker.recordNoMove(input);
        if (observation) void emit(createKeyboardTrapReviewEvent(observation), ['keydown', 'focus']);
      }, TAB_SETTLE_MS);
    }, true);

    ctx.addEventListener(document, 'focusin', (rawEvent) => {
      if (!recording || !pendingTab) return;
      const event = rawEvent as FocusEvent;
      if (!(event.target instanceof Element)) return;
      const direction = pendingTab.direction;
      pendingTab = undefined;
      pendingTabVersion += 1;
      const observation = keyboardTrapTracker.recordFocus(tabInputFor(event.target, direction));
      if (observation) void emit(createKeyboardTrapReviewEvent(observation), ['keydown', 'focus']);
    }, true);

    ctx.addEventListener(document, 'pointerdown', (rawEvent) => {
      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted || !(event.target instanceof Element)) return;
      pendingTab = undefined;
      pendingTabVersion += 1;
      const target = observedPointerActionTarget(event.target);
      if (!target) return;
      pointerCancellationTracker.start(event.pointerId, target, snapshot(target), location.href);
    }, true);

    ctx.addEventListener(document, 'pointerup', (rawEvent) => {
      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted) return;
      const observation = pointerCancellationTracker.finish(event.pointerId, 'up', location.href);
      if (observation) void emit(createPointerCancellationReviewEvent(observation), ['click']);
    }, true);

    ctx.addEventListener(document, 'pointercancel', (rawEvent) => {
      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted) return;
      const observation = pointerCancellationTracker.finish(event.pointerId, 'cancel', location.href);
      if (observation) void emit(createPointerCancellationReviewEvent(observation), ['click']);
    }, true);

    ctx.addEventListener(document, 'click', (rawEvent) => {
      const event = rawEvent as MouseEvent;
      if (!recording || !event.isTrusted || !(event.target instanceof Element)) return;
      const target = observedPointerActionTarget(event.target);
      if (!target) return;
      const review = keyboardOperabilityReviewForPointerAction(target, snapshot(target));
      if (review) void emit(review, ['click']);
    }, true);

    browser.runtime.onMessage.addListener((message: LocalMessage) => {
      if (message.type === 'FOCUSTRACE_KEYBOARD_POINTER_PING') return Promise.resolve(true);
      if (message.type !== 'FOCUSTRACE_SET_RECORDING') return;
      explicitStateVersion += 1;
      recording = message.enabled;
      reset();
      return Promise.resolve({ recording });
    });

    const restoreVersion = explicitStateVersion;
    void browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_CONTENT_STATE',
    } satisfies ExtensionMessage).then((state: SessionState | undefined) => {
      if (!state || explicitStateVersion !== restoreVersion) return;
      recording = state.recording;
      reset();
    }).catch(() => undefined);

    ctx.onInvalidated(reset);
  },
});
