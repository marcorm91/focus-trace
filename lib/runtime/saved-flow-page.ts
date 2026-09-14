import type { SavedFlowActionStep, SavedFlowTargetSignature } from './saved-flow';

export interface SavedFlowPageActionResult {
  status: 'performed' | 'missing' | 'ambiguous' | 'blocked';
  reason: string;
}

/**
 * IMPORTANT: this function is passed directly to browser.scripting.executeScript,
 * so keep it self-contained and do not rely on module-scope helpers.
 */
export function executeSavedFlowActionInPage(step: SavedFlowActionStep): SavedFlowPageActionResult {
  type SelectorRoot = Document | ShadowRoot;

  const queryUnique = (root: SelectorRoot, selector: string) => {
    try {
      const matches = root.querySelectorAll(selector);
      if (matches.length === 1) return { element: matches[0] as Element, ambiguous: false };
      return { element: undefined, ambiguous: matches.length > 1 };
    } catch {
      return { element: undefined, ambiguous: false };
    }
  };

  const resolve = (signature: SavedFlowTargetSignature | undefined) => {
    if (!signature?.locator) return { element: undefined, ambiguous: false };
    const tokens = signature.locator.split(/\s+\|(shadow|frame)\|\s+/);
    const first = tokens[0]?.trim();
    if (!first) return { element: undefined, ambiguous: false };
    let context: SelectorRoot = document;
    let current = queryUnique(context, first);
    if (current.ambiguous || !current.element) return current;

    for (let index = 1; index < tokens.length; index += 2) {
      const boundary = tokens[index];
      const selector = tokens[index + 1]?.trim();
      if (!selector) return { element: undefined, ambiguous: false };
      if (boundary === 'shadow') {
        const shadow = (current.element as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot ?? null;
        if (!shadow || shadow.mode !== 'open') return { element: undefined, ambiguous: false };
        context = shadow;
      } else if (boundary === 'frame') {
        try {
          const nested = (current.element as Element & { contentDocument?: Document | null }).contentDocument ?? null;
          if (!nested?.documentElement) return { element: undefined, ambiguous: false };
          context = nested;
        } catch {
          return { element: undefined, ambiguous: false };
        }
      } else {
        return { element: undefined, ambiguous: false };
      }
      current = queryUnique(context, selector);
      if (current.ambiguous || !current.element) return current;
    }
    return current;
  };

  if (step.policy !== 'auto') {
    return {
      status: 'blocked',
      reason: 'This action requires an explicit manual stop and was not executed automatically.',
    };
  }
  if (step.sourceEventKind !== 'keydown' || !step.key) {
    return {
      status: 'blocked',
      reason: 'Only the bounded non-text keyboard action set is eligible for automatic replay.',
    };
  }

  const resolved = resolve(step.target);
  if (resolved.ambiguous) {
    return {
      status: 'ambiguous',
      reason: 'The saved target matches more than one current element, so replay stopped without choosing one.',
    };
  }
  if (!resolved.element) {
    return {
      status: 'missing',
      reason: 'The saved target is no longer uniquely available on the current page.',
    };
  }

  const target = resolved.element as HTMLElement;
  if (typeof target.focus === 'function') target.focus({ preventScroll: true });
  const event = new KeyboardEvent('keydown', {
    key: step.key,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  target.dispatchEvent(event);
  return {
    status: 'performed',
    reason: 'The uniquely resolved non-text keyboard action was replayed on the current target.',
  };
}

export interface SavedFlowTargetObservation {
  status: 'matched' | 'missing' | 'ambiguous';
  focused: boolean;
  visible: boolean;
  dialogOpen: boolean;
}

/** Keep self-contained for browser.scripting.executeScript. */
export function inspectSavedFlowTargetInPage(signature: SavedFlowTargetSignature): SavedFlowTargetObservation {
  type SelectorRoot = Document | ShadowRoot;
  const queryUnique = (root: SelectorRoot, selector: string) => {
    try {
      const matches = root.querySelectorAll(selector);
      if (matches.length === 1) return { element: matches[0] as Element, ambiguous: false };
      return { element: undefined, ambiguous: matches.length > 1 };
    } catch {
      return { element: undefined, ambiguous: false };
    }
  };
  const tokens = signature.locator.split(/\s+\|(shadow|frame)\|\s+/);
  const first = tokens[0]?.trim();
  if (!first) return { status: 'missing', focused: false, visible: false, dialogOpen: false };
  let context: SelectorRoot = document;
  let current = queryUnique(context, first);
  if (current.ambiguous) return { status: 'ambiguous', focused: false, visible: false, dialogOpen: false };
  if (!current.element) return { status: 'missing', focused: false, visible: false, dialogOpen: false };

  for (let index = 1; index < tokens.length; index += 2) {
    const boundary = tokens[index];
    const selector = tokens[index + 1]?.trim();
    if (!selector) return { status: 'missing', focused: false, visible: false, dialogOpen: false };
    if (boundary === 'shadow') {
      const shadow = (current.element as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot ?? null;
      if (!shadow || shadow.mode !== 'open') return { status: 'missing', focused: false, visible: false, dialogOpen: false };
      context = shadow;
    } else if (boundary === 'frame') {
      try {
        const nested = (current.element as Element & { contentDocument?: Document | null }).contentDocument ?? null;
        if (!nested?.documentElement) return { status: 'missing', focused: false, visible: false, dialogOpen: false };
        context = nested;
      } catch {
        return { status: 'missing', focused: false, visible: false, dialogOpen: false };
      }
    }
    current = queryUnique(context, selector);
    if (current.ambiguous) return { status: 'ambiguous', focused: false, visible: false, dialogOpen: false };
    if (!current.element) return { status: 'missing', focused: false, visible: false, dialogOpen: false };
  }

  const element = current.element;
  const win = element.ownerDocument.defaultView;
  const style = win?.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const visible = Boolean(style && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0);
  const active = element.ownerDocument.activeElement;
  const focused = active === element || (element.shadowRoot?.activeElement != null && element.shadowRoot.activeElement === active);
  const role = element.getAttribute('role');
  const dialogLike = element.tagName.toLowerCase() === 'dialog' || role === 'dialog' || role === 'alertdialog';
  const nativeOpen = element instanceof HTMLDialogElement ? element.open : true;

  return {
    status: 'matched',
    focused,
    visible,
    dialogOpen: dialogLike && visible && nativeOpen,
  };
}
