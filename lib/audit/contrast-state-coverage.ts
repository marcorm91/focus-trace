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
  'border',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline',
  'outline-color',
  'box-shadow',
  'fill',
  'stroke',
  'opacity',
  'filter',
]);

const PSEUDO_ELEMENTS = /::(?:before|after)\b/gi;
const CONTRAST_CUSTOM_PROPERTY = /(?:color|colour|bg|background|border|outline|shadow|fill|stroke|opacity|contrast)/i;

interface StatePattern {
  state: ContrastStateName;
  test: RegExp;
  replace: RegExp;
  replacement: string;
}

const STATE_PATTERNS: StatePattern[] = [
  { state: 'focus-visible', test: /:focus-visible\b/i, replace: /:focus-visible\b/gi, replacement: '' },
  { state: 'focus', test: /:focus\b/i, replace: /:focus\b/gi, replacement: '' },
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

function ruleProperties(style: CSSStyleDeclaration): string[] {
  const properties: string[] = [];
  for (let index = 0; index < style.length; index += 1) {
    const property = style.item(index).toLowerCase();
    if (property) properties.push(property);
  }
  return properties;
}

function propertyIsContrastRelevant(property: string): boolean {
  return TEXT_PROPERTIES.has(property)
    || NON_TEXT_PROPERTIES.has(property)
    || property.startsWith('border-')
    || property.startsWith('outline-')
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
  if (element.closest('[aria-disabled="true" i]')) return true;
  try {
    return element.matches(':disabled') || Boolean(element.closest(':disabled'));
  } catch {
    return false;
  }
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
  const signals: ContrastStateSignal[] = [];
  const seen = new Set<string>();
  const elementIds = new WeakMap<Element, number>();
  let nextElementId = 1;
  const elementId = (element: Element) => {
    const existing = elementIds.get(element);
    if (existing != null) return existing;
    const value = nextElementId++;
    elementIds.set(element, value);
    return value;
  };

  for (const rule of authorStyleRules()) {
    const properties = ruleProperties(rule.style);
    if (!properties.some(propertyIsContrastRelevant)) continue;

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

      for (const element of elements) {
        // Coverage is element-specific: one hovered/focused component must not
        // hide the same unobserved authored state on its siblings.
        if (elementMatchesObservedSelector(element, selector)) continue;
        if (isInactiveContrastElement(element)) continue;
        const kind = stateKind(element, properties);
        if (!kind) continue;
        for (const pattern of patterns) {
          const key = `${kind}|${pattern.state}|${selector}|${candidate}|${elementId(element)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          signals.push({
            element,
            state: pattern.state,
            kind,
            selector,
            properties: [...new Set(properties)].sort(),
          });
        }
      }
    }
  }

  return signals;
}
