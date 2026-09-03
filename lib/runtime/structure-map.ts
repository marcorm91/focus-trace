export type StructureHintTone = 'review' | 'info';

export type StructureHintElement = {
  tag: string;
  selector: string;
  role?: string;
  id?: string;
  className?: string;
  label?: string;
  tabindex?: string;
  trigger?: string;
};

export type StructureHint = {
  id: string;
  tone: StructureHintTone;
  title: string;
  description: string;
  selector?: string;
  suggestion?: string;
  element?: StructureHintElement;
};

export type StructureMetricId =
  | 'headings'
  | 'landmarks'
  | 'lists'
  | 'forms'
  | 'buttons'
  | 'links'
  | 'form-controls'
  | 'tables'
  | 'images';

export type StructureMetricTarget = {
  id: StructureMetricId;
  count: number;
  selector: string;
};

export type StructureMetrics = {
  totalElements: number;
  semanticElements: number;
  divCount: number;
  genericContainerCount: number;
  genericRatio: number;
  landmarkCount: number;
  interactiveCount: number;
  listCount: number;
  maxDepth: number;
  maxGenericChain: number;
  deepGenericChains: number;
  headingCount: number;
  formCount: number;
  buttonCount: number;
  linkCount: number;
  formControlCount: number;
  tableCount: number;
  imageCount: number;
};

export type StructureSnapshot = {
  url: string;
  title: string;
  capturedAt: number;
  hints: StructureHint[];
  metrics: StructureMetrics;
  metricTargets: StructureMetricTarget[];
  truncated: boolean;
};

export type StructureCollectionOptions = {
  maxElements?: number;
  maxHints?: number;
  maxStructureNodes?: number;
};

/**
 * Collect a small accessibility-oriented Structure snapshot.
 *
 * IMPORTANT: keep this function self-contained. Chromium serializes only the
 * function passed to scripting.executeScript, so page-side helpers must live
 * inside the function body.
 */
export function collectStructureMapInPage(options?: StructureCollectionOptions): StructureSnapshot {
  const MAX_ELEMENTS = Math.max(1, Math.floor(options?.maxElements ?? 10_000));
  const MAX_HINTS = Math.max(1, Math.floor(options?.maxHints ?? 60));
  const MAX_LABEL_LENGTH = 90;

  const semanticTags = new Set([
    'header', 'nav', 'main', 'footer', 'aside', 'section', 'article',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'form', 'fieldset', 'legend',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'figure', 'figcaption', 'details', 'summary', 'dialog',
    'button', 'a', 'input', 'select', 'textarea', 'img',
  ]);
  const landmarkTags = new Set(['header', 'nav', 'main', 'footer', 'aside']);
  const landmarkRoles = new Set([
    'banner', 'navigation', 'main', 'contentinfo', 'complementary',
    'region', 'search', 'form',
  ]);
  const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const genericTags = new Set(['div', 'span']);
  const hints: StructureHint[] = [];
  const depthByElement = new WeakMap<Element, number>();
  let hintSequence = 0;
  let truncated = false;

  const clip = (value: string | null | undefined, max = MAX_LABEL_LENGTH): string | undefined => {
    const normalized = value?.replace(/\s+/g, ' ').trim();
    if (!normalized) return undefined;
    return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
  };

  const cssEscape = (value: string): string => {
    if (globalThis.CSS?.escape) return globalThis.CSS.escape(value);
    return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
  };

  const selectorFor = (element: Element): string => {
    if (element.id) return `#${cssEscape(element.id)}`;

    const parts: string[] = [];
    let current: Element | null = element;
    let levels = 0;
    while (current && current !== document.documentElement && levels < 5) {
      const tag = current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift(`#${cssEscape(current.id)}`);
        break;
      }

      let sameTagIndex = 1;
      let previous = current.previousElementSibling;
      while (previous) {
        if (previous.tagName === current.tagName) sameTagIndex += 1;
        previous = previous.previousElementSibling;
      }

      const classTokens = [...current.classList]
        .filter((token) => !token.startsWith('focustrace-'))
        .slice(0, 2)
        .map(cssEscape);
      const classPart = classTokens.length ? `.${classTokens.join('.')}` : '';
      parts.unshift(`${tag}${classPart}:nth-of-type(${sameTagIndex})`);
      current = current.parentElement;
      levels += 1;
    }
    return parts.join(' > ') || element.tagName.toLowerCase();
  };

  const directText = (element: Element): string | undefined => {
    const pieces: string[] = [];
    for (const node of [...element.childNodes].slice(0, 8)) {
      if (node.nodeType !== Node.TEXT_NODE) continue;
      const text = clip(node.textContent);
      if (text) pieces.push(text);
    }
    return clip(pieces.join(' '));
  };

  const labelOf = (element: Element): string | undefined => {
    const ariaLabel = clip(element.getAttribute('aria-label'));
    if (ariaLabel) return ariaLabel;
    const title = clip(element.getAttribute('title'));
    if (title) return title;
    return directText(element);
  };

  const elementEvidence = (element: Element, trigger?: string): StructureHintElement => {
    const role = clip(element.getAttribute('role'), 40)?.toLowerCase();
    const id = clip(element.id, 80);
    const className = clip(
      [...element.classList]
        .filter((token) => !token.startsWith('focustrace-'))
        .slice(0, 3)
        .join(' '),
      100,
    );
    const tabindex = clip(element.getAttribute('tabindex'), 20);
    const label = labelOf(element);
    return {
      tag: element.tagName.toLowerCase(),
      selector: selectorFor(element),
      ...(role ? { role } : {}),
      ...(id ? { id } : {}),
      ...(className ? { className } : {}),
      ...(label ? { label } : {}),
      ...(tabindex ? { tabindex } : {}),
      ...(trigger ? { trigger } : {}),
    };
  };

  const addHint = (
    element: Element,
    hint: Omit<StructureHint, 'id' | 'selector' | 'element'>,
    trigger?: string,
  ): void => {
    if (hints.length >= MAX_HINTS) return;
    const evidence = elementEvidence(element, trigger);
    hintSequence += 1;
    hints.push({
      id: `structure-hint-${hintSequence}`,
      ...hint,
      selector: evidence.selector,
      element: evidence,
    });
  };

  const metrics: StructureMetrics = {
    totalElements: 0,
    semanticElements: 0,
    divCount: 0,
    genericContainerCount: 0,
    genericRatio: 0,
    landmarkCount: 0,
    interactiveCount: 0,
    listCount: 0,
    maxDepth: 0,
    maxGenericChain: 0,
    deepGenericChains: 0,
    headingCount: 0,
    formCount: 0,
    buttonCount: 0,
    linkCount: 0,
    formControlCount: 0,
    tableCount: 0,
    imageCount: 0,
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let current: Element | null = walker.currentNode as Element;
  let processed = 0;

  while (current && processed < MAX_ELEMENTS) {
    processed += 1;
    metrics.totalElements += 1;

    const tag = current.tagName.toLowerCase();
    const role = current.getAttribute('role')?.trim().toLowerCase() || undefined;
    const parent = current.parentElement;
    const depth = parent ? (depthByElement.get(parent) ?? 0) + 1 : 0;
    depthByElement.set(current, depth);
    metrics.maxDepth = Math.max(metrics.maxDepth, depth);

    if (semanticTags.has(tag) || role) metrics.semanticElements += 1;
    if (tag === 'div') metrics.divCount += 1;
    if (tag === 'div' || tag === 'span') metrics.genericContainerCount += 1;

    const isLandmark = landmarkTags.has(tag) || Boolean(role && landmarkRoles.has(role));
    const isHeading = headingTags.has(tag) || role === 'heading';
    const isList = tag === 'ul' || tag === 'ol' || tag === 'dl' || role === 'list';
    const isForm = tag === 'form' || role === 'form';
    const isButton = tag === 'button'
      || (tag === 'input' && ['button', 'submit', 'reset', 'image'].includes((current.getAttribute('type') ?? '').toLowerCase()))
      || role === 'button';
    const isLink = (tag === 'a' && current.hasAttribute('href')) || role === 'link';
    const isFormControl = ['input', 'select', 'textarea'].includes(tag)
      || ['textbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton'].includes(role ?? '');
    const isTable = tag === 'table' || ['table', 'grid', 'treegrid'].includes(role ?? '');
    const isImage = tag === 'img' || role === 'img';

    if (isLandmark) metrics.landmarkCount += 1;
    if (isHeading) metrics.headingCount += 1;
    if (isList) metrics.listCount += 1;
    if (isForm) metrics.formCount += 1;
    if (isButton) metrics.buttonCount += 1;
    if (isLink) metrics.linkCount += 1;
    if (isFormControl) metrics.formControlCount += 1;
    if (isTable) metrics.tableCount += 1;
    if (isImage) metrics.imageCount += 1;
    if (isButton || isLink || isFormControl || tag === 'summary') metrics.interactiveCount += 1;

    if (genericTags.has(tag)) {
      if (role === 'button') {
        addHint(current, {
          tone: 'review',
          title: 'Generic element used as a button',
          description: `A <${tag}> is exposing button semantics instead of using the native button element.`,
          suggestion: 'Prefer <button> when the element performs an action and native button semantics fit the interaction.',
        }, 'role="button"');
      } else if (role === 'link') {
        addHint(current, {
          tone: 'review',
          title: 'Generic element used as a link',
          description: `A <${tag}> is exposing link semantics instead of using a native link.`,
          suggestion: 'Prefer <a href="…"> when the interaction navigates to another location.',
        }, 'role="link"');
      } else if (role === 'heading') {
        addHint(current, {
          tone: 'info',
          title: 'Generic element used as a heading',
          description: `A <${tag}> is exposing heading semantics through ARIA.`,
          suggestion: 'When the document hierarchy allows it, prefer a native <h1>–<h6> element.',
        }, 'role="heading"');
      } else if (current.hasAttribute('onclick')) {
        addHint(current, {
          tone: 'review',
          title: 'Generic element with click handler',
          description: `A <${tag}> has an inline click handler but no native interactive element semantics.`,
          suggestion: 'Use <button> for actions or <a href="…"> for navigation when those native elements match the interaction.',
        }, 'onclick');
      } else {
        const tabindexValue = current.getAttribute('tabindex');
        const parsedTabindex = tabindexValue == null ? Number.NaN : Number(tabindexValue);
        if (Number.isFinite(parsedTabindex) && parsedTabindex >= 0 && !role) {
          addHint(current, {
            tone: 'review',
            title: 'Generic element in the tab order',
            description: `A <${tag}> is directly included in sequential keyboard focus without exposing a semantic role.`,
            suggestion: 'If this element is interactive, prefer the native interactive element that matches its action.',
          }, `tabindex="${tabindexValue}"`);
        }
      }
    }

    current = walker.nextNode() as Element | null;
  }

  if (current) truncated = true;
  metrics.genericRatio = metrics.totalElements
    ? Math.round((metrics.genericContainerCount / metrics.totalElements) * 1000) / 10
    : 0;

  const metricTargets: StructureMetricTarget[] = [
    { id: 'headings', count: metrics.headingCount, selector: 'h1,h2,h3,h4,h5,h6,[role="heading"]' },
    {
      id: 'landmarks',
      count: metrics.landmarkCount,
      selector: 'header,nav,main,footer,aside,[role="banner"],[role="navigation"],[role="main"],[role="contentinfo"],[role="complementary"],[role="region"],[role="search"],[role="form"]',
    },
    { id: 'lists', count: metrics.listCount, selector: 'ul,ol,dl,[role="list"]' },
    { id: 'forms', count: metrics.formCount, selector: 'form,[role="form"]' },
    {
      id: 'buttons',
      count: metrics.buttonCount,
      selector: 'button,input[type="button"],input[type="submit"],input[type="reset"],input[type="image"],[role="button"]',
    },
    { id: 'links', count: metrics.linkCount, selector: 'a[href],[role="link"]' },
    {
      id: 'form-controls',
      count: metrics.formControlCount,
      selector: 'input,select,textarea,[role="textbox"],[role="combobox"],[role="checkbox"],[role="radio"],[role="switch"],[role="slider"],[role="spinbutton"]',
    },
    { id: 'tables', count: metrics.tableCount, selector: 'table,[role="table"],[role="grid"],[role="treegrid"]' },
    { id: 'images', count: metrics.imageCount, selector: 'img,[role="img"]' },
  ];

  return {
    url: location.href,
    title: document.title,
    capturedAt: Date.now(),
    hints,
    metrics,
    metricTargets,
    truncated,
  };
}
