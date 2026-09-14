import type {
  FindingNodeSignature,
  FindingTargetResolution,
} from '../audit/finding-recheck';
import type { ElementSnapshot } from '../../shared/types';

/**
 * IMPORTANT: keep this function self-contained.
 * Chromium serializes only `func` when it is passed to scripting.executeScript.
 */
export function resolveFindingTargetInPage(
  signature: FindingNodeSignature,
): FindingTargetResolution {
  type SelectorRoot = Document | ShadowRoot;

  const normalize = (value: string | null | undefined) =>
    value?.replace(/\s+/g, ' ').trim() ?? '';

  const implicitRole = (element: Element): string | undefined => {
    const explicit = element.getAttribute('role')?.trim().split(/\s+/)[0];
    if (explicit) return explicit;
    const tag = element.tagName.toLowerCase();
    if (tag === 'button') return 'button';
    if (tag === 'a' && element.hasAttribute('href')) return 'link';
    if (tag === 'select') return element.hasAttribute('multiple') ? 'listbox' : 'combobox';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'main') return 'main';
    if (tag === 'nav') return 'navigation';
    if (tag === 'form') return 'form';
    if (tag === 'table') return 'table';
    if (tag === 'ul' || tag === 'ol') return 'list';
    if (tag === 'li') return 'listitem';
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'img' && element.getAttribute('alt') !== '') return 'img';
    if (tag === 'input') {
      const type = (element.getAttribute('type') || 'text').toLowerCase();
      if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'range') return 'slider';
      if (type === 'number') return 'spinbutton';
      if (!['hidden'].includes(type)) return 'textbox';
    }
    return undefined;
  };

  const accessibleName = (element: Element): string | undefined => {
    const labelledBy = element.getAttribute('aria-labelledby')?.trim();
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? '')
        .join(' ');
      const name = normalize(text);
      if (name) return name.slice(0, 120);
    }
    const ariaLabel = normalize(element.getAttribute('aria-label'));
    if (ariaLabel) return ariaLabel.slice(0, 120);
    const tag = element.tagName.toLowerCase();
    if (tag === 'img' || tag === 'area' || (tag === 'input' && element.getAttribute('type') === 'image')) {
      const alt = normalize(element.getAttribute('alt'));
      if (alt) return alt.slice(0, 120);
    }
    const id = element.id;
    if (id) {
      const labels = Array.from(element.ownerDocument.querySelectorAll('label[for]'))
        .filter((label) => label.getAttribute('for') === id)
        .map((label) => label.textContent ?? '')
        .join(' ');
      const name = normalize(labels);
      if (name) return name.slice(0, 120);
    }
    const wrappingLabel = element.closest('label');
    const wrapped = normalize(wrappingLabel?.textContent);
    if (wrapped) return wrapped.slice(0, 120);
    const text = normalize(element.textContent);
    if (text) return text.slice(0, 120);
    const title = normalize(element.getAttribute('title'));
    return title ? title.slice(0, 120) : undefined;
  };

  const snapshot = (element: Element, locator: string): ElementSnapshot => {
    const result: ElementSnapshot = {
      tag: element.tagName.toLowerCase(),
      selector: locator,
    };
    if (element.id) result.id = element.id.slice(0, 120);
    const role = implicitRole(element);
    if (role) result.role = role;
    const className = normalize(element.getAttribute('class')).slice(0, 140);
    if (className) result.className = className;
    const name = accessibleName(element);
    if (name) result.name = name;
    return result;
  };

  const escapedId = (value: string): string => {
    try {
      if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    } catch {
      // Use the conservative fallback below.
    }
    return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
  };

  const uniqueInRoot = (root: SelectorRoot, selector: string, element?: Element): boolean => {
    try {
      const matches = root.querySelectorAll(selector);
      return matches.length === 1 && (!element || matches[0] === element);
    } catch {
      return false;
    }
  };

  const localSelector = (element: Element, root: SelectorRoot): string => {
    if (element.id) {
      const idSelector = `#${escapedId(element.id)}`;
      if (uniqueInRoot(root, idSelector, element)) return idSelector;
    }
    const parts: string[] = [];
    let current: Element | null = element;
    while (current) {
      let part = current.tagName.toLowerCase();
      const parent: Element | null = current.parentElement;
      if (parent && parent.getRootNode() === root) {
        const siblings = Array.from(parent.children)
          .filter((candidate: Element) => candidate.tagName === current!.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      const selector = parts.join(' > ');
      if (uniqueInRoot(root, selector, element)) return selector;
      if (!parent || parent.getRootNode() !== root) break;
      current = parent;
    }
    return parts.join(' > ');
  };

  const composedSelector = (element: Element): string => {
    const root = element.getRootNode();
    if (root?.nodeType === 11 && 'host' in (root as object)) {
      const shadow = root as ShadowRoot;
      return `${composedSelector(shadow.host)} |shadow| ${localSelector(element, shadow)}`;
    }
    const owner = element.ownerDocument;
    const local = localSelector(element, owner);
    try {
      const frame = owner.defaultView?.frameElement;
      if (frame && frame.nodeType === 1) {
        return `${composedSelector(frame as Element)} |frame| ${local}`;
      }
    } catch {
      // The owning frame is an inspection boundary.
    }
    return local;
  };

  const queryUnique = (
    root: SelectorRoot,
    selector: string,
  ): { element?: Element; ambiguous: boolean } => {
    try {
      const matches = root.querySelectorAll(selector);
      if (matches.length === 1) return { element: matches[0]!, ambiguous: false };
      return { ambiguous: matches.length > 1 };
    } catch {
      return { ambiguous: false };
    }
  };

  const resolveExact = (path: string): { element?: Element; ambiguous: boolean } => {
    const tokens = path.split(/\s+\|(shadow|frame)\|\s+/);
    const first = tokens[0]?.trim();
    if (!first) return { ambiguous: false };
    let context: SelectorRoot = document;
    let current = queryUnique(context, first);
    if (current.ambiguous || !current.element) return current;

    for (let index = 1; index < tokens.length; index += 2) {
      const boundary = tokens[index];
      const selector = tokens[index + 1]?.trim();
      if (!selector) return { ambiguous: false };
      if (boundary === 'shadow') {
        const shadow: ShadowRoot | null = (current.element as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot ?? null;
        if (!shadow || shadow.mode !== 'open') return { ambiguous: false };
        context = shadow;
      } else if (boundary === 'frame') {
        try {
          const nested = (current.element as Element & { contentDocument?: Document | null }).contentDocument ?? null;
          if (!nested?.documentElement) return { ambiguous: false };
          context = nested;
        } catch {
          return { ambiguous: false };
        }
      } else {
        return { ambiguous: false };
      }
      current = queryUnique(context, selector);
      if (current.ambiguous || !current.element) return current;
    }
    return current;
  };

  const identityChanged = (element: Element): boolean => {
    if (signature.tag && element.tagName.toLowerCase() !== signature.tag.toLowerCase()) return true;
    if (signature.id && element.id !== signature.id) return true;
    return false;
  };

  if (signature.locator) {
    const exact = resolveExact(signature.locator);
    if (exact.ambiguous) {
      return {
        status: 'ambiguous',
        reason: 'The original locator now matches more than one element. FocusTrace did not choose one automatically.',
        candidateCount: 2,
      };
    }
    if (exact.element) {
      const locator = composedSelector(exact.element);
      const element = snapshot(exact.element, locator);
      if (identityChanged(exact.element)) {
        return {
          status: 'changed',
          reason: 'The original locator resolves, but the element identity no longer matches the original tag or stable id.',
          locator,
          element,
        };
      }
      return {
        status: 'matched',
        reason: 'The original boundary-aware locator still resolves uniquely.',
        locator,
        element,
      };
    }
  }

  const elements: Element[] = [];
  const seen = new Set<Element>();
  let shadowCount = 0;
  let frameCount = 0;
  const MAX_ELEMENTS = 5000;
  const MAX_SHADOWS = 100;
  const MAX_FRAMES = 50;

  const visit = (root: Document | ShadowRoot | Element) => {
    const children = root instanceof Document
      ? (root.documentElement ? [root.documentElement] : [])
      : Array.from(root.children);
    for (const element of children) {
      if (elements.length >= MAX_ELEMENTS || seen.has(element)) return;
      seen.add(element);
      elements.push(element);

      const shadow = (element as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot ?? null;
      if (shadow?.mode === 'open' && shadowCount < MAX_SHADOWS) {
        shadowCount += 1;
        visit(shadow);
      } else {
        visit(element);
      }

      const tag = element.tagName.toLowerCase();
      if ((tag === 'iframe' || tag === 'frame') && frameCount < MAX_FRAMES) {
        try {
          const nested = (element as Element & { contentDocument?: Document | null }).contentDocument ?? null;
          if (nested?.documentElement) {
            frameCount += 1;
            visit(nested);
          }
        } catch {
          // Cross-origin/inaccessible frames remain outside the fallback search.
        }
      }
    }
  };
  visit(document);

  const expectedTag = signature.tag?.toLowerCase();
  const expectedRole = normalize(signature.role).toLowerCase();
  const expectedName = normalize(signature.name).toLowerCase();
  const expectedClassTokens = new Set(normalize(signature.className).split(' ').filter(Boolean));

  const scored = elements.flatMap((element) => {
    const tag = element.tagName.toLowerCase();
    if (expectedTag && tag !== expectedTag) return [];
    if (signature.id && element.id !== signature.id) return [];

    let score = expectedTag ? 2 : 0;
    if (signature.id && element.id === signature.id) score += 6;
    const role = normalize(implicitRole(element)).toLowerCase();
    if (expectedRole && role === expectedRole) score += 2;
    const name = normalize(accessibleName(element)).toLowerCase();
    if (expectedName && name === expectedName) score += 4;
    if (expectedClassTokens.size) {
      const currentTokens = new Set(normalize(element.getAttribute('class')).split(' ').filter(Boolean));
      if ([...expectedClassTokens].some((token) => currentTokens.has(token))) score += 1;
    }
    return score >= 5 ? [{ element, score }] : [];
  }).sort((left, right) => right.score - left.score);

  if (!scored.length) {
    return {
      status: 'missing',
      reason: 'The original locator no longer resolves and no unique element with the stored identity signature was found.',
    };
  }

  const topScore = scored[0]!.score;
  const top = scored.filter((candidate) => candidate.score === topScore);
  if (top.length !== 1) {
    return {
      status: 'ambiguous',
      reason: 'Several elements match the stored identity signature equally well. FocusTrace did not choose one automatically.',
      candidateCount: top.length,
    };
  }

  const target = top[0]!.element;
  const locator = composedSelector(target);
  return {
    status: 'matched',
    reason: 'The original locator changed, but one element uniquely matches the stored identity signature.',
    locator,
    element: snapshot(target, locator),
    relocated: true,
  };
}
