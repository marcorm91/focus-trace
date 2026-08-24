import { browser, defineContentScript } from '#imports';
import { accessibleName, selectorFor } from '../lib/audit/dom';
import { runFocusTraceScan } from '../lib/audit/scan';
import { RULES } from '../shared/rule-catalog';
import type { ElementSnapshot, ExtensionMessage, RuntimeEvent } from '../shared/types';

interface DialogState { element: Element; trigger: Element | null; openedAt: number }

function snapshot(element: Element): ElementSnapshot {
  const result: ElementSnapshot = { tag: element.tagName.toLowerCase(), selector: selectorFor(element) };
  if (element.id) result.id = element.id;
  const role = element.getAttribute('role');
  if (role) result.role = role;
  const name = accessibleName(element);
  if (name) result.name = name;
  return result;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function findDialogs(root: Node): Element[] {
  if (!(root instanceof Element)) return [];
  const dialogs: Element[] = [];
  if (root.matches('dialog[open], [role="dialog"], [role="alertdialog"]')) dialogs.push(root);
  dialogs.push(...root.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]'));
  return dialogs;
}

function isDialogOpen(dialog: Element): boolean {
  if (!dialog.isConnected) return false;
  if (dialog instanceof HTMLDialogElement) return dialog.open;
  const style = getComputedStyle(dialog);
  return style.display !== 'none' && style.visibility === 'visible' && dialog.matches('[role="dialog"], [role="alertdialog"]');
}

function isModalDialog(dialog: Element): boolean {
  if (dialog.getAttribute('aria-modal')?.toLowerCase() === 'true') return true;
  if (dialog instanceof HTMLDialogElement) {
    try { return dialog.matches(':modal'); } catch { return dialog.open; }
  }
  return false;
}

function mayBeCompletelyObscured(element: Element): { obscured: boolean; evidence?: string } {
  const rect = element.getBoundingClientRect();
  const left = Math.max(0, rect.left); const top = Math.max(0, rect.top);
  const right = Math.min(window.innerWidth, rect.right); const bottom = Math.min(window.innerHeight, rect.bottom);
  if (right <= left || bottom <= top) return { obscured: false };
  const inset = 1;
  const xs = [left + inset, (left + right) / 2, right - inset].filter((x) => x >= left && x <= right);
  const ys = [top + inset, (top + bottom) / 2, bottom - inset].filter((y) => y >= top && y <= bottom);
  const points = xs.flatMap((x) => ys.map((y) => ({ x, y })));
  if (!points.length) return { obscured: false };
  const blockers = new Map<Element, number>();
  const covered = points.every(({ x, y }) => {
    const topCandidate = document.elementsFromPoint(x, y)[0];
    if (topCandidate && (topCandidate === element || element.contains(topCandidate))) return false;
    if (topCandidate && !topCandidate.contains(element) && !element.contains(topCandidate)) blockers.set(topCandidate, (blockers.get(topCandidate) ?? 0) + 1);
    return true;
  });
  if (!covered) return { obscured: false };
  const blocker = [...blockers.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return { obscured: true, evidence: blocker ? `All sampled points were covered. Most common covering element: ${selectorFor(blocker)}.` : 'All sampled points were covered by other rendered content.' };
}

export default defineContentScript({
  registration: 'runtime',
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main(ctx) {
    let recording = false;
    let lastFocused: Element | null = document.activeElement instanceof Element ? document.activeElement : null;
    let lastActionElement: Element | null = null;
    let lastUrl = location.href;
    let lastTitle = document.title;
    const dialogs = new Map<Element, DialogState>();

    for (const dialog of document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]')) dialogs.set(dialog, { element: dialog, trigger: null, openedAt: Date.now() });

    const emit = (event: Omit<RuntimeEvent, 'id' | 'timestamp'>) => {
      if (!recording) return;
      const message: ExtensionMessage = { type: 'FOCUSTRACE_EVENT', event: { id: uid(), timestamp: Date.now(), ...event } };
      void browser.runtime.sendMessage(message).catch(() => undefined);
    };

    const inspectFocusObscured = (element: Element) => requestAnimationFrame(() => {
      if (!recording || document.activeElement !== element) return;
      const result = mayBeCompletelyObscured(element);
      if (!result.obscured) return;
      emit({ kind: 'focus-obscured', severity: RULES.focusObscured.severity, outcome: 'review', ruleId: RULES.focusObscured.id, references: RULES.focusObscured.references, title: RULES.focusObscured.title, ...(result.evidence ? { detail: result.evidence } : {}), element: snapshot(element) });
    });

    ctx.addEventListener(document, 'focusin', (rawEvent) => {
      const event = rawEvent as FocusEvent;
      if (!(event.target instanceof Element)) return;
      lastFocused = event.target;
      emit({ kind: 'focus', severity: 'info', title: `Focus → ${accessibleName(event.target) || event.target.tagName.toLowerCase()}`, element: snapshot(event.target) });
      for (const state of dialogs.values()) {
        if (!isDialogOpen(state.element) || !isModalDialog(state.element) || state.element.contains(event.target)) continue;
        emit({ kind: 'dialog-focus-escape', severity: RULES.dialogFocusEscape.severity, outcome: 'review', ruleId: RULES.dialogFocusEscape.id, references: RULES.dialogFocusEscape.references, title: RULES.dialogFocusEscape.title, detail: `Focus moved to ${selectorFor(event.target)} while a modal dialog remained open.`, element: snapshot(event.target) });
      }
      inspectFocusObscured(event.target);
    }, true);

    ctx.addEventListener(document, 'keydown', (rawEvent) => {
      const event = rawEvent as KeyboardEvent;
      if (!['Tab', 'Enter', 'Escape', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      emit({ kind: 'keydown', severity: 'info', title: `Key: ${event.key === ' ' ? 'Space' : event.key}`, ...(event.target instanceof Element ? { element: snapshot(event.target) } : {}) });
    }, true);

    ctx.addEventListener(document, 'click', (rawEvent) => {
      const event = rawEvent as MouseEvent;
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest('button, a, input, select, textarea, [role="button"], [tabindex]') ?? event.target;
      lastActionElement = target;
      emit({ kind: 'click', severity: 'info', title: `Click → ${accessibleName(target) || target.tagName.toLowerCase()}`, element: snapshot(target) });
    }, true);

    const registerDialog = (dialog: Element) => {
      if (dialogs.has(dialog)) return;
      const trigger = lastActionElement ?? lastFocused;
      dialogs.set(dialog, { element: dialog, trigger, openedAt: Date.now() });
      queueMicrotask(() => {
        if (!recording || !isDialogOpen(dialog)) return;
        const focusedInside = document.activeElement instanceof Element && dialog.contains(document.activeElement);
        emit({ kind: 'dialog-open', severity: focusedInside ? 'info' : RULES.dialogInitialFocus.severity, ...(focusedInside ? {} : { outcome: 'review' as const, ruleId: RULES.dialogInitialFocus.id, references: RULES.dialogInitialFocus.references }), title: focusedInside ? 'Dialog opened with focus inside' : RULES.dialogInitialFocus.title, ...(!focusedInside ? { detail: 'WAI-ARIA APG expects focus to move to an element inside a modal dialog when it opens.' } : {}), element: snapshot(dialog) });
      });
    };

    const inspectClosedDialogs = () => {
      for (const [dialog, state] of [...dialogs.entries()]) {
        if (isDialogOpen(dialog)) continue;
        dialogs.delete(dialog);
        emit({ kind: 'dialog-close', severity: 'info', title: 'Dialog closed', element: snapshot(dialog) });
        ctx.setTimeout(() => {
          if (!recording || !state.trigger?.isConnected) return;
          const active = document.activeElement instanceof Element ? document.activeElement : null;
          if (active === state.trigger) return;
          emit({ kind: 'dialog-close', severity: RULES.dialogRestoreFocus.severity, outcome: 'review', ruleId: RULES.dialogRestoreFocus.id, references: RULES.dialogRestoreFocus.references, title: RULES.dialogRestoreFocus.title, detail: `Dialog trigger was ${selectorFor(state.trigger)}; focus ended on ${active ? selectorFor(active) : 'no element'}. APG allows workflow-specific exceptions, so this requires review.`, ...(active ? { element: snapshot(active) } : {}) });
        }, 50);
      }
    };

    const observer = new MutationObserver((mutations) => {
      if (!recording) return;
      if (lastFocused && !lastFocused.isConnected) {
        emit({ kind: 'focus-lost', severity: RULES.focusLost.severity, outcome: 'review', ruleId: RULES.focusLost.id, references: RULES.focusLost.references, title: RULES.focusLost.title, detail: `Focused node ${selectorFor(lastFocused)} was removed. Focus fell back to ${document.activeElement === document.body ? '<body>' : document.activeElement instanceof Element ? selectorFor(document.activeElement) : 'unknown'}. Review whether the resulting focus order remains meaningful and operable.`, element: snapshot(lastFocused) });
        lastFocused = document.activeElement instanceof Element ? document.activeElement : null;
      }
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) for (const dialog of findDialogs(node)) registerDialog(dialog);
        if (mutation.target instanceof Element) {
          const live = mutation.target.closest('[aria-live], [role="status"], [role="alert"]');
          if (live) emit({ kind: 'live-region', severity: 'info', title: 'Live region updated', ...(live.textContent?.trim() ? { detail: live.textContent.trim().replace(/\s+/g, ' ').slice(0, 160) } : {}), element: snapshot(live) });
          if (mutation.type === 'attributes' && mutation.attributeName === 'open' && mutation.target.matches('dialog') && isDialogOpen(mutation.target)) registerDialog(mutation.target);
        }
      }
      inspectClosedDialogs();
    });

    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['open', 'role', 'aria-live', 'aria-modal'] });
    ctx.onInvalidated(() => observer.disconnect());

    const routeTimer = ctx.setInterval(() => {
      if (location.href === lastUrl) return;
      const fromUrl = lastUrl; const previousTitle = lastTitle;
      lastUrl = location.href; lastTitle = document.title;
      emit({ kind: 'route', severity: 'info', title: 'SPA/navigation URL change detected', fromUrl, toUrl: lastUrl });
      ctx.setTimeout(() => {
        if (!recording) return;
        if (document.title !== previousTitle) { lastTitle = document.title; return; }
        emit({ kind: 'route', severity: RULES.spaTitleUnchanged.severity, outcome: 'review', ruleId: RULES.spaTitleUnchanged.id, references: RULES.spaTitleUnchanged.references, title: RULES.spaTitleUnchanged.title, detail: `The URL changed from ${fromUrl} to ${lastUrl}, but document.title remained ${JSON.stringify(document.title)}. Review whether the new SPA view represents a distinct page/topic that needs a descriptive title.`, fromUrl, toUrl: lastUrl });
      }, 600);
    }, 250);
    ctx.onInvalidated(() => clearInterval(routeTimer));

    browser.runtime.onMessage.addListener((message: ExtensionMessage | { type: 'FOCUSTRACE_PING' }) => {
      if (message.type === 'FOCUSTRACE_PING') return Promise.resolve(true);
      if (message.type === 'FOCUSTRACE_SET_RECORDING') {
        recording = message.enabled;
        lastFocused = document.activeElement instanceof Element ? document.activeElement : null;
        lastActionElement = null; lastUrl = location.href; lastTitle = document.title;
        return Promise.resolve({ recording });
      }
      if (message.type === 'FOCUSTRACE_RUN_SCAN') return Promise.resolve(runFocusTraceScan());
    });
  },
});
