import { browser, defineContentScript } from '#imports';
import { accessibleName, isProgrammaticallyHidden, selectorFor } from '../lib/audit/dom';
import {
  createRuntimeBreakpointHits,
  defaultRuntimeBreakpointSettings,
  normalizeRuntimeBreakpointSettings,
} from '../lib/runtime/breakpoints';
import { RuntimeInteractionTracker } from '../lib/runtime/causality';
import {
  createDialogCloseEvent,
  createDialogFocusEscapeEvent,
  createDialogOpenEvent,
  createDialogRestoreFocusEvent,
} from '../lib/runtime/dialog-events';
import { createRuntimeEventId as uid } from '../lib/runtime/events';
import {
  createFocusEvent,
  createFocusHiddenEvent,
  createFocusLostEvent,
  createFocusObscuredEvent,
  createFocusWalkEndEvent,
  createFocusWalkStartEvent,
} from '../lib/runtime/focus-events';
import { createClickEvent, createKeydownEvent } from '../lib/runtime/interaction-events';
import { createLiveRegionEvent, createMutationEvent } from '../lib/runtime/mutation-events';
import {
  actionTarget,
  findDialogs,
  findSignificantAddedElements,
  isDialogOpen,
  isModalDialog,
  mayBeCompletelyObscured,
  snapshot,
} from '../lib/runtime/page-inspection';
import {
  createRouteChangeEvent,
  createRouteFocusUnchangedEvent,
  createRouteTitleUnchangedEvent,
} from '../lib/runtime/route-events';
import { focusWalkCandidates, isFocusWalkCandidateStillUsable } from '../lib/runtime/focus-walk';
import { showFocusWalkBackdropInPage } from '../lib/runtime/focus-walk-backdrop';
import { runFocusTraceScan } from '../lib/audit/scan';
import type {
  ExtensionMessage,
  FocusWalkOptions,
  FocusWalkResult,
  RuntimeEvent,
  RuntimeMutationSnapshot,
  SessionState,
} from '../shared/types';

interface DialogState {
  element: Element;
  trigger: Element | null;
  openedAt: number;
}

export default defineContentScript({
  registration: 'runtime',
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main(ctx) {
    let recording = false;
    let explicitStateVersion = 0;
    let breakpointSettings = defaultRuntimeBreakpointSettings();
    let lastFocused: Element | null = document.activeElement instanceof Element ? document.activeElement : null;
    let lastActionElement: Element | null = null;
    let lastUrl = location.href;
    let lastTitle = document.title;
    let focusVersion = 0;
    let hiddenFocusReported: Element | null = null;
    let focusWalkRunning = false;
    const interactionTracker = new RuntimeInteractionTracker();
    const dialogs = new Map<Element, DialogState>();

    for (const dialog of document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]')) {
      dialogs.set(dialog, { element: dialog, trigger: null, openedAt: Date.now() });
    }

    const activeInteractionId = (timestamp = Date.now()): string | undefined =>
      interactionTracker.current(timestamp);

    const beginInteraction = (
      source: 'keyboard' | 'pointer',
      target: Element | null,
      activationKey?: string,
    ): string =>
      interactionTracker.begin(
        source,
        target ? selectorFor(target) : undefined,
        activationKey,
      );

    const emit = (
      event: Omit<RuntimeEvent, 'id' | 'timestamp'>,
      explicitInteractionId?: string,
    ) => {
      if (!recording) return;
      const timestamp = Date.now();
      const interactionId = explicitInteractionId ?? activeInteractionId(timestamp);
      if (interactionId) interactionTracker.touch(interactionId, timestamp);

      const eventId = uid();
      const breakpointHits = createRuntimeBreakpointHits({
        causes: event.causes,
        settings: breakpointSettings,
        eventId,
        timestamp,
        ...(interactionId ? { interactionId } : {}),
      });

      const runtimeEvent: RuntimeEvent = {
        id: eventId,
        timestamp,
        ...event,
        ...(interactionId ? { interactionId } : {}),
        ...(breakpointHits.length ? { breakpointHits } : {}),
      };
      const message: ExtensionMessage = { type: 'FOCUSTRACE_EVENT', event: runtimeEvent };
      void browser.runtime.sendMessage(message).catch(() => undefined);

      if (breakpointHits.length) {
        recording = false;
        interactionTracker.reset();
      }
    };

    const emitMutation = (
      mutation: RuntimeMutationSnapshot,
      detail: string,
      explicitInteractionId?: string,
    ) => {
      emit(createMutationEvent(mutation, detail), explicitInteractionId);
    };

    const inspectFocusObscured = (element: Element, interactionId?: string) =>
      requestAnimationFrame(() => {
        if (!recording || document.activeElement !== element) return;
        const result = mayBeCompletelyObscured(element);
        if (!result.obscured) return;
        emit(
          createFocusObscuredEvent({
            element: snapshot(element),
            ...(result.evidence ? { evidence: result.evidence } : {}),
          }),
          interactionId,
        );
      });

    const sleep = (ms: number) => new Promise((resolve) => ctx.setTimeout(() => resolve(undefined), ms));

    const runAutomaticFocusWalk = async (options: FocusWalkOptions = {}): Promise<FocusWalkResult> => {
      if (focusWalkRunning) {
        return { totalCandidates: 0, focusedSteps: 0, skipped: 0, stopped: true };
      }

      focusWalkRunning = true;
      const candidates = focusWalkCandidates();
      const totalCandidates = Math.min(candidates.length, options.maxSteps ?? 80);
      const delayMs = Math.min(Math.max(options.delayMs ?? 180, 60), 1000);
      const backdrop = showFocusWalkBackdropInPage(totalCandidates);
      let focusedSteps = 0;
      let skipped = candidates.length - totalCandidates;
      let stopped = false;

      emit(createFocusWalkStartEvent(totalCandidates));

      try {
        for (const [index, candidate] of candidates.slice(0, totalCandidates).entries()) {
          if (!recording) {
            stopped = true;
            break;
          }

          const { element } = candidate;
          backdrop.update(index + 1, totalCandidates);
          if (!isFocusWalkCandidateStillUsable(element)) {
            skipped += 1;
            continue;
          }

          const target = actionTarget(element);
          const interactionId = beginInteraction('keyboard', target, 'Tab');
          emit(
            createKeydownEvent({
              key: 'Tab',
              element: snapshot(target),
            }),
            interactionId,
          );

          element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
          await sleep(Math.round(delayMs / 2));
          element.focus({ preventScroll: true });
          await sleep(delayMs);

          if (document.activeElement === element) focusedSteps += 1;
          else skipped += 1;
        }
      } finally {
        emit(createFocusWalkEndEvent({ focusedSteps, totalCandidates, skipped, stopped }));
        backdrop.dispose();
        focusWalkRunning = false;
      }

      return { totalCandidates, focusedSteps, skipped, stopped };
    };

    ctx.addEventListener(
      document,
      'pointerdown',
      (rawEvent) => {
        if (!recording) return;
        const event = rawEvent as PointerEvent;
        if (!(event.target instanceof Element)) return;
        beginInteraction('pointer', actionTarget(event.target));
      },
      true,
    );

    ctx.addEventListener(
      document,
      'focusin',
      (rawEvent) => {
        const event = rawEvent as FocusEvent;
        if (!(event.target instanceof Element)) return;
        focusVersion += 1;
        lastFocused = event.target;
        hiddenFocusReported = null;
        const interactionId = activeInteractionId();

        emit(
          createFocusEvent({
            label: accessibleName(event.target) || event.target.tagName.toLowerCase(),
            element: snapshot(event.target),
          }),
          interactionId,
        );

        for (const state of dialogs.values()) {
          if (!isDialogOpen(state.element) || !isModalDialog(state.element) || state.element.contains(event.target)) continue;
          emit(
            createDialogFocusEscapeEvent({
              target: snapshot(event.target),
              targetSelector: selectorFor(event.target),
            }),
            interactionId,
          );
        }

        inspectFocusObscured(event.target, interactionId);
      },
      true,
    );

    ctx.addEventListener(
      document,
      'keydown',
      (rawEvent) => {
        const event = rawEvent as KeyboardEvent;
        if (!['Tab', 'Enter', 'Escape', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        const target = event.target instanceof Element ? actionTarget(event.target) : null;
        const interactionId = beginInteraction('keyboard', target, event.key);
        emit(
          createKeydownEvent({
            key: event.key,
            ...(target ? { element: snapshot(target) } : {}),
          }),
          interactionId,
        );
      },
      true,
    );

    ctx.addEventListener(
      document,
      'click',
      (rawEvent) => {
        const event = rawEvent as MouseEvent;
        if (!(event.target instanceof Element)) return;
        const target = actionTarget(event.target);
        const clickSelector = selectorFor(target);
        const interactionId = interactionTracker.click(clickSelector);

        lastActionElement = target;
        emit(
          createClickEvent({
            label: accessibleName(target) || target.tagName.toLowerCase(),
            element: snapshot(target),
          }),
          interactionId,
        );
      },
      true,
    );

    const registerDialog = (dialog: Element, interactionId = activeInteractionId()) => {
      if (dialogs.has(dialog)) return;
      const trigger = lastActionElement ?? lastFocused;
      dialogs.set(dialog, { element: dialog, trigger, openedAt: Date.now() });
      queueMicrotask(() => {
        if (!recording || !isDialogOpen(dialog)) return;
        const focusedInside = document.activeElement instanceof Element && dialog.contains(document.activeElement);
        emit(createDialogOpenEvent({ dialog: snapshot(dialog), focusedInside }), interactionId);
      });
    };

    const inspectClosedDialogs = () => {
      for (const [dialog, state] of [...dialogs.entries()]) {
        if (isDialogOpen(dialog)) continue;
        dialogs.delete(dialog);
        const interactionId = activeInteractionId();
        emit(createDialogCloseEvent(snapshot(dialog)), interactionId);
        ctx.setTimeout(() => {
          if (!recording || !state.trigger?.isConnected) return;
          const active = document.activeElement instanceof Element ? document.activeElement : null;
          if (active === state.trigger) return;
          emit(
            createDialogRestoreFocusEvent({
              triggerSelector: selectorFor(state.trigger),
              activeSelector: active ? selectorFor(active) : 'no element',
              ...(active ? { activeElement: snapshot(active) } : {}),
            }),
            interactionId,
          );
        }, 50);
      }
    };

    const observer = new MutationObserver((mutations) => {
      if (!recording) return;
      const interactionId = activeInteractionId();

      if (lastFocused && lastFocused !== document.body && !lastFocused.isConnected) {
        const removed = snapshot(lastFocused);
        emitMutation(
          { kind: 'node-removed', target: removed },
          'The node that held focus was removed from the document.',
          interactionId,
        );

        const active = document.activeElement instanceof Element ? document.activeElement : null;
        emit(
          createFocusLostEvent({
            removed,
            activeSelector: active === document.body ? '<body>' : active ? selectorFor(active) : 'unknown',
            fellBackToBody: active === document.body,
          }),
          interactionId,
        );
        lastFocused = active;
      }

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            for (const added of findSignificantAddedElements(node)) {
              const addedSnapshot = snapshot(added);
              emitMutation(
                { kind: 'node-added', target: addedSnapshot },
                'A dialog or autofocus-capable node was inserted into the DOM.',
                interactionId,
              );
            }
            for (const dialog of findDialogs(node)) registerDialog(dialog, interactionId);
          }
        }

        if (!(mutation.target instanceof Element)) continue;

        const live = mutation.target.closest('[aria-live], [role="status"], [role="alert"]');
        if (live) {
          emit(createLiveRegionEvent(snapshot(live), live.textContent), interactionId);
        }

        if (mutation.type === 'attributes') {
          const attribute = mutation.attributeName ?? '';
          const currentValue = attribute ? mutation.target.getAttribute(attribute) : null;
          const affectsLastFocused =
            lastFocused != null &&
            lastFocused !== document.body &&
            (mutation.target === lastFocused || mutation.target.contains(lastFocused));

          if (
            affectsLastFocused &&
            ['aria-hidden', 'hidden', 'style', 'class'].includes(attribute)
          ) {
            emitMutation(
              {
                kind: 'attribute-changed',
                target: snapshot(mutation.target),
                attribute,
                previousValue: mutation.oldValue,
                currentValue,
              },
              `${attribute} changed on the focused element or one of its ancestors.`,
              interactionId,
            );

            if (
              lastFocused &&
              lastFocused.isConnected &&
              isProgrammaticallyHidden(lastFocused) &&
              hiddenFocusReported !== lastFocused
            ) {
              hiddenFocusReported = lastFocused;
              emit(
                createFocusHiddenEvent({
                  element: snapshot(lastFocused),
                  elementSelector: selectorFor(lastFocused),
                }),
                interactionId,
              );
            }
          }

          if (attribute === 'open' && mutation.target.matches('dialog') && isDialogOpen(mutation.target)) {
            registerDialog(mutation.target, interactionId);
          }
        }
      }

      inspectClosedDialogs();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['open', 'role', 'aria-live', 'aria-modal', 'aria-hidden', 'hidden', 'class', 'style'],
    });
    ctx.onInvalidated(() => observer.disconnect());

    const routeTimer = ctx.setInterval(() => {
      if (location.href === lastUrl) return;

      const fromUrl = lastUrl;
      const previousTitle = lastTitle;
      const routeFocusVersion = focusVersion;
      const routeFocus = document.activeElement instanceof Element ? document.activeElement : null;
      const routeInteractionId = activeInteractionId();

      lastUrl = location.href;
      lastTitle = document.title;
      emit(createRouteChangeEvent(fromUrl, lastUrl), routeInteractionId);

      ctx.setTimeout(() => {
        if (!recording || focusVersion !== routeFocusVersion) return;
        const active = document.activeElement instanceof Element ? document.activeElement : null;
        emit(
          createRouteFocusUnchangedEvent({
            fromUrl,
            toUrl: lastUrl,
            activeSelector: active ? selectorFor(active) : 'no element',
            focusRemained: active === routeFocus,
            ...(active ? { activeElement: snapshot(active) } : {}),
          }),
          routeInteractionId,
        );
      }, 350);

      ctx.setTimeout(() => {
        if (!recording) return;
        if (document.title !== previousTitle) {
          lastTitle = document.title;
          return;
        }
        emit(
          createRouteTitleUnchangedEvent({
            fromUrl,
            toUrl: lastUrl,
            title: document.title,
          }),
          routeInteractionId,
        );
      }, 600);
    }, 250);
    ctx.onInvalidated(() => clearInterval(routeTimer));

    browser.runtime.onMessage.addListener((message: ExtensionMessage | { type: 'FOCUSTRACE_PING' }) => {
      if (message.type === 'FOCUSTRACE_PING') return Promise.resolve(true);

      if (message.type === 'FOCUSTRACE_CONFIGURE_BREAKPOINTS') {
        breakpointSettings = normalizeRuntimeBreakpointSettings(message.breakpoints);
        return Promise.resolve({ breakpoints: breakpointSettings });
      }

      if (message.type === 'FOCUSTRACE_SET_RECORDING') {
        explicitStateVersion += 1;
        recording = message.enabled;
        breakpointSettings = normalizeRuntimeBreakpointSettings(message.breakpoints ?? breakpointSettings);
        lastFocused = document.activeElement instanceof Element ? document.activeElement : null;
        lastActionElement = null;
        lastUrl = location.href;
        lastTitle = document.title;
        focusVersion = 0;
        hiddenFocusReported = null;
        interactionTracker.reset();
        return Promise.resolve({ recording, breakpoints: breakpointSettings });
      }

      if (message.type === 'FOCUSTRACE_RUN_SCAN') return Promise.resolve(runFocusTraceScan());
      if (message.type === 'FOCUSTRACE_RUN_FOCUS_WALK') return runAutomaticFocusWalk(message.options);
    });

    // Restore state when this script is re-created after a navigation or when
    // the side panel is closed. Recording belongs to the inspected tab, not to
    // the panel's focus lifecycle.
    const restoreVersion = explicitStateVersion;
    void browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_CONTENT_STATE',
    } satisfies ExtensionMessage).then((state: SessionState | undefined) => {
      if (!state || explicitStateVersion !== restoreVersion) return;
      recording = state.recording;
      breakpointSettings = normalizeRuntimeBreakpointSettings(state.breakpoints);
      lastFocused = document.activeElement instanceof Element ? document.activeElement : null;
      lastUrl = location.href;
      lastTitle = document.title;
    }).catch(() => undefined);
  },
});