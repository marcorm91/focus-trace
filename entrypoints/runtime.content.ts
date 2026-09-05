import { browser, defineContentScript } from '#imports';
import { accessibleName, isProgrammaticallyHidden, selectorFor } from '../lib/audit/dom';
import {
  captureAriaWidgetProbes,
  createDynamicDialogNameReview,
  evaluateAriaWidgetProbe,
} from '../lib/runtime/aria-widget-runtime';
import {
  captureKeyboardFocusProbes,
  evaluateKeyboardFocusProbe,
  type KeyboardFocusAction,
} from '../lib/runtime/keyboard-focus-runtime';
import {
  createRuntimeBreakpointHits,
  defaultRuntimeBreakpointSettings,
  normalizeRuntimeBreakpointSettings,
} from '../lib/runtime/breakpoints';
import { INTERACTION_WINDOW_MS, RuntimeInteractionTracker } from '../lib/runtime/causality';
import {
  createDialogCloseEvent,
  createDialogFocusEscapeEvent,
  createDialogOpenEvent,
  createDialogRestoreFocusEvent,
} from '../lib/runtime/dialog-events';
import {
  createDraggingReviewEvent,
  isPotentialDraggingTarget,
  RuntimeDragTracker,
} from '../lib/runtime/dragging';
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
import {
  focusWalkCandidates,
  isFocusWalkCandidateStillUsable,
  sequentialFocusPosition,
} from '../lib/runtime/focus-walk';
import { showFocusWalkBackdropInPage } from '../lib/runtime/focus-walk-backdrop';
import {
  createStatusMessageReviewEvent,
  findPotentialStatusMessages,
  statusMessageFingerprint,
} from '../lib/runtime/status-messages';
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

interface StatusActivation {
  interactionId: string;
  timestamp: number;
}

const DIALOG_SELECTOR = 'dialog, [role="dialog"], [role="alertdialog"]';
const DIALOG_STATE_ATTRIBUTES = new Set(['open', 'role', 'aria-hidden', 'hidden', 'class', 'style']);
const STATUS_MESSAGE_STABILIZATION_MS = 240;

function keyboardEventLabel(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Control');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Meta');
  parts.push(event.key === ' ' ? 'Space' : event.key);
  return parts.join('+');
}

function hasKeyboardModifier(action: KeyboardFocusAction): boolean {
  return action.kind === 'keydown'
    && Boolean(action.ctrlKey || action.altKey || action.shiftKey || action.metaKey);
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
    let dialogVersion = 0;
    let lastStatusActivation: StatusActivation | undefined;
    let pendingFocusIntent: 'forward' | 'backward' | 'programmatic' = 'programmatic';
    let hiddenFocusReported: Element | null = null;
    let obscuredFocusReported: Element | null = null;
    let focusObscuredFrame: number | undefined;
    let focusWalkRunning = false;
    let focusWalkCancelRequested = false;
    let observerActive = false;
    let routeTimer: number | undefined;
    const interactionTracker = new RuntimeInteractionTracker();
    const dragTracker = new RuntimeDragTracker();
    const dialogs = new Map<Element, DialogState>();
    const emittedAriaWidgetFindings = new Set<string>();
    const emittedStatusMessageFindings = new Set<string>();
    const pendingStatusMessageTimers = new Map<Element, number>();
    const pendingEventDeliveries = new Set<Promise<unknown>>();

    const clearPendingStatusMessageTimers = () => {
      for (const timer of pendingStatusMessageTimers.values()) clearTimeout(timer);
      pendingStatusMessageTimers.clear();
    };

    const resetObservedDialogs = () => {
      dialogVersion = 0;
      dialogs.clear();
      for (const dialog of document.querySelectorAll(DIALOG_SELECTOR)) {
        if (!isDialogOpen(dialog)) continue;
        dialogs.set(dialog, { element: dialog, trigger: null, openedAt: Date.now() });
      }
    };

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

    const queueRuntimeEventDelivery = (message: ExtensionMessage) => {
      const delivery = browser.runtime.sendMessage(message).catch(() => undefined);
      pendingEventDeliveries.add(delivery);
      void delivery.finally(() => pendingEventDeliveries.delete(delivery));
    };

    const flushPendingEventDeliveries = async () => {
      while (pendingEventDeliveries.size > 0) {
        await Promise.allSettled(pendingEventDeliveries);
      }
    };

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
      queueRuntimeEventDelivery({ type: 'FOCUSTRACE_EVENT', event: runtimeEvent });

      if (breakpointHits.length) {
        recording = false;
        stopInstrumentation();
        interactionTracker.reset();
        dragTracker.reset();
      }
    };

    const emitAriaWidgetFinding = (
      finding: Omit<RuntimeEvent, 'id' | 'timestamp'> | undefined,
      interactionId?: string,
    ) => {
      if (!finding) return;
      const key = [
        interactionId ?? 'ambient',
        finding.ruleId ?? finding.title,
        finding.element?.selector ?? 'session',
      ].join('|');
      if (emittedAriaWidgetFindings.has(key)) return;
      emittedAriaWidgetFindings.add(key);
      emit(finding, interactionId);
    };

    const scheduleAriaWidgetEvaluation = (
      target: Element,
      action: KeyboardFocusAction,
      interactionId: string,
    ) => {
      // Runtime APG/ARIA probes model the documented unmodified bindings.
      // Modified shortcuts remain in raw Trace evidence but are not reinterpreted
      // as the corresponding plain key behavior.
      const ariaProbes = hasKeyboardModifier(action) ? [] : captureAriaWidgetProbes(target, action);
      const keyboardFocusProbes = captureKeyboardFocusProbes(target, action);
      if (!ariaProbes.length && !keyboardFocusProbes.length) return;
      ctx.setTimeout(() => {
        if (!recording) return;
        for (const probe of ariaProbes) {
          const finding = evaluateAriaWidgetProbe(probe);
          // Virtual focus is chronological evidence, so it is emitted from the
          // actual aria-activedescendant mutation instead of this stabilized pass.
          if (finding?.kind === 'virtual-focus') continue;
          emitAriaWidgetFinding(finding, interactionId);
        }
        for (const probe of keyboardFocusProbes) {
          emitAriaWidgetFinding(evaluateKeyboardFocusProbe(probe), interactionId);
        }
      }, 320);
    };

    const scheduleStatusMessageEvaluation = (
      element: Element,
      observedAt: number,
      interactionId: string | undefined,
    ) => {
      const activation = lastStatusActivation;
      if (!recording || !activation || !interactionId) return;
      if (activation.interactionId !== interactionId) return;
      if (observedAt < activation.timestamp || observedAt - activation.timestamp > INTERACTION_WINDOW_MS) return;

      const observedFocusVersion = focusVersion;
      const observedDialogVersion = dialogVersion;
      const observedUrl = location.href;
      const existingTimer = pendingStatusMessageTimers.get(element);
      if (existingTimer != null) clearTimeout(existingTimer);

      const timer = ctx.setTimeout(() => {
        pendingStatusMessageTimers.delete(element);
        if (!recording || !element.isConnected) return;
        if (focusVersion !== observedFocusVersion || dialogVersion !== observedDialogVersion || location.href !== observedUrl) return;

        const active = document.activeElement instanceof Element ? document.activeElement : null;
        if (active === element || (active && element.contains(active))) return;

        const finding = createStatusMessageReviewEvent(element);
        if (!finding) return;
        const key = `${interactionId}|${statusMessageFingerprint(element)}`;
        if (emittedStatusMessageFindings.has(key)) return;
        emittedStatusMessageFindings.add(key);
        emit(finding, interactionId);
      }, STATUS_MESSAGE_STABILIZATION_MS);
      pendingStatusMessageTimers.set(element, timer);
    };

    const emitMutation = (
      mutation: RuntimeMutationSnapshot,
      detail: string,
      explicitInteractionId?: string,
    ) => {
      emit(createMutationEvent(mutation, detail), explicitInteractionId);
    };

    const inspectFocusObscured = (element: Element, interactionId?: string) => {
      if (!recording || document.activeElement !== element) return;
      const result = mayBeCompletelyObscured(element);
      if (!result.obscured) {
        if (obscuredFocusReported === element) obscuredFocusReported = null;
        return;
      }
      if (obscuredFocusReported === element) return;
      obscuredFocusReported = element;
      emit(
        createFocusObscuredEvent({
          element: snapshot(element),
          ...(result.evidence ? { evidence: result.evidence } : {}),
        }),
        interactionId,
      );
    };

    const scheduleFocusObscuredInspection = (
      element = document.activeElement instanceof Element ? document.activeElement : null,
      interactionId = activeInteractionId(),
    ) => {
      if (!recording || !element || element === document.body) return;
      if (focusObscuredFrame != null) cancelAnimationFrame(focusObscuredFrame);
      focusObscuredFrame = requestAnimationFrame(() => {
        focusObscuredFrame = undefined;
        inspectFocusObscured(element, interactionId);
      });
    };

    const sleep = (ms: number) => new Promise((resolve) => ctx.setTimeout(() => resolve(undefined), ms));
    const isFocusWalkUiTarget = (target: EventTarget | null): boolean =>
      target instanceof Element && Boolean(target.closest('[data-focustrace-focus-walk-backdrop]'));

    const runAutomaticFocusWalk = async (options: FocusWalkOptions = {}): Promise<FocusWalkResult> => {
      if (focusWalkRunning) {
        return { totalCandidates: 0, focusedSteps: 0, skipped: 0, stopped: true };
      }

      focusWalkRunning = true;
      focusWalkCancelRequested = false;
      const candidates = focusWalkCandidates();
      const totalCandidates = Math.min(candidates.length, options.maxSteps ?? candidates.length);
      const delayMs = Math.min(Math.max(options.delayMs ?? 180, 60), 1000);
      const backdrop = showFocusWalkBackdropInPage(totalCandidates, () => {
        focusWalkCancelRequested = true;
      });
      let focusedSteps = 0;
      let skipped = candidates.length - totalCandidates;
      let stopped = false;

      emit(createFocusWalkStartEvent(totalCandidates));

      try {
        for (const [index, candidate] of candidates.slice(0, totalCandidates).entries()) {
          if (!recording || focusWalkCancelRequested) {
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
          pendingFocusIntent = 'forward';
          element.focus({ preventScroll: true });
          pendingFocusIntent = 'programmatic';
          await sleep(delayMs);

          if (document.activeElement === element) focusedSteps += 1;
          else skipped += 1;
        }
      } finally {
        emit(createFocusWalkEndEvent({ focusedSteps, totalCandidates, skipped, stopped }));
        backdrop.dispose();
        focusWalkRunning = false;
        focusWalkCancelRequested = false;
      }

      return { totalCandidates, focusedSteps, skipped, stopped };
    };

    ctx.addEventListener(
      document,
      'pointerdown',
      (rawEvent) => {
        if (!recording) return;
        const event = rawEvent as PointerEvent;
        if (!(event.target instanceof Element) || isFocusWalkUiTarget(event.target)) return;
        const target = actionTarget(event.target);
        const interactionId = beginInteraction('pointer', target);
        if (isPotentialDraggingTarget(event.target) || isPotentialDraggingTarget(target)) {
          dragTracker.start({
            pointerId: event.pointerId,
            interactionId,
            element: snapshot(target),
            x: event.clientX,
            y: event.clientY,
          });
        } else {
          dragTracker.reset();
        }
      },
      true,
    );

    ctx.addEventListener(
      document,
      'pointermove',
      (rawEvent) => {
        if (!recording) return;
        const event = rawEvent as PointerEvent;
        dragTracker.move(event.pointerId, event.clientX, event.clientY);
      },
      true,
    );

    ctx.addEventListener(
      document,
      'pointerup',
      (rawEvent) => {
        if (!recording) return;
        const event = rawEvent as PointerEvent;
        const observation = dragTracker.finish(event.pointerId);
        if (observation) emit(createDraggingReviewEvent(observation), observation.interactionId);
      },
      true,
    );

    ctx.addEventListener(
      document,
      'pointercancel',
      (rawEvent) => {
        const event = rawEvent as PointerEvent;
        dragTracker.cancel(event.pointerId);
      },
      true,
    );

    ctx.addEventListener(
      document,
      'focusin',
      (rawEvent) => {
        if (!recording) return;
        const event = rawEvent as FocusEvent;
        if (!(event.target instanceof Element) || isFocusWalkUiTarget(event.target)) return;
        focusVersion += 1;
        lastFocused = event.target;
        hiddenFocusReported = null;
        obscuredFocusReported = null;
        const interactionId = activeInteractionId();
        const focusIntent = pendingFocusIntent;
        pendingFocusIntent = 'programmatic';
        const focusPosition = sequentialFocusPosition(event.target);

        emit(
          createFocusEvent({
            label: accessibleName(event.target) || event.target.tagName.toLowerCase(),
            element: snapshot(event.target, focusPosition),
            intent: focusIntent,
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

        scheduleFocusObscuredInspection(event.target, interactionId);
      },
      true,
    );

    ctx.addEventListener(
      document,
      'scroll',
      () => scheduleFocusObscuredInspection(),
      true,
    );

    ctx.addEventListener(
      window,
      'resize',
      () => scheduleFocusObscuredInspection(),
      true,
    );

    ctx.addEventListener(
      document,
      'keydown',
      (rawEvent) => {
        if (!recording) return;
        const event = rawEvent as KeyboardEvent;
        if (isFocusWalkUiTarget(event.target)) return;
        if (!['Tab', 'Enter', 'Escape', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        if (event.key === 'Tab') pendingFocusIntent = event.shiftKey ? 'backward' : 'forward';
        const target = event.target instanceof Element ? actionTarget(event.target) : null;
        const keyLabel = keyboardEventLabel(event);
        const action: KeyboardFocusAction = {
          kind: 'keydown',
          key: event.key,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
        };
        const interactionId = beginInteraction('keyboard', target, keyLabel);
        if (event.key === 'Enter' || event.key === ' ') {
          lastStatusActivation = { interactionId, timestamp: Date.now() };
        }
        if (target && ['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) lastActionElement = target;
        emit(
          createKeydownEvent({
            key: keyLabel,
            ...(target ? { element: snapshot(target) } : {}),
          }),
          interactionId,
        );
        if (target) scheduleAriaWidgetEvaluation(target, action, interactionId);
      },
      true,
    );

    ctx.addEventListener(
      document,
      'click',
      (rawEvent) => {
        if (!recording) return;
        const event = rawEvent as MouseEvent;
        if (!(event.target instanceof Element) || isFocusWalkUiTarget(event.target)) return;
        const target = actionTarget(event.target);
        const clickSelector = selectorFor(target);
        const interactionId = interactionTracker.click(clickSelector);

        lastActionElement = target;
        lastStatusActivation = { interactionId, timestamp: Date.now() };
        emit(
          createClickEvent({
            label: accessibleName(target) || target.tagName.toLowerCase(),
            element: snapshot(target),
          }),
          interactionId,
        );
        scheduleAriaWidgetEvaluation(target, { kind: 'click' }, interactionId);
      },
      true,
    );

    const registerDialog = (dialog: Element, interactionId = activeInteractionId()) => {
      if (dialogs.has(dialog) || !isDialogOpen(dialog)) return;
      dialogVersion += 1;
      const trigger = lastActionElement ?? lastFocused;
      dialogs.set(dialog, { element: dialog, trigger, openedAt: Date.now() });
      queueMicrotask(() => {
        if (!recording || !isDialogOpen(dialog)) return;
        const focusedInside = document.activeElement instanceof Element && dialog.contains(document.activeElement);
        emit(createDialogOpenEvent({ dialog: snapshot(dialog), focusedInside }), interactionId);
        ctx.setTimeout(() => {
          if (!recording || !isDialogOpen(dialog)) return;
          emitAriaWidgetFinding(createDynamicDialogNameReview(dialog), interactionId);
        }, 160);
      });
    };

    const inspectClosedDialogs = () => {
      for (const [dialog, state] of Array.from(dialogs.entries())) {
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
      const observedAt = Date.now();
      const interactionId = activeInteractionId(observedAt);
      const virtualFocusOwners = new Set<Element>();

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
        const mutationTargetElement = mutation.target instanceof Element
          ? mutation.target
          : mutation.target.parentElement;
        if (mutationTargetElement && isFocusWalkUiTarget(mutationTargetElement)) continue;

        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            for (const candidate of findPotentialStatusMessages(node)) {
              scheduleStatusMessageEvaluation(candidate, observedAt, interactionId);
            }
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

        const mutationElement = mutationTargetElement;
        if (!mutationElement) continue;

        if (mutation.type === 'attributes') {
          for (const candidate of findPotentialStatusMessages(mutationElement)) {
            scheduleStatusMessageEvaluation(candidate, observedAt, interactionId);
          }
        }

        const live = mutationElement.closest('[aria-live], [role="status"], [role="alert"]');
        if (live) {
          emit(createLiveRegionEvent(snapshot(live), live.textContent), interactionId);
        }

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          const attributeTarget = mutation.target;
          const attribute = mutation.attributeName ?? '';
          const currentValue = attribute ? attributeTarget.getAttribute(attribute) : null;
          const affectsLastFocused =
            lastFocused != null &&
            lastFocused !== document.body &&
            (attributeTarget === lastFocused || attributeTarget.contains(lastFocused));

          if (
            attribute === 'aria-activedescendant'
            && !virtualFocusOwners.has(attributeTarget)
          ) {
            virtualFocusOwners.add(attributeTarget);
            const beforeId = mutation.oldValue?.trim() || undefined;

            // In Chromium an isolated-world MutationObserver can run before the
            // content-script keydown listener has created the interaction. Defer
            // one task so the real keyboard event is correlated first, while the
            // MutationRecord still supplies the exact previous ARIA state.
            ctx.setTimeout(() => {
              if (!recording || !attributeTarget.isConnected) return;
              const correlatedInteractionId = activeInteractionId();
              if (!correlatedInteractionId) return;

              const virtualFocus = evaluateAriaWidgetProbe({
                kind: 'active-descendant-transition',
                owner: attributeTarget,
                ...(beforeId ? { beforeId } : {}),
              });
              if (virtualFocus?.kind === 'virtual-focus') {
                emit(virtualFocus, correlatedInteractionId);
              }

              // Frameworks can insert/re-parent the active item in the same render.
              // Validate the final ownership relationship after the normal window.
              ctx.setTimeout(() => {
                if (!recording || !attributeTarget.isConnected) return;
                emitAriaWidgetFinding(
                  evaluateAriaWidgetProbe({ kind: 'active-descendant', owner: attributeTarget }),
                  correlatedInteractionId,
                );
              }, 320);
            }, 0);
          }

          if (
            affectsLastFocused &&
            ['aria-hidden', 'hidden', 'style', 'class'].includes(attribute)
          ) {
            emitMutation(
              {
                kind: 'attribute-changed',
                target: snapshot(attributeTarget),
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

          if (
            DIALOG_STATE_ATTRIBUTES.has(attribute)
            && attributeTarget.matches(DIALOG_SELECTOR)
            && isDialogOpen(attributeTarget)
          ) {
            registerDialog(attributeTarget, interactionId);
          }
        }
      }

      inspectClosedDialogs();
      scheduleFocusObscuredInspection();
    });

    const inspectRouteChange = () => {
      if (!recording || location.href === lastUrl) return;

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
    };

    function startInstrumentation() {
      if (!observerActive) {
        observer.observe(document.documentElement, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeOldValue: true,
          attributeFilter: [
            'open',
            'role',
            'aria-live',
            'aria-busy',
            'aria-modal',
            'aria-hidden',
            'aria-activedescendant',
            'hidden',
            'class',
            'style',
          ],
        });
        observerActive = true;
      }
      if (routeTimer == null) routeTimer = ctx.setInterval(inspectRouteChange, 250);
      scheduleFocusObscuredInspection();
    }

    function stopInstrumentation() {
      if (observerActive) {
        observer.disconnect();
        observerActive = false;
      }
      if (routeTimer != null) {
        clearInterval(routeTimer);
        routeTimer = undefined;
      }
      if (focusObscuredFrame != null) {
        cancelAnimationFrame(focusObscuredFrame);
        focusObscuredFrame = undefined;
      }
      clearPendingStatusMessageTimers();
      dragTracker.reset();
    }

    ctx.onInvalidated(stopInstrumentation);

    browser.runtime.onMessage.addListener((message: ExtensionMessage | { type: 'FOCUSTRACE_PING' }) => {
      if (message.type === 'FOCUSTRACE_PING') return Promise.resolve(true);

      if (message.type === 'FOCUSTRACE_FLUSH_CONTENT_EVENTS') {
        return flushPendingEventDeliveries().then(() => true);
      }

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
        dialogVersion = 0;
        lastStatusActivation = undefined;
        hiddenFocusReported = null;
        obscuredFocusReported = null;
        emittedAriaWidgetFindings.clear();
        emittedStatusMessageFindings.clear();
        clearPendingStatusMessageTimers();
        interactionTracker.reset();
        dragTracker.reset();
        resetObservedDialogs();
        if (recording) startInstrumentation();
        else stopInstrumentation();
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
      focusVersion = 0;
      dialogVersion = 0;
      lastStatusActivation = undefined;
      obscuredFocusReported = null;
      emittedStatusMessageFindings.clear();
      clearPendingStatusMessageTimers();
      dragTracker.reset();
      resetObservedDialogs();
      if (recording) startInstrumentation();
      else stopInstrumentation();
    }).catch(() => undefined);
  },
});
