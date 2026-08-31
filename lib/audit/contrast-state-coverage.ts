import { parseCssColor } from './contrast';
import { isDisabledUiComponent } from './dom';

export type ContrastStateName =
  | 'hover'
  | 'active'
  | 'focus'
  | 'focus-visible'
  | 'visited'
  | 'checked'
  | 'unchecked'
  | 'expanded'
  | 'collapsed'
  | 'selected'
  | 'unselected'
  | 'pressed'
  | 'unpressed';

export type ContrastStateKind = 'text' | 'non-text';

export interface ContrastStateSignal {
  element: Element;
  state: ContrastStateName;
  kind: ContrastStateKind;
  selector: string;
  properties: string[];
  candidateCount: number;
}

const TEXT_PROPERTIES = new Set([
  'color',
  'background',
  'background-color',
  'background-image',
  'opacity',
  'filter',
  'text-shadow',
  'font-size',
  'font-weight',
]);

const NON_TEXT_PROPERTIES = new Set([
  'background',
  'background-color',
  'background-image',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'box-shadow',
  'fill',
  'stroke',
  'opacity',
  'filter',
]);

const PSEUDO_ELEMENTS = /::(?:before|after)\b/gi;
const CONTRAST_CUSTOM_PROPERTY = /(?:color|colour|bg|background|border|outline|shadow|fill|stroke|opacity|contrast)/i;
const NON_TEXT_COLOR_PROPERTY = /^(?:border(?:-(?:top|right|bottom|left))?-color|outline-color|fill|stroke)$/;
const NON_TEXT_SHORTHAND = /^(?:border(?:-(?:top|right|bottom|left))?|outline)$/;

interface StatePattern {
  state: ContrastStateName;
  test: RegExp;
  replace: RegExp;
  replacement: string;
}

const STATE_PATTERNS: StatePattern[] = [
  { state: 'focus-visible', test: /:focus-visible\b/i, replace: /:focus-visible\b/gi, replacement: '' },
  { state: 'focus', test: /:focus(?!-visible)\b/i, replace: /:focus(?!-visible)\b/gi, replacement: '' },
  { state: 'hover', test: /:hover\b/i, replace: /:hover\b/gi, replacement: '' },
  { state: 'active', test: /:active\b/i, replace: /:active\b/gi, replacement: '' },
  { state: 'visited', test: /:visited\b/i, replace: /:visited\b/gi, replacement: '' },
  { state: 'unchecked', test: /:not\(\s*:checked\s*\)/i, replace: /:not\(\s*:checked\s*\)/gi, replacement: '' },
  { state: 'checked', test: /:checked\b/i, replace: /:checked\b/gi, replacement: '' },
  { state: 'collapsed', test: /\[aria-expanded\s*=\s*(["'])?false\1\s*\]/i, replace: /\[aria-expanded\s*=\s*(["'])?false\1\s*\]/gi, replacement: '[aria-expanded]' },
  { state: 'expanded', test: /\[aria-expanded\s*=\s*(["'])?true\1\s*\]/i, replace: /\[aria-expanded\s*=\s*(["'])?true\1\s*\]/gi, replacement: '[aria-expanded]' },
  { state: 'unselected', test: /\[aria-selected\s*=\s*(["'])?false\1\s*\]/i, replace: /\[aria-selected\s*=\s*(["'])?false\1\s*\]/gi, replacement: '[aria-selected]' },
  { state: 'selected', test: /\[aria-selected\s*=\s*(["'])?true\1\s*\]/i, replace: /\[aria-selected\s*=\s*(["'])?true\1\s*\]/gi, replacement: '[aria-selected]' },
  { state: 'unpressed', test: /\[aria-pressed\s*=\s*(["'])?false\1\s*\]/i, replace: /\[aria-pressed\s*=\s*(["'])?false\1\s*\]/gi, replacement: '[aria-pressed]' },
  { state: 'pressed', test: /\[aria-pressed\s*=\s*(["'])?true\1\s*\]/i, replace: /\[aria-pressed\s*=\s*(["'])?true\1\s*\]/gi, replacement: '[aria-pressed]' },
  { state: 'unchecked', test: /\[aria-checked\s*=\s*(["'])?false\1\s*\]/i, replace: /\[aria-checked\s*=\s*(["'])?false\1\s*\]/gi, replacement: '[aria-checked]' },
  { state: 'checked', test: /\[aria-checked\s*=\s*(["'])?true\1\s*\]/i, replace: /\[aria-checked\s*=\s*(["'])?true\1\s*\]/gi, replacement: '[aria-checked]' },
];

function splitSelectorList(selectorText: string): string[] {
  const selectors: string[] = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote = '';
  for (let index = 0; index < selectorText.length; index += 1) {
    const character = selectorText[index]!;
    if (quote) {
      if (character === quote && selectorText[index - 1] !== '\\') quote = '';
      continue;
    }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === '(') parentheses += 1;
    else if (character === ')') parentheses = Math.max(0, parentheses - 1);
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets = Math.max(0, brackets - 1);
    else if (character === ',' && parentheses === 0 && brackets === 0) {
      const selector = selectorText.slice(start, index).trim();
      if (selector) selectors.push(selector);
      start = index + 1;
    }
  }
  const last = selectorText.slice(start).trim();
  if (last) selectors.push(last);
  return selectors;
}

function ruleProperties(rule: CSSStyleRule): string[] {
  const properties = new Set<string>();
  for (let index = 0; index < rule.style.length; index += 1) {
    const property = rule.style.item(index).toLowerCase();
    if (property) properties.add(property);
  }
  for (const source of [rule.style.cssText, rule.cssText]) {
    for (const match of source.matchAll(/(--[\w-]+)\s*:/g)) {
      if (match[1]) properties.add(match[1].toLowerCase());
    }
  }
  return [...properties];
}

function transparentPaint(value: string): boolean {
  const parsed = parseCssColor(value);
  return parsed?.a === 0;
}

function shorthandPaintsVisibleCue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'none' || normalized === '0' || normalized === '0px') return false;
  if (/(?:^|\s)none(?:\s|$)/.test(normalized)) return false;
  if (/(?:^|\s)0(?:px|rem|em)?(?:\s|$)/.test(normalized)) return false;
  const colorTokens = normalized.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)|#[0-9a-f]{3,8}|transparent/gi) ?? [];
  return !colorTokens.length || colorTokens.some((token) => !transparentPaint(token));
}

function propertyIsContrastRelevant(rule: CSSStyleRule, property: string): boolean {
  const value = rule.style.getPropertyValue(property).trim();
  if (NON_TEXT_COLOR_PROPERTY.test(property) && transparentPaint(value)) return false;
  if (NON_TEXT_SHORTHAND.test(property)) return shorthandPaintsVisibleCue(value);
  return TEXT_PROPERTIES.has(property)
    || NON_TEXT_PROPERTIES.has(property)
    || (property.startsWith('--') && CONTRAST_CUSTOM_PROPERTY.test(property));
}

function nestedStyleRules(rules: CSSRuleList): CSSStyleRule[] {
  const result: CSSStyleRule[] = [];
  for (const rule of Array.from(rules)) {
    if ('selectorText' in rule && 'style' in rule) {
      result.push(rule as CSSStyleRule);
      continue;
    }
    if ('cssRules' in rule) {
      try {
        result.push(...nestedStyleRules((rule as CSSGroupingRule).cssRules));
      } catch {
        // Nested rule is not readable in this browser context.
      }
    }
  }
  return result;
}

function authorStyleRules(): CSSStyleRule[] {
  const result: CSSStyleRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      result.push(...nestedStyleRules(sheet.cssRules));
    } catch {
      // Cross-origin stylesheets cannot be inspected through CSSOM. Do not
      // claim state coverage for rules FocusTrace cannot read.
    }
  }
  return result;
}

function statePatternsForSelector(selector: string): StatePattern[] {
  return STATE_PATTERNS.filter((pattern) => pattern.test.test(selector));
}

function candidateSelector(selector: string, patterns: StatePattern[]): string | undefined {
  let candidate = selector.replace(PSEUDO_ELEMENTS, '');
  // State selectors inside functional pseudos cannot be safely reconstructed
  // as exact static selectors. Removing the functional condition deliberately
  // broadens candidate discovery without pretending to simulate the state.
  candidate = candidate.replace(/:(?:is|where|has)\([^)]*(?::hover|:active|:visited|:focus(?:-visible)?|:checked|aria-(?:expanded|selected|pressed|checked))[^)]*\)/gi, '');
  for (const pattern of patterns) candidate = candidate.replace(pattern.replace, pattern.replacement);
  candidate = candidate.trim();
  if (!candidate || candidate.includes('&')) return undefined;
  try {
    document.querySelector(candidate);
    return candidate;
  } catch {
    return undefined;
  }
}

function inScope(root: Document | Element, element: Element): boolean {
  return root instanceof Document || root === element || root.contains(element);
}

export function isInactiveContrastElement(element: Element): boolean {
  return isDisabledUiComponent(element);
}

function hasRenderedTextCandidate(element: Element): boolean {
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    return ['submit', 'reset'].includes(type)
      || Boolean(element.value.trim())
      || Boolean(element.placeholder.trim());
  }
  if (element instanceof HTMLTextAreaElement) return Boolean(element.value.trim() || element.placeholder.trim());
  if (element instanceof HTMLSelectElement) return element.selectedOptions.length > 0;
  return Boolean(element.textContent?.replace(/\s+/g, ' ').trim());
}

function stateKind(element: Element, properties: string[]): ContrastStateKind | undefined {
  const textCandidate = hasRenderedTextCandidate(element);
  const hasRelevantCustomProperty = properties.some((property) =>
    property.startsWith('--') && CONTRAST_CUSTOM_PROPERTY.test(property),
  );
  const textRelevant = properties.some((property) => TEXT_PROPERTIES.has(property)) || hasRelevantCustomProperty;
  const nonTextRelevant = properties.some((property) =>
    NON_TEXT_PROPERTIES.has(property)
    || NON_TEXT_SHORTHAND.test(property)
    || property.startsWith('border-')
    || property.startsWith('outline-'),
  ) || hasRelevantCustomProperty;
  if (textCandidate && textRelevant) return 'text';
  if (nonTextRelevant) return 'non-text';
  return undefined;
}

function elementMatchesObservedSelector(element: Element, selector: string): boolean {
  const withoutPseudoElement = selector.replace(PSEUDO_ELEMENTS, '');
  try {
    return element.matches(withoutPseudoElement);
  } catch {
    return false;
  }
}

export function observedContrastStates(element: Element): ContrastStateName[] {
  const states: ContrastStateName[] = [];
  const match = (selector: string) => {
    try { return element.matches(selector); } catch { return false; }
  };
  if (match(':hover')) states.push('hover');
  if (match(':active')) states.push('active');
  if (match(':focus-visible')) states.push('focus-visible');
  else if (match(':focus')) states.push('focus');

  const nativeCheckable = element instanceof HTMLInputElement
    && ['checkbox', 'radio'].includes(element.type.toLowerCase());
  if ((nativeCheckable && element.checked) || element.getAttribute('aria-checked') === 'true') states.push('checked');
  else if ((nativeCheckable && !element.checked) || element.getAttribute('aria-checked') === 'false') states.push('unchecked');

  if (element.getAttribute('aria-expanded') === 'true') states.push('expanded');
  else if (element.getAttribute('aria-expanded') === 'false') states.push('collapsed');
  if (element.getAttribute('aria-selected') === 'true') states.push('selected');
  else if (element.getAttribute('aria-selected') === 'false') states.push('unselected');
  if (element.getAttribute('aria-pressed') === 'true') states.push('pressed');
  else if (element.getAttribute('aria-pressed') === 'false') states.push('unpressed');
  return states;
}

export function evaluateContrastStateCoverage(root: Document | Element = document): ContrastStateSignal[] {
  const signals = new Map<string, ContrastStateSignal>();

  for (const rule of authorStyleRules()) {
    const properties = ruleProperties(rule).filter((property) => propertyIsContrastRelevant(rule, property));
    if (!properties.length) continue;

    for (const selector of splitSelectorList(rule.selectorText)) {
      const patterns = statePatternsForSelector(selector);
      if (!patterns.length) continue;
      const candidate = candidateSelector(selector, patterns);
      if (!candidate) continue;

      let elements: Element[];
      try {
        elements = [...document.querySelectorAll(candidate)].filter((element) => inScope(root, element));
      } catch {
        continue;
      }

      const candidatesByKind = new Map<ContrastStateKind, Element[]>();
      for (const element of elements) {
        if (elementMatchesObservedSelector(element, selector) || isInactiveContrastElement(element)) continue;
        const kind = stateKind(element, properties);
        if (!kind) continue;
        const candidates = candidatesByKind.get(kind) ?? [];
        candidates.push(element);
        candidatesByKind.set(kind, candidates);
      }

      for (const [kind, candidates] of candidatesByKind) {
        const representative = candidates[0];
        if (!representative) continue;
        for (const pattern of patterns) {
          // A CSS selector describes one authored state obligation. Repeating
          // the same manual-review card for every matched node manufactures
          // volume without adding evidence, so keep one representative target
          // and preserve the number of matching candidates in the signal.
          const key = `${kind}|${pattern.state}|${selector}`;
          const existing = signals.get(key);
          if (existing) {
            existing.properties = [...new Set([...existing.properties, ...properties])].sort();
            existing.candidateCount = Math.max(existing.candidateCount, candidates.length);
            continue;
          }
          signals.set(key, {
            element: representative,
            state: pattern.state,
            kind,
            selector,
            properties: [...new Set(properties)].sort(),
            candidateCount: candidates.length,
          });
        }
      }
    }
  }

  return [...signals.values()];
}
