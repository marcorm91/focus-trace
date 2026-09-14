import { composedSelectorFor } from './composed-tree';
import { registeredExplicitAriaRole } from './standards-registry';

export function selectorFor(element: Element): string {
  return composedSelectorFor(element);
}

function computedStyleFor(element: Element): CSSStyleDeclaration {
  const view = element.ownerDocument.defaultView;
  return view?.getComputedStyle(element) ?? getComputedStyle(element);
}

function tagName(element: Element): string {
  return element.tagName.toLowerCase();
}

function composedParentElement(element: Element): Element | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  if (root?.nodeType === 11 && 'host' in (root as object)) return (root as ShadowRoot).host;
  if (element === element.ownerDocument.documentElement) {
    try {
      const frame = element.ownerDocument.defaultView?.frameElement;
      return frame && frame.nodeType === 1 ? frame as Element : null;
    } catch {
      return null;
    }
  }
  return null;
}

function hasInertAncestor(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (current.hasAttribute('inert')) return true;
    current = composedParentElement(current);
  }
  return false;
}

function idReference(element: Element, id: string): Element | null {
  const root = element.getRootNode();
  if (root && 'getElementById' in (root as object)) {
    try {
      return (root as Document | ShadowRoot).getElementById(id);
    } catch {
      // Fall through to the owning document.
    }
  }
  return element.ownerDocument.getElementById(id);
}

function normalise(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

export type AccessibleNameSource =
  | 'aria-labelledby'
  | 'aria-label'
  | 'label'
  | 'alt'
  | 'value'
  | 'subtree'
  | 'title'
  | 'placeholder'
  | 'aria-placeholder'
  | 'default'
  | 'none';

export interface AccessibleNameResult {
  name: string;
  source: AccessibleNameSource;
}

export interface AccessibleNameCandidateDiagnostic {
  source: AccessibleNameSource;
  selector: string;
  value: string;
  used: boolean;
}

export interface AccessibleNameDiagnostic extends AccessibleNameResult {
  role: string | null;
  candidates: AccessibleNameCandidateDiagnostic[];
}

interface NameContext {
  allowLabelledBy: boolean;
  referenced: boolean;
  visited: Set<Element>;
}

const NAME_FROM_CONTENT_ROLES = new Set([
  'button',
  'checkbox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'switch',
  'tab',
  'treeitem',
]);

const TEXT_LIKE_INPUT_TYPES = new Set([
  'email',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'url',
]);

const ARIA_DISABLED_UI_ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'gridcell',
  'link',
  'listbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'scrollbar',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
  'treeitem',
]);

function isAccNameHidden(element: Element): boolean {
  const style = computedStyleFor(element);
  if (style.display === 'none') return true;
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return true;
  if (style.getPropertyValue('content-visibility') === 'hidden') return true;
  return element.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true';
}

function labelableLabels(element: Element): readonly HTMLLabelElement[] {
  const tag = tagName(element);
  if (!['button', 'input', 'meter', 'output', 'progress', 'select', 'textarea'].includes(tag)) return [];
  const labels = (element as Element & { labels?: NodeListOf<HTMLLabelElement> | null }).labels;
  return labels ? Array.from(labels) : [];
}

function embeddedControlValue(element: Element): string {
  const tag = tagName(element);
  if (tag === 'input' || tag === 'textarea') return normalise((element as Element & { value?: string }).value);
  if (tag === 'select') {
    const selected = (element as Element & { selectedOptions?: HTMLCollectionOf<HTMLOptionElement> }).selectedOptions;
    return normalise(selected ? Array.from(selected).map((option) => option.textContent ?? '').join(' ') : '');
  }
  return '';
}

function subtreeTextAlternative(root: Element, options: { includeHidden: boolean; exclude?: Element }): string {
  const pieces: string[] = [];

  const visit = (node: Node) => {
    if (node === options.exclude) return;

    if (node.nodeType === Node.TEXT_NODE) {
      pieces.push(node.textContent ?? '');
      return;
    }

    if (node.nodeType !== 1) return;
    const elementNode = node as Element;
    if (!options.includeHidden && isAccNameHidden(elementNode)) return;

    if (['input', 'select', 'textarea'].includes(tagName(elementNode))) {
      const value = embeddedControlValue(elementNode);
      if (value) pieces.push(value);
      return;
    }

    // During name-from-content traversal, a descendant's own ARIA naming
    // mechanism contributes its text alternative. This is what lets an
    // icon-only button inherit a name from <svg role="img" aria-label="…">.
    if (elementNode.hasAttribute('aria-labelledby') || normalise(elementNode.getAttribute('aria-label'))) {
      const descendantName = computeName(elementNode, {
        allowLabelledBy: true,
        referenced: false,
        visited: new Set([root]),
      }).name;
      if (descendantName) pieces.push(descendantName);
      return;
    }

    if (tagName(elementNode) === 'img' || tagName(elementNode) === 'area') {
      pieces.push(elementNode.getAttribute('alt') || '');
      return;
    }

    if (elementNode.namespaceURI === 'http://www.w3.org/2000/svg' && tagName(elementNode) === 'title') {
      pieces.push(elementNode.textContent ?? '');
      return;
    }

    for (const child of elementNode.childNodes) visit(child);
  };

  for (const child of root.childNodes) visit(child);
  return normalise(pieces.join(' '));
}

function associatedLabelText(element: Element): string {
  const labels = labelableLabels(element);
  if (!labels.length) return '';

  return normalise(
    labels
      .map((label) => subtreeTextAlternative(label, { includeHidden: true, exclude: element }))
      .join(' '),
  );
}

function computeName(element: Element, context: NameContext): AccessibleNameResult {
  if (context.visited.has(element)) return { name: '', source: 'none' };
  if (!context.referenced && isAccNameHidden(element)) return { name: '', source: 'none' };

  const visited = new Set(context.visited);
  visited.add(element);

  if (context.allowLabelledBy) {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const references = labelledBy
        .trim()
        .split(/\s+/)
        .map((id) => idReference(element, id))
        .filter((reference): reference is HTMLElement => reference != null);

      if (references.length) {
        const pieces = references.map((reference) => {
          if (reference === element) {
            return computeName(element, {
              allowLabelledBy: false,
              referenced: true,
              visited: context.visited,
            }).name;
          }

          return computeName(reference, {
            allowLabelledBy: true,
            referenced: true,
            visited,
          }).name;
        });
        const name = normalise(pieces.join(' '));
        if (name) return { name, source: 'aria-labelledby' };
      }
    }
  }

  const ariaLabel = normalise(element.getAttribute('aria-label'));
  if (ariaLabel) return { name: ariaLabel, source: 'aria-label' };

  const label = associatedLabelText(element);
  if (label) return { name: label, source: 'label' };

  const elementTag = tagName(element);
  if (elementTag === 'img') {
    if (element.hasAttribute('alt')) return { name: normalise(element.getAttribute('alt')), source: 'alt' };
    const title = normalise(element.getAttribute('title'));
    if (title) return { name: title, source: 'title' };
  }
  if (elementTag === 'area') {
    const alt = normalise(element.getAttribute('alt'));
    if (alt) return { name: alt, source: 'alt' };
    const title = normalise(element.getAttribute('title'));
    if (title) return { name: title, source: 'title' };
  }
  if (elementTag === 'input') {
    const type = normalise(element.getAttribute('type') || 'text').toLowerCase();
    if (type === 'image') {
      const alt = normalise(element.getAttribute('alt'));
      if (alt) return { name: alt, source: 'alt' };
      const title = normalise(element.getAttribute('title'));
      if (title) return { name: title, source: 'title' };
      return { name: 'Submit', source: 'default' };
    }
    if (['button', 'submit', 'reset'].includes(type)) {
      const value = normalise(element.getAttribute('value'));
      if (value) return { name: value, source: 'value' };
      if (type === 'submit') return { name: 'Submit', source: 'default' };
      if (type === 'reset') return { name: 'Reset', source: 'default' };
      const title = normalise(element.getAttribute('title'));
      if (title) return { name: title, source: 'title' };
      return { name: '', source: 'none' };
    }
    if (TEXT_LIKE_INPUT_TYPES.has(type)) {
      const title = normalise(element.getAttribute('title'));
      if (title) return { name: title, source: 'title' };
      const placeholder = normalise(element.getAttribute('placeholder'));
      if (placeholder) return { name: placeholder, source: 'placeholder' };
      const ariaPlaceholder = normalise(element.getAttribute('aria-placeholder'));
      if (ariaPlaceholder) return { name: ariaPlaceholder, source: 'aria-placeholder' };
      return { name: '', source: 'none' };
    }
    const title = normalise(element.getAttribute('title'));
    if (title) return { name: title, source: 'title' };
  }
  if (elementTag === 'textarea') {
    const title = normalise(element.getAttribute('title'));
    if (title) return { name: title, source: 'title' };
    const placeholder = normalise(element.getAttribute('placeholder'));
    if (placeholder) return { name: placeholder, source: 'placeholder' };
    const ariaPlaceholder = normalise(element.getAttribute('aria-placeholder'));
    if (ariaPlaceholder) return { name: ariaPlaceholder, source: 'aria-placeholder' };
    return { name: '', source: 'none' };
  }
  if (elementTag === 'select') {
    const title = normalise(element.getAttribute('title'));
    if (title) return { name: title, source: 'title' };
    return { name: '', source: 'none' };
  }

  const role = semanticRole(element);
  if (context.referenced || NAME_FROM_CONTENT_ROLES.has(role ?? '')) {
    const name = subtreeTextAlternative(element, {
      includeHidden: context.referenced && isAccNameHidden(element),
    });
    if (name) return { name, source: 'subtree' };
  }

  const title = normalise(element.getAttribute('title'));
  if (title) return { name: title, source: 'title' };

  return { name: '', source: 'none' };
}

export function accessibleNameDetails(element: Element): AccessibleNameResult {
  return computeName(element, {
    allowLabelledBy: true,
    referenced: false,
    visited: new Set<Element>(),
  });
}

function candidate(
  element: Element,
  source: AccessibleNameSource,
  value: string,
  result: AccessibleNameResult,
): AccessibleNameCandidateDiagnostic {
  const normalizedValue = normalise(value);
  return {
    source,
    selector: selectorFor(element),
    value: normalizedValue,
    used:
      normalizedValue.length > 0 &&
      (result.source === source || (result.source === 'subtree' && result.name.includes(normalizedValue))),
  };
}

export function accessibleNameDiagnostics(element: Element): AccessibleNameDiagnostic {
  const result = accessibleNameDetails(element);
  const candidates: AccessibleNameCandidateDiagnostic[] = [];

  if (element.hasAttribute('aria-labelledby')) {
    const ids = normalise(element.getAttribute('aria-labelledby')).split(/\s+/).filter(Boolean);
    const value = ids
      .map((id) => idReference(element, id))
      .filter((reference): reference is HTMLElement => reference != null)
      .map((reference) => accessibleNameDetails(reference).name)
      .join(' ');
    candidates.push(candidate(element, 'aria-labelledby', value, result));
  }

  if (element.hasAttribute('aria-label')) {
    candidates.push(candidate(element, 'aria-label', element.getAttribute('aria-label') ?? '', result));
  }

  if (labelableLabels(element).length) {
    candidates.push(candidate(element, 'label', associatedLabelText(element), result));
  }

  if ((tagName(element) === 'img' || tagName(element) === 'area') && element.hasAttribute('alt')) {
    candidates.push(candidate(element, 'alt', element.getAttribute('alt') ?? '', result));
  }

  if (tagName(element) === 'input' && element.hasAttribute('value')) {
    candidates.push(candidate(element, 'value', element.getAttribute('value') ?? '', result));
  }

  const role = semanticRole(element);
  if (NAME_FROM_CONTENT_ROLES.has(role ?? '')) {
    candidates.push(candidate(element, 'subtree', subtreeTextAlternative(element, { includeHidden: false }), result));
  }

  for (const descendant of [...element.querySelectorAll('[aria-labelledby], [aria-label]')].slice(0, 8)) {
    const details = accessibleNameDetails(descendant);
    const source = descendant.hasAttribute('aria-labelledby')
      ? 'aria-labelledby'
      : descendant.hasAttribute('aria-label')
        ? 'aria-label'
        : details.source === 'none'
          ? 'subtree'
          : details.source;
    const value = source === 'aria-label'
      ? descendant.getAttribute('aria-label') ?? ''
      : details.name;
    candidates.push(candidate(descendant, source, value, result));
  }

  if (element.hasAttribute('title')) {
    candidates.push(candidate(element, 'title', element.getAttribute('title') ?? '', result));
  }
  if (element.hasAttribute('placeholder')) {
    candidates.push(candidate(element, 'placeholder', element.getAttribute('placeholder') ?? '', result));
  }
  if (element.hasAttribute('aria-placeholder')) {
    candidates.push(candidate(element, 'aria-placeholder', element.getAttribute('aria-placeholder') ?? '', result));
  }

  return { ...result, role, candidates };
}

export function accessibleName(element: Element): string {
  return accessibleNameDetails(element).name;
}

export function isProgrammaticallyHidden(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    const style = computedStyleFor(current);
    if (style.display === 'none') return true;
    if (current.getAttribute('aria-hidden')?.toLowerCase() === 'true') return true;
    current = composedParentElement(current);
  }
  return computedStyleFor(element).visibility !== 'visible';
}

function nativeRoleFor(element: Element): string | null {
  const tag = tagName(element);
  if (tag === 'button') return 'button';
  if ((tag === 'a' || tag === 'area') && element.hasAttribute('href')) return 'link';
  if (tag === 'img') return element.hasAttribute('alt') && element.getAttribute('alt') === '' ? 'presentation' : 'img';
  if (tag === 'select') {
    const size = Number.parseInt(element.getAttribute('size') ?? '0', 10);
    return element.hasAttribute('multiple') || (Number.isFinite(size) && size > 1) ? 'listbox' : 'combobox';
  }
  if (tag === 'textarea') return 'textbox';
  if (tag === 'input') {
    switch (normalise(element.getAttribute('type') || 'text').toLowerCase()) {
      case 'button':
      case 'submit':
      case 'reset': return 'button';
      case 'checkbox': return 'checkbox';
      case 'radio': return 'radio';
      case 'range': return 'slider';
      case 'number': return 'spinbutton';
      case 'search': return 'searchbox';
      case 'hidden': return null;
      case 'image': return 'button';
      default: return 'textbox';
    }
  }
  return null;
}

function matchesDisabled(element: Element): boolean {
  try { return element.matches(':disabled'); } catch { return element.hasAttribute('disabled'); }
}

function isNativeDisableableElement(element: Element): boolean {
  return ['button', 'input', 'select', 'textarea', 'fieldset', 'optgroup', 'option'].includes(tagName(element));
}

function isNativeUiControl(element: Element): boolean {
  return ['button', 'input', 'select', 'textarea', 'option'].includes(tagName(element));
}

function isNativeElementDisabled(element: Element): boolean {
  return isNativeDisableableElement(element) && matchesDisabled(element);
}

export function semanticRole(element: Element): string | null {
  const nativeRole = nativeRoleFor(element);
  const explicit = registeredExplicitAriaRole(element)?.name;
  if (!explicit) return nativeRole;
  if ((explicit === 'none' || explicit === 'presentation') && nativeRole && isNativeControlFocusable(element)) return nativeRole;
  return explicit;
}

function isNativeControlFocusable(element: Element): boolean {
  const tag = tagName(element);
  if (tag === 'button') return !isNativeElementDisabled(element);
  if (tag === 'a' || tag === 'area') return element.hasAttribute('href');
  if (tag === 'input') return !isNativeElementDisabled(element) && normalise(element.getAttribute('type') || 'text').toLowerCase() !== 'hidden';
  if (tag === 'select' || tag === 'textarea') return !isNativeElementDisabled(element);
  return element.hasAttribute('tabindex');
}

export function isDisabledUiComponent(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (isNativeUiControl(current) && isNativeElementDisabled(current)) return true;
    if (
      current.getAttribute('aria-disabled')?.trim().toLowerCase() === 'true'
      && ARIA_DISABLED_UI_ROLES.has(semanticRole(current) ?? '')
    ) {
      return true;
    }
    current = composedParentElement(current);
  }
  return false;
}

function isCssHidden(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    const style = computedStyleFor(current);
    if (style.display === 'none') return true;
    if (style.visibility === 'hidden' || style.visibility === 'collapse') return true;
    if (style.getPropertyValue('content-visibility') === 'hidden') return true;
    current = composedParentElement(current);
  }
  return false;
}

export function isSequentiallyFocusable(element: Element): boolean {
  if (isCssHidden(element)) return false;
  if (hasInertAncestor(element)) return false;
  if (isNativeElementDisabled(element)) return false;
  const tag = tagName(element);
  if (tag === 'input' && normalise(element.getAttribute('type') || 'text').toLowerCase() === 'hidden') return false;
  const tabindex = element.getAttribute('tabindex');
  if (tabindex != null) {
    const parsed = Number.parseInt(tabindex, 10);
    return Number.isFinite(parsed) && parsed >= 0;
  }
  if (tag === 'a' || tag === 'area') return element.hasAttribute('href');
  if (['button', 'select', 'textarea', 'input', 'summary', 'iframe', 'frame'].includes(tag)) return true;
  if (tag === 'audio' || tag === 'video') return element.hasAttribute('controls');
  if (element.getAttribute('contenteditable')?.trim().toLowerCase() === 'true') return true;
  return false;
}

export function isMarkedDecorative(element: Element): boolean {
  const role = semanticRole(element);
  if (role === 'none' || role === 'presentation') return true;
  return tagName(element) === 'img' && element.hasAttribute('alt') && element.getAttribute('alt') === '' && !element.hasAttribute('role');
}
