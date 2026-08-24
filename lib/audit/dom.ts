export function selectorFor(element: Element): string {
  if (element.id) return `#${CSS.escape(element.id)}`;

  const parts: string[] = [];
  let current: Element | null = element;
  while (current && parts.length < 4) {
    let part = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (parent) {
      const currentTag = current.tagName;
      const siblings = [...parent.children].filter((child) => child.tagName === currentTag);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = parent;
  }
  return parts.join(' > ');
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

function isAccNameHidden(element: Element): boolean {
  const style = getComputedStyle(element);
  if (style.display === 'none') return true;
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return true;
  if (style.getPropertyValue('content-visibility') === 'hidden') return true;
  return element.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true';
}

function labelableLabels(element: Element): readonly HTMLLabelElement[] {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLMeterElement ||
    element instanceof HTMLOutputElement ||
    element instanceof HTMLProgressElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element.labels ? [...element.labels] : [];
  }
  return [];
}

function embeddedControlValue(element: Element): string {
  if (element instanceof HTMLInputElement) return normalise(element.value);
  if (element instanceof HTMLTextAreaElement) return normalise(element.value);
  if (element instanceof HTMLSelectElement) {
    return normalise([...element.selectedOptions].map((option) => option.textContent ?? '').join(' '));
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

    if (!(node instanceof Element)) return;
    if (!options.includeHidden && isAccNameHidden(node)) return;

    if (node instanceof HTMLImageElement || node instanceof HTMLAreaElement) {
      pieces.push(node.getAttribute('aria-label') || node.getAttribute('alt') || '');
      return;
    }

    if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement) {
      const value = embeddedControlValue(node);
      if (value) pieces.push(value);
      return;
    }

    if (node instanceof SVGElement && node.tagName.toLowerCase() === 'title') {
      pieces.push(node.textContent ?? '');
      return;
    }

    for (const child of node.childNodes) visit(child);
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
        .map((id) => document.getElementById(id))
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

  if (element instanceof HTMLImageElement) {
    if (element.hasAttribute('alt')) return { name: normalise(element.alt), source: 'alt' };
    const title = normalise(element.title);
    if (title) return { name: title, source: 'title' };
  }

  if (element instanceof HTMLAreaElement) {
    const alt = normalise(element.alt);
    if (alt) return { name: alt, source: 'alt' };
    const title = normalise(element.title);
    if (title) return { name: title, source: 'title' };
  }

  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();

    if (type === 'image') {
      const alt = normalise(element.alt);
      if (alt) return { name: alt, source: 'alt' };
      const title = normalise(element.title);
      if (title) return { name: title, source: 'title' };
      return { name: 'Submit', source: 'default' };
    }

    if (['button', 'submit', 'reset'].includes(type)) {
      const value = normalise(element.getAttribute('value'));
      if (value) return { name: value, source: 'value' };
      if (type === 'submit') return { name: 'Submit', source: 'default' };
      if (type === 'reset') return { name: 'Reset', source: 'default' };
      const title = normalise(element.title);
      if (title) return { name: title, source: 'title' };
      return { name: '', source: 'none' };
    }

    if (TEXT_LIKE_INPUT_TYPES.has(type)) {
      const title = normalise(element.title);
      if (title) return { name: title, source: 'title' };
      const placeholder = normalise(element.placeholder);
      if (placeholder) return { name: placeholder, source: 'placeholder' };
      const ariaPlaceholder = normalise(element.getAttribute('aria-placeholder'));
      if (ariaPlaceholder) return { name: ariaPlaceholder, source: 'aria-placeholder' };
      return { name: '', source: 'none' };
    }

    const title = normalise(element.title);
    if (title) return { name: title, source: 'title' };
  }

  if (element instanceof HTMLTextAreaElement) {
    const title = normalise(element.title);
    if (title) return { name: title, source: 'title' };
    const placeholder = normalise(element.placeholder);
    if (placeholder) return { name: placeholder, source: 'placeholder' };
    const ariaPlaceholder = normalise(element.getAttribute('aria-placeholder'));
    if (ariaPlaceholder) return { name: ariaPlaceholder, source: 'aria-placeholder' };
    return { name: '', source: 'none' };
  }

  if (element instanceof HTMLSelectElement) {
    const title = normalise(element.title);
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

export function accessibleName(element: Element): string {
  return accessibleNameDetails(element).name;
}

export function isProgrammaticallyHidden(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    const style = getComputedStyle(current);
    if (style.display === 'none') return true;
    if (current.getAttribute('aria-hidden')?.toLowerCase() === 'true') return true;
    current = current.parentElement;
  }
  return getComputedStyle(element).visibility !== 'visible';
}

export function semanticRole(element: Element): string | null {
  const nativeRole = (() => {
    if (element instanceof HTMLButtonElement) return 'button';
    if (element instanceof HTMLAnchorElement && element.hasAttribute('href')) return 'link';
    if (element instanceof HTMLAreaElement && element.hasAttribute('href')) return 'link';
    if (element instanceof HTMLImageElement) return element.alt === '' ? 'presentation' : 'img';
    if (element instanceof HTMLSelectElement) return element.multiple || element.size > 1 ? 'listbox' : 'combobox';
    if (element instanceof HTMLTextAreaElement) return 'textbox';
    if (element instanceof HTMLInputElement) {
      switch (element.type.toLowerCase()) {
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
  })();

  const explicit = element.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase();
  if (!explicit) return nativeRole;
  if ((explicit === 'none' || explicit === 'presentation') && nativeRole && isNativeControlFocusable(element)) return nativeRole;
  return explicit;
}

function isNativeControlFocusable(element: Element): boolean {
  if (element instanceof HTMLButtonElement) return !element.disabled;
  if (element instanceof HTMLAnchorElement || element instanceof HTMLAreaElement) return element.hasAttribute('href');
  if (element instanceof HTMLInputElement) return !element.disabled && element.type !== 'hidden';
  if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) return !element.disabled;
  return element.hasAttribute('tabindex');
}

function isCssHidden(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (getComputedStyle(current).display === 'none') return true;
    current = current.parentElement;
  }
  return getComputedStyle(element).visibility !== 'visible';
}

export function isSequentiallyFocusable(element: Element): boolean {
  if (isCssHidden(element)) return false;
  if (element instanceof HTMLButtonElement && element.disabled) return false;
  if (element instanceof HTMLInputElement && element.disabled) return false;
  if (element instanceof HTMLSelectElement && element.disabled) return false;
  if (element instanceof HTMLTextAreaElement && element.disabled) return false;
  if (element instanceof HTMLFieldSetElement && element.disabled) return false;

  const tabindex = element.getAttribute('tabindex');
  if (tabindex != null) {
    const parsed = Number.parseInt(tabindex, 10);
    return Number.isFinite(parsed) && parsed >= 0;
  }

  if (element instanceof HTMLAnchorElement || element instanceof HTMLAreaElement) return element.hasAttribute('href');
  if (element instanceof HTMLButtonElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) return element.type !== 'hidden';
  if (element instanceof HTMLElement && element.tagName === 'SUMMARY') return true;
  if (element instanceof HTMLIFrameElement) return true;
  if (element instanceof HTMLAudioElement || element instanceof HTMLVideoElement) return element.controls;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  return false;
}

export function isMarkedDecorative(element: Element): boolean {
  const role = element.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase();
  if (role === 'none' || role === 'presentation') return true;
  return element instanceof HTMLImageElement && element.hasAttribute('alt') && element.alt === '' && !role;
}
