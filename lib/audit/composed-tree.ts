import {
  CLOSED_SHADOW_HOST_EVENT,
  CLOSED_SHADOW_REQUEST_EVENT,
} from '../../shared/nested-context-bridge';

export const SHADOW_PATH_MARKER = '|shadow|';
export const FRAME_PATH_MARKER = '|frame|';

export interface ComposedTraversalLimits {
  maxElements: number;
  maxShadowRoots: number;
  maxFrames: number;
  maxDepth: number;
}

export const DEFAULT_COMPOSED_TRAVERSAL_LIMITS: ComposedTraversalLimits = {
  maxElements: 10_000,
  maxShadowRoots: 100,
  maxFrames: 50,
  maxDepth: 40,
};

export type ComposedCoverageLimitKind = 'closed-shadow' | 'frame-unavailable' | 'budget';

export interface ComposedCoverageLimit {
  kind: ComposedCoverageLimitKind;
  element?: Element;
  detail: string;
}

export interface ComposedTraversalResult {
  elements: Element[];
  coverageLimits: ComposedCoverageLimit[];
  shadowRootsTraversed: number;
  framesTraversed: number;
  budgetExceeded: boolean;
}

export type ComposedRoot = Document | Element;

type SelectorRoot = Document | ShadowRoot;

function isDocument(value: unknown): value is Document {
  return Boolean(value && typeof value === 'object' && (value as Node).nodeType === 9);
}

function isShadowRoot(value: unknown): value is ShadowRoot {
  return Boolean(
    value
      && typeof value === 'object'
      && (value as Node).nodeType === 11
      && 'host' in (value as object),
  );
}

function escapedId(value: string): string {
  try {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  } catch {
    // Fall back to a conservative CSS identifier escape below.
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

function rootMatchesOnly(root: SelectorRoot, selector: string, element: Element): boolean {
  try {
    const matches = root.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch {
    return false;
  }
}

function likelyVolatileId(id: string): boolean {
  const normalized = id.trim().toLowerCase();
  if (!normalized) return true;
  return /^(?:yui[_-]|ext-gen|ember\d|react-select-|mui-)/.test(normalized)
    || /(?:^|[_-])\d{8,}(?:[_-]|$)/.test(normalized);
}

function localSelectorFor(element: Element, root: SelectorRoot): string {
  if (element.id && !likelyVolatileId(element.id)) {
    const selector = `#${escapedId(element.id)}`;
    if (rootMatchesOnly(root, selector, element)) return selector;
  }

  const parts: string[] = [];
  let current: Element | null = element;
  while (current) {
    let part = current.tagName.toLowerCase();
    const parent = current.parentElement;
    if (parent && parent.getRootNode() === root) {
      const siblings = Array.from(parent.children).filter((candidate) => candidate.tagName === current!.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);

    const selector = parts.join(' > ');
    if (rootMatchesOnly(root, selector, element)) return selector;

    if (!parent || parent.getRootNode() !== root) break;
    current = parent;
  }

  return parts.join(' > ');
}

export function sameOriginFrameDocument(frame: Element): Document | null {
  const tag = frame.tagName.toLowerCase();
  if (tag !== 'iframe' && tag !== 'frame') return null;
  try {
    const nested = (frame as Element & { contentDocument?: Document | null }).contentDocument ?? null;
    if (!nested?.documentElement) return null;
    void nested.documentElement.tagName;
    return nested;
  } catch {
    return null;
  }
}

export function composedSelectorFor(element: Element): string {
  const root = element.getRootNode();
  if (isShadowRoot(root)) {
    const local = localSelectorFor(element, root);
    return `${composedSelectorFor(root.host)} ${SHADOW_PATH_MARKER} ${local}`;
  }

  const ownerDocument = element.ownerDocument;
  const local = localSelectorFor(element, ownerDocument);
  try {
    const frameElement = ownerDocument.defaultView?.frameElement;
    if (frameElement && frameElement.nodeType === 1) {
      return `${composedSelectorFor(frameElement as Element)} ${FRAME_PATH_MARKER} ${local}`;
    }
  } catch {
    // A document that cannot expose its parent frame is already an inspection boundary.
  }
  return local;
}

export function resolveComposedSelector(
  path: string,
  startDocument: Document = document,
): Element | null {
  const tokens = path.split(/\s+\|(shadow|frame)\|\s+/);
  const first = tokens[0]?.trim();
  if (!first) return null;

  let context: Document | ShadowRoot = startDocument;
  let current: Element | null = null;
  try {
    current = context.querySelector(first);
  } catch {
    return null;
  }
  if (!current) return null;

  for (let index = 1; index < tokens.length; index += 2) {
    const boundary = tokens[index];
    const selector = tokens[index + 1]?.trim();
    if (!selector) return null;

    if (boundary === 'shadow') {
      const shadowRoot = (current as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot ?? null;
      if (!shadowRoot || shadowRoot.mode !== 'open') return null;
      context = shadowRoot;
    } else if (boundary === 'frame') {
      const nested = sameOriginFrameDocument(current);
      if (!nested) return null;
      context = nested;
    } else {
      return null;
    }

    try {
      current = context.querySelector(selector);
    } catch {
      return null;
    }
    if (!current) return null;
  }

  return current;
}

function knownClosedShadowHosts(targetDocument: Document): Set<Element> {
  const hosts = new Set<Element>();
  const view = targetDocument.defaultView;
  if (!view) return hosts;

  const collect = (event: Event) => {
    const target = event.target;
    if (target && (target as Node).nodeType === 1 && (target as Element).ownerDocument === targetDocument) {
      hosts.add(target as Element);
    }
  };

  view.addEventListener(CLOSED_SHADOW_HOST_EVENT, collect, true);
  try {
    view.dispatchEvent(new Event(CLOSED_SHADOW_REQUEST_EVENT));
  } catch {
    // The MAIN-world bridge is optional on the current page.
  } finally {
    view.removeEventListener(CLOSED_SHADOW_HOST_EVENT, collect, true);
  }
  return hosts;
}

function directChildren(container: Document | ShadowRoot | Element): Element[] {
  if (isDocument(container)) return container.documentElement ? [container.documentElement] : [];
  return Array.from(container.children);
}

export function traverseComposedTree(
  root: ComposedRoot,
  limits: Partial<ComposedTraversalLimits> = {},
): ComposedTraversalResult {
  const budget: ComposedTraversalLimits = { ...DEFAULT_COMPOSED_TRAVERSAL_LIMITS, ...limits };
  const elements: Element[] = [];
  const coverageLimits: ComposedCoverageLimit[] = [];
  const seenElements = new Set<Element>();
  const seenDocuments = new Set<Document>();
  const closedByDocument = new WeakMap<Document, Set<Element>>();
  let shadowRootsTraversed = 0;
  let framesTraversed = 0;
  let budgetExceeded = false;

  const closedHosts = (targetDocument: Document) => {
    let known = closedByDocument.get(targetDocument);
    if (!known) {
      known = knownClosedShadowHosts(targetDocument);
      closedByDocument.set(targetDocument, known);
    }
    return known;
  };

  const noteBudget = (element?: Element) => {
    if (budgetExceeded) return;
    budgetExceeded = true;
    coverageLimits.push({
      kind: 'budget',
      ...(element ? { element } : {}),
      detail: `Composed traversal stopped at the shared ${budget.maxElements}-element / ${budget.maxShadowRoots}-shadow-root / ${budget.maxFrames}-frame / depth-${budget.maxDepth} budget. Content beyond that boundary was not verified clean.`,
    });
  };

  let visitElement: (element: Element, depth: number) => void;
  const visitContainer = (container: Document | ShadowRoot | Element, depth: number) => {
    if (budgetExceeded) return;
    if (depth > budget.maxDepth) {
      noteBudget(container instanceof Element ? container : undefined);
      return;
    }
    for (const child of directChildren(container)) {
      visitElement(child, depth);
      if (budgetExceeded) return;
    }
  };

  visitElement = (element: Element, depth: number) => {
    if (budgetExceeded || seenElements.has(element)) return;
    if (depth > budget.maxDepth || elements.length >= budget.maxElements) {
      noteBudget(element);
      return;
    }
    seenElements.add(element);
    elements.push(element);

    const ownerDocument = element.ownerDocument;
    seenDocuments.add(ownerDocument);

    const tag = element.tagName.toLowerCase();
    if (tag === 'iframe' || tag === 'frame') {
      const nested = sameOriginFrameDocument(element);
      if (!nested) {
        coverageLimits.push({
          kind: 'frame-unavailable',
          element,
          detail: 'Nested frame document was unavailable to the local composed traversal; its descendants were not verified clean.',
        });
      } else if (framesTraversed >= budget.maxFrames) {
        noteBudget(element);
      } else if (!seenDocuments.has(nested)) {
        framesTraversed += 1;
        seenDocuments.add(nested);
        visitContainer(nested, depth + 1);
      }
    }

    const shadowRoot = (element as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot ?? null;
    if (shadowRoot?.mode === 'open') {
      if (shadowRootsTraversed >= budget.maxShadowRoots) {
        noteBudget(element);
        return;
      }
      shadowRootsTraversed += 1;
      visitContainer(shadowRoot, depth + 1);
      return;
    }

    if (closedHosts(ownerDocument).has(element)) {
      coverageLimits.push({
        kind: 'closed-shadow',
        element,
        detail: 'A closed shadow root was observed on this host by the MAIN-world bridge. Its descendants are intentionally inaccessible and were not verified clean.',
      });
      return;
    }

    if (tag === 'slot') {
      const assigned = typeof (element as HTMLSlotElement).assignedElements === 'function'
        ? (element as HTMLSlotElement).assignedElements({ flatten: true })
        : [];
      if (assigned.length) {
        for (const assignedElement of assigned) visitElement(assignedElement, depth + 1);
        return;
      }
    }

    for (const child of Array.from(element.children)) visitElement(child, depth + 1);
  };

  if (isDocument(root)) {
    seenDocuments.add(root);
    visitContainer(root, 0);
  } else {
    visitElement(root, 0);
  }

  return {
    elements,
    coverageLimits,
    shadowRootsTraversed,
    framesTraversed,
    budgetExceeded,
  };
}
