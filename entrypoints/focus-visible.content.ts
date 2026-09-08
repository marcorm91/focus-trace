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
import { createRuntimeEventId as uid } from '../lib/runtime/events';
import { focusWalkCandidates } from '../lib/runtime/focus-walk';
import { snapshot } from '../lib/runtime/page-inspection';
import type { ExtensionMessage, RuntimeEvent, SessionState } from '../shared/types';

type FocusDirection = 'forward' | 'backward';

type LocalMessage = ExtensionMessage | FocusVisibleCaptureMessage | { type: 'FOCUSTRACE_FOCUS_VISIBLE_PING' };

const FOCUSED_STABILITY_MS = 1_000;
const CAPTURE_PAIR_GAP_MS = 120;
const TAB_INTENT_TIMEOUT_MS = 500;
const CORRELATION_WINDOW_MS = 2_500;

function viewportState(): FocusVisibleViewportState {
  return {
    width: innerWidth,
    height: innerHeight,
    scrollX,
    scrollY,
  };
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
    let baselines = new Map<string, FocusVisibleBaseline>();
    const reportedSelectors = new Set<string>();

    const resetProbe = () => {
      focusVersion += 1;
      pendingTabIntent = undefined;
      pendingTabIntentVersion += 1;
      baselines.clear();
      reportedSelectors.clear();
    };

    const sleep = (ms: number) => new Promise((resolve) => ctx.setTimeout(resolve, ms));

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

    const interactionIdFor = async (selector: string): Promise<string | undefined> => {
      const state = await browser.runtime.sendMessage({
        type: 'FOCUSTRACE_GET_CONTENT_STATE',
      } satisfies ExtensionMessage).catch(() => undefined) as SessionState | undefined;
      if (!state) return undefined;
      const now = Date.now();
      const event = [...state.events].reverse().find((candidate) =>
        candidate.kind === 'focus'
        && candidate.element?.selector === selector
        && candidate.interactionId
        && now - candidate.timestamp <= CORRELATION_WINDOW_MS,
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
      const version = pendingTabIntentVersion;
      ctx.setTimeout(() => {
        if (pendingTabIntentVersion === version) pendingTabIntent = undefined;
      }, TAB_INTENT_TIMEOUT_MS);
    }, true);

    ctx.addEventListener(document, 'pointerdown', () => {
      pendingTabIntent = undefined;
      pendingTabIntentVersion += 1;
    }, true);

    ctx.addEventListener(document, 'focusin', (rawEvent) => {
      if (!recording || !pendingTabIntent) return;
      const event = rawEvent as FocusEvent;
      pendingTabIntent = undefined;
      pendingTabIntentVersion += 1;
      if (!(event.target instanceof Element)) return;
      focusVersion += 1;
      const version = focusVersion;
      void inspectFocusedElement(event.target, version);
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
