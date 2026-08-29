export type InteractiveSemanticIntent = 'button' | 'link' | 'unknown';
export type SemanticConfidence = 'high' | 'medium';

export interface InteractiveSemanticSignal {
  element: Element;
  intent: InteractiveSemanticIntent;
  confidence: SemanticConfidence;
  currentTag: string;
  explicitRole?: 'button' | 'link';
  recommendedNative?: '<button type="button">' | '<a href="…">';
  alternativeRole?: 'button' | 'link';
  signals: string[];
}

type ScanRoot = Document | Element;

const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'image']);
const BUTTON_STATE_ATTRIBUTES = ['aria-pressed', 'aria-expanded', 'aria-haspopup'] as const;
const NAVIGATION_HANDLER_PATTERN = /(?:\b(?:window\.)?location(?:\.href)?\b|\blocation\.(?:assign|replace)\s*\(|\bwindow\.open\s*\(|\bhistory\.(?:pushState|replaceState)\s*\(|\b(?:router\.(?:push|replace)|navigate)\s*\()/i;

function scopedElements(root: ScanRoot, selector: string): Element[] {
  const descendants = [...root.querySelectorAll(selector)];
  return root instanceof Element && root.matches(selector) ? [root, ...descendants] : descendants;
}

function explicitInteractiveRole(element: Element): 'button' | 'link' | undefined {
  const role = element.getAttribute('role')?.trim().toLowerCase().split(/\s+/)[0];
  return role === 'button' || role === 'link' ? role : undefined;
}

function hasOtherExplicitRole(element: Element): boolean {
  const role = element.getAttribute('role')?.trim().toLowerCase().split(/\s+/)[0];
  return Boolean(role && role !== 'button' && role !== 'link' && role !== 'none' && role !== 'presentation');
}

function isNativeButton(element: Element): boolean {
  if (element instanceof HTMLButtonElement) return true;
  return element instanceof HTMLInputElement && BUTTON_INPUT_TYPES.has(element.type.toLowerCase());
}

function isNativeLink(element: Element): boolean {
  return (element instanceof HTMLAnchorElement || element instanceof HTMLAreaElement) && element.hasAttribute('href');
}

function clickHandlerSource(element: Element): string {
  const inline = element.getAttribute('onclick');
  if (inline) return inline;
  const handler = (element as HTMLElement).onclick;
  return typeof handler === 'function' ? String(handler) : '';
}

function hasClickHandler(element: Element): boolean {
  return Boolean(clickHandlerSource(element));
}

function hasKeyboardHandler(element: Element): boolean {
  return element.hasAttribute('onkeydown') || element.hasAttribute('onkeyup') || element.hasAttribute('onkeypress');
}

function buttonStateSignals(element: Element): string[] {
  return BUTTON_STATE_ATTRIBUTES.filter((attribute) => element.hasAttribute(attribute));
}

function hasNavigationHandler(element: Element): boolean {
  const source = clickHandlerSource(element);
  return Boolean(source && NAVIGATION_HANDLER_PATTERN.test(source));
}

function signalFor(element: Element): InteractiveSemanticSignal | undefined {
  const role = explicitInteractiveRole(element);
  const nativeButton = isNativeButton(element);
  const nativeLink = isNativeLink(element);

  if ((nativeButton && role !== 'link') || (nativeLink && role !== 'button')) return undefined;
  if (!role && hasOtherExplicitRole(element)) return undefined;

  const click = hasClickHandler(element);
  const stateSignals = buttonStateSignals(element);
  if (!role && !click && stateSignals.length === 0) return undefined;

  const signals: string[] = [];
  if (role) signals.push(`role="${role}"`);
  if (click) signals.push('click handler');
  if (hasKeyboardHandler(element)) signals.push('keyboard handler');
  signals.push(...stateSignals);

  const currentTag = element.tagName.toLowerCase();
  if (role === 'button') {
    return {
      element,
      intent: 'button',
      confidence: 'high',
      currentTag,
      explicitRole: role,
      recommendedNative: '<button type="button">',
      alternativeRole: 'button',
      signals,
    };
  }

  if (role === 'link') {
    return {
      element,
      intent: 'link',
      confidence: 'high',
      currentTag,
      explicitRole: role,
      recommendedNative: '<a href="…">',
      alternativeRole: 'link',
      signals,
    };
  }

  if (hasNavigationHandler(element)) {
    signals.push('navigation-like click handler');
    return {
      element,
      intent: 'link',
      confidence: 'medium',
      currentTag,
      recommendedNative: '<a href="…">',
      alternativeRole: 'link',
      signals,
    };
  }

  if (stateSignals.length > 0 || (element instanceof HTMLAnchorElement && !element.hasAttribute('href'))) {
    return {
      element,
      intent: 'button',
      confidence: 'medium',
      currentTag,
      recommendedNative: '<button type="button">',
      alternativeRole: 'button',
      signals,
    };
  }

  return {
    element,
    intent: 'unknown',
    confidence: 'medium',
    currentTag,
    signals,
  };
}

export function evaluateInteractiveSemantics(root: ScanRoot): InteractiveSemanticSignal[] {
  const candidates = scopedElements(
    root,
    '[role="button"], [role="link"], [onclick], [aria-pressed], [aria-expanded], [aria-haspopup]',
  );
  const seen = new Set<Element>();
  const signals: InteractiveSemanticSignal[] = [];

  for (const element of candidates) {
    if (seen.has(element)) continue;
    seen.add(element);
    const signal = signalFor(element);
    if (signal) signals.push(signal);
  }

  return signals;
}

export function mainLandmarkCandidates(): Element[] {
  return [...document.querySelectorAll('main, [role]')].filter((element) => {
    const explicitRole = element.getAttribute('role')?.trim().toLowerCase().split(/\s+/)[0];
    if (explicitRole === 'main') return true;
    if (element.tagName !== 'MAIN') return false;
    return explicitRole !== 'none' && explicitRole !== 'presentation';
  });
}
