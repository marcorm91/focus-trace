import {
  JAVASCRIPT_MIME_TYPE_ESSENCES,
  OBSOLETE_ATTRIBUTES,
  OBSOLETE_ELEMENTS,
  type ObsoleteAttributeDefinition,
} from '../../shared/obsolete-html-registry';

type ScanRoot = Document | Element;

export type ObsoleteHtmlSignalKind = 'obsolete-element' | 'obsolete-attribute' | 'obsolete-but-conforming';

export interface ObsoleteHtmlSignal {
  element: Element;
  kind: ObsoleteHtmlSignalKind;
  feature: string;
  replacement: string;
  detail: string;
}

const elementDefinitions = new Map(OBSOLETE_ELEMENTS.map((definition) => [definition.tag, definition]));
const attributeDefinitions = new Map<string, ObsoleteAttributeDefinition[]>();
for (const definition of OBSOLETE_ATTRIBUTES) {
  const existing = attributeDefinitions.get(definition.attribute);
  if (existing) existing.push(definition);
  else attributeDefinitions.set(definition.attribute, [definition]);
}

function scopedElements(root: ScanRoot): Element[] {
  const descendants = [...root.querySelectorAll('*')];
  return root instanceof Element ? [root, ...descendants] : descendants;
}

function appliesToElement(definition: ObsoleteAttributeDefinition, tag: string): boolean {
  return definition.elements === '*' || definition.elements.includes(tag);
}

function javascriptMimeEssence(value: string): string {
  return value.split(';', 1)[0]!.trim().toLowerCase();
}

function isJavaScriptMimeTypeEssence(value: string): boolean {
  return JAVASCRIPT_MIME_TYPE_ESSENCES.has(javascriptMimeEssence(value));
}

function anchorNameIsObsoleteButConforming(anchor: HTMLAnchorElement): boolean {
  const name = anchor.getAttribute('name');
  if (!name) return false;
  if (anchor.id && anchor.id !== name) return false;

  const root = anchor.getRootNode();
  if (!(root instanceof Document || root instanceof ShadowRoot || root instanceof DocumentFragment)) return false;

  for (const element of root.querySelectorAll('[id]')) {
    if (element !== anchor && element.id === name) return false;
  }
  for (const element of root.querySelectorAll('a[name]')) {
    if (element !== anchor && element.getAttribute('name') === name) return false;
  }
  return true;
}

function obsoleteButConformingSignal(element: Element, attribute: Attr): ObsoleteHtmlSignal | undefined {
  const tag = element.tagName.toLowerCase();
  const name = attribute.name.toLowerCase();
  const value = attribute.value;

  if (tag === 'img' && name === 'border' && value === '0') {
    return {
      element,
      kind: 'obsolete-but-conforming',
      feature: 'border on <img>',
      replacement: 'Remove border="0" and use CSS when border styling is needed.',
      detail: 'img[border="0"] is obsolete but conforming and must trigger a conformance-checker warning.',
    };
  }

  if (tag === 'script' && name === 'charset' && value.trim().toLowerCase() === 'utf-8') {
    return {
      element,
      kind: 'obsolete-but-conforming',
      feature: 'charset on <script>',
      replacement: 'Remove charset; conforming HTML documents and scripts use UTF-8.',
      detail: 'script[charset="utf-8"] is obsolete but conforming.',
    };
  }

  if (tag === 'script' && name === 'language') {
    const type = element.getAttribute('type');
    const validType = type == null || type.trim().toLowerCase() === 'text/javascript';
    if (value.trim().toLowerCase() === 'javascript' && validType) {
      return {
        element,
        kind: 'obsolete-but-conforming',
        feature: 'language on <script>',
        replacement: 'Remove language="JavaScript"; JavaScript is the default scripting language.',
        detail: 'script[language="JavaScript"] is obsolete but conforming only with no type or type="text/javascript".',
      };
    }
  }

  if (tag === 'script' && name === 'type') {
    if (value.trim() === '' || isJavaScriptMimeTypeEssence(value)) {
      return {
        element,
        kind: 'obsolete-but-conforming',
        feature: 'JavaScript type on <script>',
        replacement: 'Omit type for JavaScript modules/classic scripts where the HTML syntax allows it.',
        detail: `script[type=${JSON.stringify(value)}] uses an obsolete-but-conforming JavaScript MIME declaration.`,
      };
    }
    return undefined;
  }

  if (tag === 'style' && name === 'type' && value.trim().toLowerCase() === 'text/css') {
    return {
      element,
      kind: 'obsolete-but-conforming',
      feature: 'type on <style>',
      replacement: 'Remove type="text/css"; CSS is the default style language.',
      detail: 'style[type="text/css"] is obsolete but conforming.',
    };
  }

  if (tag === 'a' && name === 'name' && element instanceof HTMLAnchorElement && anchorNameIsObsoleteButConforming(element)) {
    return {
      element,
      kind: 'obsolete-but-conforming',
      feature: 'name on <a>',
      replacement: 'Use id instead of the legacy anchor name attribute.',
      detail: `a[name=${JSON.stringify(value)}] is obsolete but conforming under the legacy fragment-target constraints.`,
    };
  }

  if (
    tag === 'input'
    && element instanceof HTMLInputElement
    && element.type.toLowerCase() === 'number'
    && (name === 'maxlength' || name === 'size')
  ) {
    return {
      element,
      kind: 'obsolete-but-conforming',
      feature: `${name} on <input type="number">`,
      replacement: `Remove ${name} from number inputs unless legacy-user-agent support is intentionally required.`,
      detail: `${name} on input[type="number"] is obsolete but conforming for legacy compatibility.`,
    };
  }

  return undefined;
}

function conditionalNonConformingSignal(element: Element, attribute: Attr): ObsoleteHtmlSignal | undefined {
  const tag = element.tagName.toLowerCase();
  const name = attribute.name.toLowerCase();

  if (tag === 'img' && name === 'border') {
    return {
      element,
      kind: 'obsolete-attribute',
      feature: 'border on <img>',
      replacement: 'Remove the border attribute and use CSS.',
      detail: `img[border=${JSON.stringify(attribute.value)}] is obsolete and non-conforming; only border="0" is retained as obsolete-but-conforming.`,
    };
  }

  if (tag === 'script' && name === 'charset') {
    return {
      element,
      kind: 'obsolete-attribute',
      feature: 'charset on <script>',
      replacement: 'Remove charset; HTML documents and scripts are required to use UTF-8.',
      detail: `script[charset=${JSON.stringify(attribute.value)}] is obsolete and non-conforming; only UTF-8 is retained as obsolete-but-conforming.`,
    };
  }

  if (tag === 'script' && name === 'language') {
    return {
      element,
      kind: 'obsolete-attribute',
      feature: 'language on <script>',
      replacement: 'Remove language; use type only for non-JavaScript data blocks where appropriate.',
      detail: `script[language=${JSON.stringify(attribute.value)}] is obsolete and non-conforming for this value/type combination.`,
    };
  }

  if (tag === 'style' && name === 'type') {
    return {
      element,
      kind: 'obsolete-attribute',
      feature: 'type on <style>',
      replacement: 'Remove type for CSS; use <script> for non-CSS data blocks.',
      detail: `style[type=${JSON.stringify(attribute.value)}] is obsolete and non-conforming; only text/css is retained as obsolete-but-conforming.`,
    };
  }

  if (tag === 'a' && name === 'name') {
    return {
      element,
      kind: 'obsolete-attribute',
      feature: 'name on <a>',
      replacement: 'Use id instead.',
      detail: `a[name=${JSON.stringify(attribute.value)}] does not satisfy the obsolete-but-conforming legacy-anchor constraints and is non-conforming.`,
    };
  }

  return undefined;
}

function genericObsoleteAttributeSignal(element: Element, attribute: Attr): ObsoleteHtmlSignal | undefined {
  const tag = element.tagName.toLowerCase();
  const definitions = attributeDefinitions.get(attribute.name.toLowerCase());
  const definition = definitions?.find((candidate) => appliesToElement(candidate, tag));
  if (!definition) return undefined;

  return {
    element,
    kind: 'obsolete-attribute',
    feature: `${definition.attribute} on <${tag}>`,
    replacement: definition.replacement,
    detail: `${definition.attribute} on <${tag}> is obsolete and must not be used by authors.`,
  };
}

export function evaluateObsoleteHtml(root: ScanRoot): ObsoleteHtmlSignal[] {
  const signals: ObsoleteHtmlSignal[] = [];

  for (const element of scopedElements(root)) {
    const tag = element.tagName.toLowerCase();
    const elementDefinition = elementDefinitions.get(tag);
    if (elementDefinition) {
      signals.push({
        element,
        kind: 'obsolete-element',
        feature: `<${tag}>`,
        replacement: elementDefinition.replacement,
        detail: `<${tag}> is entirely obsolete and must not be used by authors.`,
      });
    }

    for (const attribute of element.attributes) {
      const conforming = obsoleteButConformingSignal(element, attribute);
      if (conforming) {
        signals.push(conforming);
        continue;
      }

      const conditional = conditionalNonConformingSignal(element, attribute);
      if (conditional) {
        signals.push(conditional);
        continue;
      }

      const generic = genericObsoleteAttributeSignal(element, attribute);
      if (generic) signals.push(generic);
    }
  }

  return signals;
}
