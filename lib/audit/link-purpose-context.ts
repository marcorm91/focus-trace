import type {
  LinkPurposeContextEvidence,
  LinkPurposeContextSnippet,
  LinkPurposeContextSource,
} from '../../shared/types';
import { accessibleName, isProgrammaticallyHidden, selectorFor, semanticRole } from './dom';
import { scopedElements, type ScanRoot } from './scan-elements';

const MAX_LINKS = 2_000;
const MAX_REVIEWS = 50;
const MAX_CONTEXTS = 8;
const MAX_CONTEXT_TEXT = 240;
const MAX_CONTEXT_NODES = 500;

const AMBIGUOUS_LINK_PHRASES = new Set([
  'aqui',
  'click here',
  'clic aqui',
  'click',
  'details',
  'detalles',
  'here',
  'learn more',
  'leer mas',
  'mas',
  'mas detalles',
  'mas informacion',
  'more',
  'more details',
  'more info',
  'read more',
  'saber mas',
  'see more',
  'ver',
  'ver mas',
  'view',
]);

const BLOCK_CONTAINER_SELECTOR = [
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'div',
  'dl',
  'fieldset',
  'figure',
  'footer',
  'form',
  'header',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'main',
  'nav',
  'section',
].join(',');

export interface LinkPurposeContextEvaluation {
  status: 'review';
  element: Element;
  detail: string;
  evidence: LinkPurposeContextEvidence;
}

function normalizedText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= MAX_CONTEXT_TEXT
    ? compact
    : `${compact.slice(0, MAX_CONTEXT_TEXT - 1).trimEnd()}…`;
}

function elementText(root: Element, includeHidden: boolean): string {
  const pieces: string[] = [];
  let visited = 0;
  const visit = (node: Node): void => {
    if (visited >= MAX_CONTEXT_NODES) return;
    visited += 1;
    if (node.nodeType === Node.TEXT_NODE) {
      pieces.push(node.textContent ?? '');
      return;
    }
    if (!(node instanceof Element)) return;
    if (!includeHidden && node !== root && isProgrammaticallyHidden(node)) return;
    if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(node.tagName)) return;
    for (const child of node.childNodes) visit(child);
  };
  visit(root);
  return compactText(pieces.join(' '));
}

function resolvedDescriptionElements(element: Element): Element[] {
  return (element.getAttribute('aria-describedby') ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id))
    .filter((candidate): candidate is HTMLElement => candidate != null);
}

function semanticListItem(element: Element | null): Element | null {
  let current = element;
  while (current) {
    if (current.tagName === 'LI' || semanticRole(current) === 'listitem') return current;
    current = current.parentElement;
  }
  return null;
}

function semanticCell(element: Element): Element | null {
  let current: Element | null = element;
  while (current) {
    const role = semanticRole(current);
    if (current.tagName === 'TD' || current.tagName === 'TH' || role === 'cell' || role === 'gridcell') {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function tableHeaders(cell: Element): Element[] {
  const headers: Element[] = [];
  const seen = new Set<Element>();
  const append = (candidate: Element | null | undefined): void => {
    if (!candidate || candidate === cell || seen.has(candidate) || isProgrammaticallyHidden(candidate)) return;
    if (candidate.tagName !== 'TH' && semanticRole(candidate) !== 'columnheader' && semanticRole(candidate) !== 'rowheader') return;
    seen.add(candidate);
    headers.push(candidate);
  };

  for (const id of (cell.getAttribute('headers') ?? '').trim().split(/\s+/).filter(Boolean)) {
    append(document.getElementById(id));
  }

  if (!(cell instanceof HTMLTableCellElement)) return headers;
  const row = cell.parentElement;
  const table = cell.closest('table');
  if (!row || !table) return headers;

  for (const sibling of [...row.children].slice(0, cell.cellIndex)) {
    if (sibling.getAttribute('scope') === 'row' || sibling.getAttribute('scope') === 'rowgroup') append(sibling);
  }
  for (const earlierRow of [...table.rows].slice(0, row instanceof HTMLTableRowElement ? row.rowIndex : 0)) {
    const candidate = earlierRow.cells[cell.cellIndex];
    if (candidate?.getAttribute('scope') === 'col' || candidate?.getAttribute('scope') === 'colgroup') append(candidate);
  }
  return headers;
}

function closestBlockContainer(element: Element): Element | null {
  let current = element.parentElement;
  while (current) {
    const display = getComputedStyle(current).display;
    if (
      current.matches(BLOCK_CONTAINER_SELECTOR)
      || display === 'block'
      || display === 'flow-root'
      || display === 'list-item'
      || display === 'table-cell'
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function containingSentence(text: string, linkName: string): string | undefined {
  if (!text) return undefined;
  const normalizedName = normalizedText(linkName);
  const sentence = text
    .split(/(?<=[.!?。！？])\s+/u)
    .find((candidate) => normalizedText(candidate).includes(normalizedName));
  return sentence ? compactText(sentence) : undefined;
}

function contextSnippets(
  root: ScanRoot,
  element: Element,
  linkName: string,
  exposedTextCache: WeakMap<Element, string>,
): LinkPurposeContextSnippet[] {
  const snippets: LinkPurposeContextSnippet[] = [];
  const seen = new Set<string>();
  const exposedText = (context: Element): string => {
    const cached = exposedTextCache.get(context);
    if (cached != null) return cached;
    const text = elementText(context, false);
    exposedTextCache.set(context, text);
    return text;
  };
  const append = (source: LinkPurposeContextSource, context: Element, suppliedText?: string): void => {
    if (!(root instanceof Document) && root !== context && !root.contains(context)) return;
    const text = suppliedText ?? exposedText(context);
    const compact = compactText(text);
    if (!compact || normalizedText(compact) === normalizedText(linkName)) return;
    const snippet: LinkPurposeContextSnippet = { source, selector: selectorFor(context), text: compact };
    const key = `${source}|${snippet.selector}|${normalizedText(compact)}`;
    if (seen.has(key) || snippets.length >= MAX_CONTEXTS) return;
    seen.add(key);
    snippets.push(snippet);
  };

  for (const description of resolvedDescriptionElements(element)) {
    append('aria-describedby', description, elementText(description, true));
  }

  const paragraph = element.closest('p');
  const listItem = semanticListItem(element.parentElement);
  const cell = semanticCell(element);
  const block = closestBlockContainer(element);
  const sentenceContainer = paragraph ?? listItem ?? cell ?? block;
  if (sentenceContainer) {
    const sentence = containingSentence(exposedText(sentenceContainer), linkName);
    if (sentence) append('sentence', sentenceContainer, sentence);
  }

  if (paragraph) append('paragraph', paragraph);
  if (listItem) {
    append('list-item', listItem);
    const parentListItem = semanticListItem(listItem.parentElement?.parentElement ?? null);
    if (parentListItem) append('parent-list-item', parentListItem);
  }
  if (cell) {
    append('table-cell', cell);
    for (const header of tableHeaders(cell)) append('table-header', header);
  }
  if (block && block !== paragraph && block !== listItem && block !== cell) append('block-container', block);
  return snippets;
}

export function evaluateLinkPurposeContext(root: ScanRoot = document): LinkPurposeContextEvaluation[] {
  const evaluations: LinkPurposeContextEvaluation[] = [];
  const exposedTextCache = new WeakMap<Element, string>();
  const candidates = scopedElements(root, 'a, area, [role]').slice(0, MAX_LINKS);
  for (const element of candidates) {
    if (evaluations.length >= MAX_REVIEWS) break;
    if (semanticRole(element) !== 'link' || element.closest('[inert]') || isProgrammaticallyHidden(element)) continue;
    const name = accessibleName(element).replace(/\s+/g, ' ').trim();
    const matchedPhrase = normalizedText(name);
    if (!name || !AMBIGUOUS_LINK_PHRASES.has(matchedPhrase)) continue;

    const contexts = contextSnippets(root, element, name, exposedTextCache);
    const sources = [...new Set(contexts.map((context) => context.source))];
    const detail = contexts.length
      ? `Accessible name ${JSON.stringify(name)} matches the generic phrase ${JSON.stringify(matchedPhrase)}. Programmatic context candidates observed: ${sources.join(', ')}.`
      : `Accessible name ${JSON.stringify(name)} matches the generic phrase ${JSON.stringify(matchedPhrase)}. No additional programmatic context was observed in the inspected sentence, paragraph, list item, table cell or aria-describedby relationship.`;
    evaluations.push({
      status: 'review',
      element,
      detail,
      evidence: {
        kind: 'ambiguous-link-purpose',
        accessibleName: name.slice(0, 240),
        matchedPhrase,
        contexts,
        contextTextObserved: contexts.length > 0,
      },
    });
  }
  return evaluations;
}
