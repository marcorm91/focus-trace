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

function labelledByText(element: Element): string {
  const ids = element.getAttribute('aria-labelledby');
  if (!ids) return '';
  return normalise(ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
}

function associatedLabelText(element: Element): string {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) return '';
  const labels = element.labels;
  if (!labels?.length) return '';
  return normalise([...labels].map((label) => label.textContent ?? '').join(' '));
}

function subtreeTextAlternative(element: Element): string {
  const pieces: string[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) pieces.push(node.textContent ?? '');
    else if (node instanceof HTMLImageElement) pieces.push(node.alt || node.title || '');
    else if (node instanceof SVGElement && node.tagName.toLowerCase() === 'title') pieces.push(node.textContent ?? '');
    node = walker.nextNode();
  }
  return normalise(pieces.join(' '));
}

export function accessibleName(element: Element): string {
  const labelledBy = labelledByText(element);
  if (labelledBy) return labelledBy;
  const ariaLabel = normalise(element.getAttribute('aria-label'));
  if (ariaLabel) return ariaLabel;
  const label = associatedLabelText(element);
  if (label) return label;

  if (element instanceof HTMLImageElement || element instanceof HTMLAreaElement) {
    const alt = normalise(element.getAttribute('alt'));
    if (alt) return alt;
  }

  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    if (type === 'image' && normalise(element.alt)) return normalise(element.alt);
    if (['button', 'submit', 'reset'].includes(type)) {
      const value = normalise(element.value);
      if (value) return value;
      if (type === 'submit') return 'Submit';
      if (type === 'reset') return 'Reset';
    }
    const placeholder = normalise(element.placeholder);
    if (placeholder) return placeholder;
  }

  if (element instanceof HTMLTextAreaElement) {
    const placeholder = normalise(element.placeholder);
    if (placeholder) return placeholder;
  }

  const role = semanticRole(element);
  if (['button', 'link', 'checkbox', 'radio', 'switch', 'menuitem', 'menuitemcheckbox', 'menuitemradio'].includes(role ?? '')) {
    const subtree = subtreeTextAlternative(element);
    if (subtree) return subtree;
  }

  return normalise(element.getAttribute('title'));
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
