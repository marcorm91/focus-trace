import languageRegistryJson from '../../generated/language-subtags.json';
import { scopedElements } from './scan-elements';

export interface LanguagePartEvaluation {
  element: Element;
  value: string;
  primary: string;
  outcome: 'pass' | 'fail';
}

const knownPrimaryLanguageSubtags = new Set(languageRegistryJson.subtags as string[]);
const CODE_LIKE_TAGS = new Set(['CODE', 'PRE', 'SAMP', 'KBD', 'VAR']);
const NON_HUMAN_TEXT_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);

function isHtmlElement(element: Element): boolean {
  return element.namespaceURI === 'http://www.w3.org/1999/xhtml';
}

function primaryLanguage(value: string): string {
  return value.trim().split('-')[0]?.toLowerCase() ?? '';
}

function hasKnownPrimaryLanguage(value: string): boolean {
  const primary = primaryLanguage(value);
  return /^[a-z0-9]+$/i.test(primary) && knownPrimaryLanguageSubtags.has(primary);
}

function hiddenFromRenderedText(element: Element): boolean {
  if (element.hasAttribute('hidden')) return true;
  try {
    const style = getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse';
  } catch {
    return false;
  }
}

function hasHiddenRenderedAncestor(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (hiddenFromRenderedText(current)) return true;
    if (current === document.body) break;
    current = current.parentElement;
  }
  return false;
}

function textNodeIsRendered(node: Node, boundary: Element): boolean {
  let current = node.parentElement;
  while (current) {
    if (hiddenFromRenderedText(current)) return false;
    if (current === boundary) break;
    current = current.parentElement;
  }
  return true;
}

function hasHumanTextInheritingLanguage(element: Element): boolean {
  if (NON_HUMAN_TEXT_TAGS.has(element.tagName)) return false;
  if (CODE_LIKE_TAGS.has(element.tagName) || element.closest('code, pre, samp, kbd, var')) return false;
  if (hasHiddenRenderedAncestor(element)) return false;

  const visit = (node: Node): boolean => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (child.textContent?.trim() && textNodeIsRendered(child, element)) return true;
        continue;
      }

      if (!(child instanceof Element)) continue;
      if (NON_HUMAN_TEXT_TAGS.has(child.tagName) || CODE_LIKE_TAGS.has(child.tagName)) continue;
      if (child.hasAttribute('lang')) continue;
      if (visit(child)) return true;
    }
    return false;
  };

  return visit(element);
}

function candidates(root: Document | Element): Element[] {
  return scopedElements(root, '[lang]');
}

export function evaluateLanguageParts(root: Document | Element = document): LanguagePartEvaluation[] {
  const body = document.body;
  if (!body || document.contentType.toLowerCase() !== 'text/html') return [];

  const evaluations: LanguagePartEvaluation[] = [];
  for (const element of candidates(root)) {
    if (!isHtmlElement(element) || element === document.documentElement || !body.contains(element)) continue;
    const value = element.getAttribute('lang');
    if (value == null || value === '') continue;
    if (!hasHumanTextInheritingLanguage(element)) continue;

    evaluations.push({
      element,
      value,
      primary: primaryLanguage(value),
      outcome: hasKnownPrimaryLanguage(value) ? 'pass' : 'fail',
    });
  }
  return evaluations;
}
