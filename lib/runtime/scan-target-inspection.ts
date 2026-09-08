export interface ScanTargetInspectionNode {
  tag: string;
  selector: string;
  role?: string;
  id?: string;
  className?: string;
  label?: string;
}

export interface ScanTargetInspectionResult {
  found: boolean;
  selector: string;
  target?: ScanTargetInspectionNode;
  context?: ScanTargetInspectionNode;
  html?: string;
}

/**
 * Read a small, bounded snapshot for one scan target from the live page.
 *
 * IMPORTANT: keep this function self-contained. Chromium serializes only the
 * function passed to scripting.executeScript, so page-side helpers must live
 * inside the function body.
 *
 * FocusTrace intentionally does not serialize the full document or a target's
 * complete subtree here. The returned HTML is a short opening-tag context with
 * selected accessibility-relevant attributes and ellipses for descendants.
 */
export function inspectScanTargetInPage(selector: string): ScanTargetInspectionResult {
  const MAX_LABEL = 120;
  const MAX_CLASS = 140;
  const MAX_ATTRIBUTE_VALUE = 140;
  const MAX_ATTRIBUTES = 16;

  const normalizedText = (value: string | null | undefined, limit: number): string =>
    (value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);

  const cssEscape = (value: string): string => {
    try {
      if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    } catch {
      // Fall back to a conservative identifier escape below.
    }
    return value.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  };

  const selectorForElement = (element: Element): string => {
    if (element.id) return `#${cssEscape(element.id)}`;

    const parts: string[] = [];
    let current: Element | null = element;
    while (current && parts.length < 4) {
      const tag = current.tagName.toLowerCase();
      const role = current.getAttribute('role')?.trim().split(/\s+/)[0];
      let part = tag;
      if (role) part += `[role="${role.replace(/"/g, '\\"')}"]`;
      if (current.parentElement) {
        const siblings = [...current.parentElement.children].filter((candidate) => candidate.tagName === current!.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      if (role || ['main', 'nav', 'form', 'header', 'footer', 'aside'].includes(tag)) break;
      current = current.parentElement;
    }
    return parts.join(' > ');
  };

  const roleFor = (element: Element): string | undefined => {
    const explicit = normalizedText(element.getAttribute('role'), 80).split(/\s+/)[0];
    if (explicit) return explicit;
    const tag = element.tagName.toLowerCase();
    const nativeRoles: Record<string, string> = {
      a: element.hasAttribute('href') ? 'link' : '',
      button: 'button',
      nav: 'navigation',
      main: 'main',
      aside: 'complementary',
      header: 'banner',
      footer: 'contentinfo',
      form: 'form',
      ul: 'list',
      ol: 'list',
      li: 'listitem',
      table: 'table',
      tr: 'row',
      td: 'cell',
      th: 'columnheader',
      img: 'img',
      textarea: 'textbox',
      select: element instanceof HTMLSelectElement && (element.multiple || element.size > 1) ? 'listbox' : 'combobox',
    };
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (element instanceof HTMLInputElement) {
      const type = element.type.toLowerCase();
      if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'range') return 'slider';
      if (type === 'number') return 'spinbutton';
      if (type === 'search') return 'searchbox';
      if (type !== 'hidden') return 'textbox';
    }
    return nativeRoles[tag] || undefined;
  };

  const readableLabel = (element: Element): string | undefined => {
    const ariaLabel = normalizedText(element.getAttribute('aria-label'), MAX_LABEL);
    if (ariaLabel) return ariaLabel;

    const labelledBy = element.getAttribute('aria-labelledby')?.trim();
    if (labelledBy) {
      const label = normalizedText(
        labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .filter(Boolean)
          .join(' '),
        MAX_LABEL,
      );
      if (label) return label;
    }

    const alt = normalizedText(element.getAttribute('alt'), MAX_LABEL);
    if (alt) return alt;
    const title = normalizedText(element.getAttribute('title'), MAX_LABEL);
    if (title) return title;

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
      const value = normalizedText(element.value, MAX_LABEL);
      if (value) return value;
    }

    const text = normalizedText(element.textContent, MAX_LABEL);
    return text || undefined;
  };

  const describe = (element: Element, knownSelector?: string): ScanTargetInspectionNode => {
    const node: ScanTargetInspectionNode = {
      tag: element.tagName.toLowerCase(),
      selector: knownSelector || selectorForElement(element),
    };
    const role = roleFor(element);
    if (role) node.role = role;
    if (element.id) node.id = normalizedText(element.id, 120);
    const className = normalizedText(element.getAttribute('class'), MAX_CLASS);
    if (className) node.className = className;
    const label = readableLabel(element);
    if (label) node.label = label;
    return node;
  };

  const contextRoles = new Set([
    'alertdialog', 'banner', 'complementary', 'contentinfo', 'dialog', 'form', 'grid',
    'group', 'list', 'listbox', 'main', 'menu', 'menubar', 'navigation', 'radiogroup',
    'region', 'rowgroup', 'tablist', 'table', 'tree', 'treegrid',
  ]);

  const semanticContextFor = (target: Element): Element | undefined => {
    if (target.id) {
      for (const owner of document.querySelectorAll('[aria-owns]')) {
        const ownedIds = owner.getAttribute('aria-owns')?.trim().split(/\s+/).filter(Boolean) ?? [];
        if (ownedIds.includes(target.id) && contextRoles.has(roleFor(owner) ?? '')) return owner;
      }
    }

    let current = target.parentElement;
    while (current) {
      if (contextRoles.has(roleFor(current) ?? '')) return current;
      current = current.parentElement;
    }
    return undefined;
  };

  const escapeHtml = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const openingTag = (element: Element): string => {
    const allowed = new Set(['id', 'class', 'role', 'href', 'for', 'tabindex', 'type', 'name', 'title', 'alt']);
    const attributes = element.getAttributeNames()
      .filter((name) => allowed.has(name.toLowerCase()) || name.toLowerCase().startsWith('aria-'))
      .slice(0, MAX_ATTRIBUTES)
      .map((name) => {
        const value = normalizedText(element.getAttribute(name), MAX_ATTRIBUTE_VALUE);
        return value ? `${name}="${escapeHtml(value)}"` : name;
      });
    return `<${element.tagName.toLowerCase()}${attributes.length ? ` ${attributes.join(' ')}` : ''}>`;
  };

  const closingTag = (element: Element): string => `</${element.tagName.toLowerCase()}>`;
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const elementSnippet = (element: Element, indent = ''): string[] => {
    const open = `${indent}${openingTag(element)}`;
    if (voidTags.has(element.tagName.toLowerCase())) return [open];
    return [open, `${indent}  …`, `${indent}${closingTag(element)}`];
  };

  let target: Element | null = null;
  try {
    target = document.querySelector(selector);
  } catch {
    return { found: false, selector };
  }
  if (!target) return { found: false, selector };

  const context = semanticContextFor(target);
  let htmlLines: string[];
  if (context && context.contains(target)) {
    htmlLines = [openingTag(context), '  …', ...elementSnippet(target, '  '), '  …', closingTag(context)];
  } else if (context) {
    htmlLines = [...elementSnippet(context), '…', ...elementSnippet(target)];
  } else {
    htmlLines = elementSnippet(target);
  }

  return {
    found: true,
    selector,
    target: describe(target, selector),
    ...(context ? { context: describe(context) } : {}),
    html: htmlLines.join('\n'),
  };
}
