import { browser, defineContentScript } from '#imports';
import { accessibleName, isProgrammaticallyHidden, selectorFor } from '../lib/audit/dom';
import {
  createRuntimeBreakpointHits,
  defaultRuntimeBreakpointSettings,
  normalizeRuntimeBreakpointSettings,
} from '../lib/runtime/breakpoints';
import { RuntimeInteractionTracker } from '../lib/runtime/causality';
import { createRuntimeCause as cause, createRuntimeEventId as uid } from '../lib/runtime/events';
import {
  actionTarget,
  findDialogs,
  findSignificantAddedElements,
  isDialogOpen,
  isModalDialog,
  mayBeCompletelyObscured,
  snapshot,
} from '../lib/runtime/page-inspection';
import { runFocusTraceScan } from '../lib/audit/scan';
import { RULES } from '../shared/rule-catalog';
import type {
  ExtensionMessage,
  RuntimeCause,
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
    let breakpointSettings = defaultRuntimeBreakpointSettings();
    let lastFocused: Element | null = document.activeElement instanceof Element ? document.activeElement : null;
    let lastActionElement: Element | null = null;
    let lastUrl = location.href;
    let lastTitle = document.title;
    let focusVersion = 0;
    let hiddenFocusReported: Element | null = null;
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
      emit(
        {
          kind: 'dom-mutation',
          severity: 'info',
          title:
            mutation.kind === 'node-added'
              ? `DOM added → ${mutation.target.selector}`
              : mutation.kind === 'node-removed'
                ? `DOM removed → ${mutation.target.selector}`
                : `DOM attribute changed → ${mutation.target.selector}`,
          detail,
          element: mutation.target,
          mutation,
        },
        explicitInteractionId,
      );
    };

    const inspectFocusObscured = (element: Element, interactionId?: string) =>
      requestAnimationFrame(() => {
        if (!recording || document.activeElement !== element) return;
        const result = mayBeCompletelyObscured(element);
        if (!result.obscured) return;
        emit(
          {
            kind: 'focus-obscured',
            severity: RULES.focusObscured.severity,
            outcome: 'review',
            ruleId: RULES.focusObscured.id,
            references: RULES.focusObscured.references,
            title: RULES.focusObscured.title,
            ...(result.evidence ? { detail: result.evidence } : {}),
            element: snapshot(element),
          },
          interactionId,
        );
      });

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
          {
            kind: 'focus',
            severity: 'info',
            title: `Focus → ${accessibleName(event.target) || event.target.tagName.toLowerCase()}`,
            element: snapshot(event.target),
          },
          interactionId,
        );

        for (const state of dialogs.values()) {
          if (!isDialogOpen(state.element) || !isModalDialog(state.element) || state.element.contains(event.target)) continue;
          emit(
            {
              kind: 'dialog-focus-escape',
              severity: RULES.dialogFocusEscape.severity,
              outcome: 'review',
              ruleId: RULES.dialogFocusEscape.id,
              references: RULES.dialogFocusEscape.references,
              title: RULES.dialogFocusEscape.title,
              detail: `Focus moved to ${selectorFor(event.target)} while a modal dialog remained open.`,
              element: snapshot(event.target),
              causes: [cause('MODAL_FOCUS_ESCAPE', 'Focus moved outside an open modal dialog.')],
            },
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
          {
            kind: 'keydown',
            severity: 'info',
            title: `Key: ${event.key === ' ' ? 'Space' : event.key}`,
            ...(target ? { element: snapshot(target) } : {}),
          },
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
          {
            kind: 'click',
            severity: 'info',
            title: `Click → ${accessibleName(target) || target.tagName.toLowerCase()}`,
            element: snapshot(target),
          },
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
        emit(
          {
            kind: 'dialog-open',
            severity: focusedInside ? 'info' : RULES.dialogInitialFocus.severity,
            ...(focusedInside
              ? {}
              : {
                  outcome: 'review' as const,
                  ruleId: RULES.dialogInitialFocus.id,
                  references: RULES.dialogInitialFocus.references,
                  causes: [
                    cause(
                      'DIALOG_OPENED_WITHOUT_FOCUS',
                      'A dialog opened but focus was not established inside it.',
                    ),
                  ],
                }),
            title: focusedInside ? 'Dialog opened with focus inside' : RULES.dialogInitialFocus.title,
            ...(!focusedInside
              ? {
                  detail:
                    'WAI-ARIA APG expects focus to move to an element inside a modal dialog when it opens.',
                }
              : {}),
            element: snapshot(dialog),
          },
          interactionId,
        );
      });
    };

    const inspectClosedDialogs = () => {
      for (const [dialog, state] of [...dialogs.entries()]) {
        if (isDialogOpen(dialog)) continue;
        dialogs.delete(dialog);
        const interactionId = activeInteractionId();
        emit({ kind: 'dialog-close', severity: 'info', title: 'Dialog closed', element: snapshot(dialog) }, interactionId);
        ctx.setTimeout(() => {
          if (!recording || !state.trigger?.isConnected) return;
          const active = document.activeElement instanceof Element ? document.activeElement : null;
          if (active === state.trigger) return;
          emit(
            {
              kind: 'dialog-close',
              severity: RULES.dialogRestoreFocus.severity,
              outcome: 'review',
              ruleId: RULES.dialogRestoreFocus.id,
              references: RULES.dialogRestoreFocus.references,
              title: RULES.dialogRestoreFocus.title,
              detail: `Dialog trigger was ${selectorFor(state.trigger)}; focus ended on ${
                active ? selectorFor(active) : 'no element'
              }. APG allows workflow-specific exceptions, so this requires review.`,
              ...(active ? { element: snapshot(active) } : {}),
            },
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
        const causes: RuntimeCause[] = [
          cause('FOCUSED_NODE_REMOVED', `Focused node ${removed.selector} was removed from the DOM.`),
        ];
        if (active === document.body) {
          causes.push(
            cause(
              'FOCUS_FELL_BACK_TO_BODY',
              'After the focused node was removed, document focus fell back to <body>.',
            ),
          );
        }

        emit(
          {
            kind: 'focus-lost',
            severity: RULES.focusLost.severity,
            outcome: 'review',
            ruleId: RULES.focusLost.id,
            references: RULES.focusLost.references,
            title: RULES.focusLost.title,
            detail: `Focused node ${removed.selector} was removed. Focus fell back to ${
              active === document.body ? '<body>' : active ? selectorFor(active) : 'unknown'
            }. Review whether the resulting focus order remains meaningful and operable.`,
            element: removed,
            causes,
          },
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
          emit(
            {
              kind: 'live-region',
              severity: 'info',
              title: 'Live region updated',
              ...(live.textContent?.trim()
                ? { detail: live.textContent.trim().replace(/\s+/g, ' ').slice(0, 160) }
                : {}),
              element: snapshot(live),
            },
            interactionId,
          );
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
                {
                  kind: 'focus-hidden',
                  severity: RULES.focusedElementHidden.severity,
                  outcome: 'review',
                  ruleId: RULES.focusedElementHidden.id,
                  references: RULES.focusedElementHidden.references,
                  title: RULES.focusedElementHidden.title,
                  detail: `Focus remained associated with ${selectorFor(lastFocused)} while it became hidden from rendering or assistive technology.`,
                  element: snapshot(lastFocused),
                  causes: [
                    cause(
                      'FOCUSED_ELEMENT_BECAME_HIDDEN',
                      'A mutation hid the element that held focus or one of its ancestors.',
                    ),
                  ],
                },
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
      emit(
        {
          kind: 'route',
          severity: 'info',
          title: 'SPA/navigation URL change detected',
          fromUrl,
          toUrl: lastUrl,
        },
        routeInteractionId,
      );

      ctx.setTimeout(() => {
        if (!recording || focusVersion !== routeFocusVersion) return;
        const active = document.activeElement instanceof Element ? document.activeElement : null;
        emit(
          {
            kind: 'route',
            severity: RULES.spaFocusUnchanged.severity,
            outcome: 'review',
            ruleId: RULES.spaFocusUnchanged.id,
            references: RULES.spaFocusUnchanged.references,
            title: RULES.spaFocusUnchanged.title,
            detail: `The URL changed from ${fromUrl} to ${lastUrl}, but no focus transition was observed. Focus ${
              active === routeFocus ? 'remained on' : 'ended on'
            } ${active ? selectorFor(active) : 'no element'}. Review whether users are left at a meaningful location in the new view.`,
            ...(active ? { element: snapshot(active) } : {}),
            fromUrl,
            toUrl: lastUrl,
            causes: [
              cause(
                'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE',
                'The SPA route changed without a subsequent focus transition.',
              ),
            ],
          },
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
          {
            kind: 'route',
            severity: RULES.spaTitleUnchanged.severity,
            outcome: 'review',
            ruleId: RULES.spaTitleUnchanged.id,
            references: RULES.spaTitleUnchanged.references,
            title: RULES.spaTitleUnchanged.title,
            detail: `The URL changed from ${fromUrl} to ${lastUrl}, but document.title remained ${JSON.stringify(
              document.title,
            )}. Review whether the new SPA view represents a distinct page/topic that needs a descriptive title.`,
            fromUrl,
            toUrl: lastUrl,
          },
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
    });

    // Restore state when this script is re-created after a navigation or when
    // the side panel is closed. Recording belongs to the inspected tab, not to
    // the panel's focus lifecycle.
    void browser.runtime.sendMessage({
      type: 'FOCUSTRACE_GET_CONTENT_STATE',
    } satisfies ExtensionMessage).then((state: SessionState | undefined) => {
      if (!state) return;
      recording = state.recording;
      breakpointSettings = normalizeRuntimeBreakpointSettings(state.breakpoints);
      lastFocused = document.activeElement instanceof Element ? document.activeElement : null;
      lastUrl = location.href;
      lastTitle = document.title;
    }).catch(() => undefined);
  },
});
