import { browser, defineContentScript } from '#imports';
import {
  compareFocusVisibleSamples,
  createFocusVisibleReviewEvent,
  cropFocusVisibleFrame,
  focusVisibleRegionFromRect,
  viewportStateMatches,
  type FocusVisibleBaseline,
  type FocusVisibleCaptureMessage,
  type FocusVisiblePixelFrame,
  type FocusVisibleViewportState,
} from '../lib/runtime/focus-visible';
import {
  activeSemanticContrastStates,
  interactiveContrastSettleDelay,
  interactiveTextContrastReviews,
  type RuntimeContrastState,
} from '../lib/runtime/interactive-contrast';
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
import { focusWalkCandidates, sequentialFocusPosition } from '../lib/runtime/focus-walk';
import { isDialogOpen, isModalDialog, snapshot } from '../lib/runtime/page-inspection';
import type { ExtensionMessage, RuntimeEvent, SessionState } from '../shared/types';

type FocusDirection = 'forward' | 'backward';

type LocalMessage = ExtensionMessage | FocusVisibleCaptureMessage | { type: 'FOCUSTRACE_FOCUS_VISIBLE_PING' };

const FOCUSED_STABILITY_MS = 1_000;
const CAPTURE_PAIR_GAP_MS = 120;
const TAB_INTENT_TIMEOUT_MS = 500;
const KEYBOARD_TRAP_TAB_SETTLE_MS = 180;
const CORRELATION_WINDOW_MS = 2_500;

function viewportState(): FocusVisibleViewportState {
  return {
    width: innerWidth,
    height: innerHeight,
    scrollX,
    scrollY,
  };
}

function containingOpenModal(element: Element): boolean {
  const dialog = element.closest('dialog, [role="dialog"], [role="alertdialog"]');
  return Boolean(dialog && isDialogOpen(dialog) && isModalDialog(dialog));
}

async function decodeCapture(dataUrl: string): Promise<FocusVisiblePixelFrame | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener('load', () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (width <= 0 || height <= 0) {
        resolve(undefined);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        resolve(undefined);
        return;
      }
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, width, height);
      resolve({ width, height, data: pixels.data });
    }, { once: true });
    image.addEventListener('error', () => resolve(undefined), { once: true });
    image.src = dataUrl;
  });
}

export default defineContentScript({
  registration: 'runtime',
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main(ctx) {
    let recording = false;
    let explicitStateVersion = 0;
    let focusVersion = 0;
    let pendingTabIntent: FocusDirection | undefined;
    let pendingTabIntentVersion = 0;
    let keyboardPendingTabVersion = 0;
    let keyboardPendingTab: KeyboardTrapFocusInput | undefined;
    let baselines = new Map<string, FocusVisibleBaseline>();
    const reportedSelectors = new Set<string>();
    const reportedRuleTargets = new Set<string>();
    const reportedInteractiveContrast = new Set<string>();
    const interactiveProbeVersions = new Map<string, number>();
    const keyboardTrapTracker = new KeyboardTrapTracker();
    const pointerCancellationTracker = new PointerCancellationTracker();

    const resetProbe = () => {
      focusVersion += 1;
      pendingTabIntent = undefined;
      pendingTabIntentVersion += 1;
      keyboardPendingTab = undefined;
      keyboardPendingTabVersion += 1;
      keyboardTrapTracker.reset();
      pointerCancellationTracker.reset();
      baselines.clear();
      reportedSelectors.clear();
      reportedRuleTargets.clear();
      reportedInteractiveContrast.clear();
      interactiveProbeVersions.clear();
    };

    const sleep = (ms: number) => new Promise<void>((resolve) => {
      ctx.setTimeout(() => resolve(), ms);
    });

    const captureViewport = async (): Promise<FocusVisiblePixelFrame | undefined> => {
      const dataUrl = await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_CAPTURE_VIEWPORT',
      } satisfies FocusVisibleCaptureMessage).catch(() => undefined);
      return typeof dataUrl === 'string' ? decodeCapture(dataUrl) : undefined;
    };

    const capturePair = async (): Promise<{
      first: FocusVisiblePixelFrame;
      second: FocusVisiblePixelFrame;
      viewport: FocusVisibleViewportState;
    } | undefined> => {
      const before = viewportState();
      const first = await captureViewport();
      if (!first || !recording) return undefined;
      await sleep(CAPTURE_PAIR_GAP_MS);
      const second = await captureViewport();
      if (!second || !recording) return undefined;
      const after = viewportState();
      if (!viewportStateMatches(before, after)) return undefined;
      if (first.width !== second.width || first.height !== second.height) return undefined;
      return { first, second, viewport: after };
    };

    const interactionIdFor = async (
      selector: string,
      kinds: RuntimeEvent['kind'][] = ['focus'],
    ): Promise<string | undefined> => {
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

    const emitReview = async (
      element: Element,
      baseline: FocusVisibleBaseline,
      totalPixels: number,
    ) => {
      if (reportedSelectors.has(baseline.selector)) return;
      const event = createFocusVisibleReviewEvent({
        element: snapshot(element),
        region: baseline.region,
        totalPixels,
      });
      const interactionId = await interactionIdFor(baseline.selector);
      const runtimeEvent: RuntimeEvent = {
        id: uid(),
        timestamp: Date.now(),
        ...event,
        ...(interactionId ? { interactionId } : {}),
      };
      reportedSelectors.add(baseline.selector);
      await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_EVENT',
        event: runtimeEvent,
      } satisfies ExtensionMessage).catch(() => undefined);
    };

    const emitRuntimeReview = async (
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

    const emitInteractiveContrastReview = async (
      event: Omit<RuntimeEvent, 'id' | 'timestamp'>,
      state: RuntimeContrastState,
      correlationKinds: RuntimeEvent['kind'][] = [],
    ) => {
      const selector = event.element?.selector ?? 'unknown';
      const subject = event.detail?.match(/(?:^| · )subject=([^·]+)/)?.[1]?.trim() ?? 'text';
      const dedupeKey = `${event.ruleId ?? event.title}:${state}:${selector}:${subject}`;
      if (reportedInteractiveContrast.has(dedupeKey)) return;

      const interactionId = correlationKinds.length
        ? await interactionIdFor(selector, correlationKinds)
        : undefined;
      const runtimeEvent: RuntimeEvent = {
        id: uid(),
        timestamp: Date.now(),
        ...event,
        ...(interactionId ? { interactionId } : {}),
      };
      reportedInteractiveContrast.add(dedupeKey);
      await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_EVENT',
        event: runtimeEvent,
      } satisfies ExtensionMessage).catch(() => undefined);
    };

    const scheduleInteractiveContrast = (
      element: Element,
      state: RuntimeContrastState,
      correlationKinds: RuntimeEvent['kind'][] = [],
    ) => {
      if (!recording || !element.isConnected) return;
      const selector = snapshot(element).selector;
      const probeKey = `${state}:${selector}`;
      const version = (interactiveProbeVersions.get(probeKey) ?? 0) + 1;
      interactiveProbeVersions.set(probeKey, version);
      const delay = interactiveContrastSettleDelay(element);

      ctx.setTimeout(() => {
        if (!recording || interactiveProbeVersions.get(probeKey) !== version || !element.isConnected) return;
        const reviews = interactiveTextContrastReviews(element, state);
        for (const review of reviews) {
          void emitInteractiveContrastReview(review, state, correlationKinds);
        }
      }, delay);
    };

    const tabInputFor = (element: Element, direction: TabDirection): KeyboardTrapFocusInput => {
      const focusPosition = sequentialFocusPosition(element);
      const elementSnapshot = snapshot(element, focusPosition);
      return {
        selector: elementSnapshot.selector,
        element: elementSnapshot,
        direction,
        tabOrderSize: focusPosition?.size ?? 0,
        inModal: containingOpenModal(element),
      };
    };

    const primeNeighborBaselines = (
      focusedElement: Element,
      captures: { first: FocusVisiblePixelFrame; second: FocusVisiblePixelFrame; viewport: FocusVisibleViewportState },
    ) => {
      const candidates = focusWalkCandidates(document);
      const currentIndex = candidates.findIndex((candidate) => candidate.element === focusedElement);
      baselines = new Map();
      if (currentIndex < 0) return;

      for (const index of [currentIndex - 1, currentIndex + 1]) {
        const candidate = candidates[index];
        if (!candidate || candidate.element === focusedElement) continue;
        const region = focusVisibleRegionFromRect(
          candidate.element.getBoundingClientRect(),
          captures.viewport.width,
          captures.viewport.height,
        );
        if (!region) continue;
        const first = cropFocusVisibleFrame(
          captures.first,
          region,
          captures.viewport.width,
          captures.viewport.height,
        );
        const second = cropFocusVisibleFrame(
          captures.second,
          region,
          captures.viewport.width,
          captures.viewport.height,
        );
        if (!first || !second) continue;
        baselines.set(candidate.selector, {
          selector: candidate.selector,
          region,
          viewport: captures.viewport,
          first,
          second,
        });
      }
    };

    const inspectFocusedElement = async (element: Element, version: number) => {
      await sleep(FOCUSED_STABILITY_MS);
      if (!recording || focusVersion !== version || document.activeElement !== element) return;

      const captures = await capturePair();
      if (!captures || !recording || focusVersion !== version || document.activeElement !== element) return;

      const selector = snapshot(element).selector;
      const baseline = baselines.get(selector);
      if (baseline && viewportStateMatches(baseline.viewport, captures.viewport)) {
        const focusedFirst = cropFocusVisibleFrame(
          captures.first,
          baseline.region,
          captures.viewport.width,
          captures.viewport.height,
        );
        const focusedSecond = cropFocusVisibleFrame(
          captures.second,
          baseline.region,
          captures.viewport.width,
          captures.viewport.height,
        );
        if (focusedFirst && focusedSecond) {
          const comparison = compareFocusVisibleSamples(
            baseline.first,
            baseline.second,
            focusedFirst,
            focusedSecond,
          );
          if (comparison.outcome === 'unchanged') {
            await emitReview(element, baseline, comparison.totalPixels);
          }
        }
      }

      if (!recording || focusVersion !== version || document.activeElement !== element) return;
      primeNeighborBaselines(element, captures);
    };

    ctx.addEventListener(document, 'keydown', (rawEvent) => {
      const event = rawEvent as KeyboardEvent;
      if (!recording || !event.isTrusted || event.key !== 'Tab') return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      pendingTabIntent = event.shiftKey ? 'backward' : 'forward';
      pendingTabIntentVersion += 1;
      const focusVisibleVersion = pendingTabIntentVersion;
      ctx.setTimeout(() => {
        if (pendingTabIntentVersion === focusVisibleVersion) pendingTabIntent = undefined;
      }, TAB_INTENT_TIMEOUT_MS);

      const active = document.activeElement;
      if (!(active instanceof Element) || active === document.body || active === document.documentElement) return;
      const direction: TabDirection = event.shiftKey ? 'backward' : 'forward';
      keyboardPendingTab = tabInputFor(active, direction);
      keyboardPendingTabVersion += 1;
      const keyboardVersion = keyboardPendingTabVersion;
      ctx.setTimeout(() => {
        if (!recording || keyboardPendingTabVersion !== keyboardVersion || !keyboardPendingTab) return;
        const activeElement = document.activeElement;
        const stillFocused = activeElement instanceof Element
          && snapshot(activeElement).selector === keyboardPendingTab.selector;
        const input = keyboardPendingTab;
        keyboardPendingTab = undefined;
        if (!stillFocused) return;
        const observation = keyboardTrapTracker.recordNoMove(input);
        if (observation) void emitRuntimeReview(createKeyboardTrapReviewEvent(observation), ['keydown', 'focus']);
      }, KEYBOARD_TRAP_TAB_SETTLE_MS);
    }, true);

    ctx.addEventListener(document, 'pointerover', (rawEvent) => {
      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted || !(event.target instanceof Element)) return;
      const target = observedPointerActionTarget(event.target);
      if (!target) return;
      const previousTarget = event.relatedTarget instanceof Element
        ? observedPointerActionTarget(event.relatedTarget)
        : undefined;
      if (previousTarget === target) return;
      scheduleInteractiveContrast(target, 'hover');
    }, true);

    ctx.addEventListener(document, 'pointerdown', (rawEvent) => {
      pendingTabIntent = undefined;
      pendingTabIntentVersion += 1;
      keyboardPendingTab = undefined;
      keyboardPendingTabVersion += 1;

      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted || !(event.target instanceof Element)) return;
      const target = observedPointerActionTarget(event.target);
      if (!target) return;
      pointerCancellationTracker.start(event.pointerId, target, snapshot(target), location.href);
      scheduleInteractiveContrast(target, 'active');
    }, true);

    ctx.addEventListener(document, 'pointerup', (rawEvent) => {
      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted) return;
      const observation = pointerCancellationTracker.finish(event.pointerId, 'up', location.href);
      if (observation) void emitRuntimeReview(createPointerCancellationReviewEvent(observation), ['click']);
    }, true);

    ctx.addEventListener(document, 'pointercancel', (rawEvent) => {
      const event = rawEvent as PointerEvent;
      if (!recording || !event.isTrusted) return;
      const observation = pointerCancellationTracker.finish(event.pointerId, 'cancel', location.href);
      if (observation) void emitRuntimeReview(createPointerCancellationReviewEvent(observation), ['click']);
    }, true);

    ctx.addEventListener(document, 'click', (rawEvent) => {
      const event = rawEvent as MouseEvent;
      if (!recording || !event.isTrusted || !(event.target instanceof Element)) return;
      const target = observedPointerActionTarget(event.target);
      if (!target) return;
      const review = keyboardOperabilityReviewForPointerAction(target, snapshot(target));
      if (review) void emitRuntimeReview(review, ['click']);
      for (const state of activeSemanticContrastStates(target)) {
        scheduleInteractiveContrast(target, state, ['click']);
      }
    }, true);

    ctx.addEventListener(document, 'focusin', (rawEvent) => {
      if (!recording) return;
      const event = rawEvent as FocusEvent;
      if (!(event.target instanceof Element)) return;

      if (pendingTabIntent) {
        const contrastState: RuntimeContrastState = event.target.matches(':focus-visible')
          ? 'focus-visible'
          : 'focus';
        scheduleInteractiveContrast(event.target, contrastState, ['keydown', 'focus']);

        pendingTabIntent = undefined;
        pendingTabIntentVersion += 1;
        focusVersion += 1;
        const version = focusVersion;
        void inspectFocusedElement(event.target, version);
      }

      if (keyboardPendingTab) {
        const direction = keyboardPendingTab.direction;
        keyboardPendingTab = undefined;
        keyboardPendingTabVersion += 1;
        const observation = keyboardTrapTracker.recordFocus(tabInputFor(event.target, direction));
        if (observation) void emitRuntimeReview(createKeyboardTrapReviewEvent(observation), ['keydown', 'focus']);
      }
    }, true);

    browser.runtime.onMessage.addListener((message: LocalMessage) => {
      if (message.type === 'FOCUSTRACE_FOCUS_VISIBLE_PING') return Promise.resolve(true);
      if (message.type !== 'FOCUSTRACE_SET_RECORDING') return;
      explicitStateVersion += 1;
      recording = message.enabled;
      resetProbe();
      return Promise.resolve({ recording });
    });

    const restoreVersion = explicitStateVersion;
    void browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_CONTENT_STATE',
    } satisfies ExtensionMessage).then((state: SessionState | undefined) => {
      if (!state || explicitStateVersion !== restoreVersion) return;
      recording = state.recording;
      resetProbe();
    }).catch(() => undefined);

    ctx.onInvalidated(resetProbe);
  },
});
