export type StructureHintTone = 'review' | 'info';

export type StructureHint = {
  id: string;
  tone: StructureHintTone;
  title: string;
  description: string;
  selector?: string;
  suggestion?: string;
};

export type StructureNode = {
  id: string;
  tag: string;
  selector: string;
  role?: string;
  label?: string;
  className?: string;
  count?: number;
  children: StructureNode[];
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
};

export type StructureSnapshot = {
  url: string;
  title: string;
  capturedAt: number;
  roots: StructureNode[];
  hints: StructureHint[];
  metrics: StructureMetrics;
  truncated: boolean;
};

export function collectStructureMapInPage(): StructureSnapshot {
  const MAX_ELEMENTS = 10_000;
  const MAX_STRUCTURE_NODES = 900;
  const MAX_HINTS = 80;
  const MAX_LABEL_LENGTH = 90;

  const semanticTags = new Set([
    'header', 'nav', 'main', 'footer', 'aside', 'section', 'article',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'form', 'fieldset', 'legend',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'figure', 'figcaption', 'details', 'summary', 'dialog',
    'button', 'a', 'input', 'select', 'textarea',
  ]);
  const landmarkTags = new Set(['header', 'nav', 'main', 'footer', 'aside']);
  const landmarkRoles = new Set(['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'region', 'search', 'form']);
  const interactiveTags = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary']);
  const interactiveRoles = new Set(['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'switch', 'tab', 'menuitem']);
  const groupableTags = new Set(['article', 'li', 'tr', 'div']);
  const hints: StructureHint[] = [];
  let hintSequence = 0;
  let structureSequence = 0;
  let structureNodeCount = 0;
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
    while (current && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift(`#${cssEscape(current.id)}`);
        break;
      }
      let segment = tag;
      const parent = current.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((sibling) => sibling.tagName === current!.tagName);
        if (siblings.length > 1) segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(segment);
      if (current === document.body) break;
      current = parent;
    }
    return parts.join(' > ') || element.tagName.toLowerCase();
  };

  const roleOf = (element: Element): string | undefined => clip(element.getAttribute('role'), 40)?.toLowerCase();

  const labelOf = (element: Element): string | undefined => {
    const ariaLabel = clip(element.getAttribute('aria-label'));
    if (ariaLabel) return ariaLabel;
    const labelledBy = element.getAttribute('aria-labelledby')?.trim();
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ');
      const label = clip(text);
      if (label) return label;
    }
    const tag = element.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag) || ['button', 'a', 'legend', 'summary', 'figcaption'].includes(tag)) {
      return clip(element.textContent);
    }
    if (['nav', 'section', 'article', 'aside', 'form'].includes(tag)) {
      const heading = element.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
      return clip(heading?.textContent);
    }
    return undefined;
  };

  const compactClassName = (element: Element): string | undefined => {
    const tokens = [...element.classList].filter((token) => !token.startsWith('focustrace-')).slice(0, 2);
    return tokens.length ? tokens.join(' ') : undefined;
  };

  const isRelevant = (element: Element): boolean => {
    const tag = element.tagName.toLowerCase();
    if (semanticTags.has(tag) || element.hasAttribute('role')) return true;
    if (tag !== 'div') return false;
    if (element.id || element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) return true;
    const parentTag = element.parentElement?.tagName.toLowerCase();
    return ['body', 'main'].includes(parentTag ?? '') && element.children.length >= 2 && element.classList.length > 0;
  };

  const addHint = (hint: Omit<StructureHint, 'id'>): void => {
    if (hints.length >= MAX_HINTS) return;
    hintSequence += 1;
    hints.push({ id: `structure-hint-${hintSequence}`, ...hint });
  };

  const repeatedSignature = (element: Element): string => {
    const tag = element.tagName.toLowerCase();
    const classes = [...element.classList].slice(0, 2).sort().join('.');
    const role = roleOf(element) ?? '';
    return `${tag}|${classes}|${role}`;
  };

  const isPossibleListGroup = (element: Element): boolean => {
    if (['ul', 'ol', 'dl', 'table'].includes(element.tagName.toLowerCase())) return false;
    const children = [...element.children].filter((child) => !['script', 'style', 'template'].includes(child.tagName.toLowerCase()));
    if (children.length < 3 || children.length > 40) return false;
    const signatures = children.map(repeatedSignature);
    const first = signatures[0];
    return Boolean(first) && signatures.filter((signature) => signature === first).length / signatures.length >= 0.8;
  };

  const directLinkRatio = (element: Element): { links: number; ratio: number } => {
    const children = [...element.children];
    if (!children.length) return { links: 0, ratio: 0 };
    const links = children.filter((child) => child.matches('a[href]') || Boolean(child.querySelector(':scope > a[href]'))).length;
    return { links, ratio: links / children.length };
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
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let current = walker.currentNode as Element;
  let processed = 0;
  const deepChainStarts = new Set<Element>();

  while (current && processed < MAX_ELEMENTS) {
    processed += 1;
    metrics.totalElements += 1;
    const tag = current.tagName.toLowerCase();
    const role = roleOf(current);
    if (semanticTags.has(tag) || role) metrics.semanticElements += 1;
    if (tag === 'div') metrics.divCount += 1;
    if (tag === 'div' || tag === 'span') metrics.genericContainerCount += 1;
    if (landmarkTags.has(tag) || (role && landmarkRoles.has(role))) metrics.landmarkCount += 1;
    if ((interactiveTags.has(tag) && (tag !== 'a' || current.hasAttribute('href'))) || (role && interactiveRoles.has(role))) metrics.interactiveCount += 1;
    if (tag === 'ul' || tag === 'ol' || tag === 'dl') metrics.listCount += 1;

    let depth = 0;
    let ancestor: Element | null = current;
    while (ancestor && ancestor !== document.body) {
      depth += 1;
      ancestor = ancestor.parentElement;
    }
    metrics.maxDepth = Math.max(metrics.maxDepth, depth);

    if (tag === 'div') {
      let chain = 1;
      let chainNode: Element | null = current;
      while (chainNode?.children.length === 1 && chainNode.firstElementChild?.tagName.toLowerCase() === 'div') {
        chain += 1;
        chainNode = chainNode.firstElementChild;
        if (chain >= 30) break;
      }
      metrics.maxGenericChain = Math.max(metrics.maxGenericChain, chain);
      if (chain >= 4 && current.parentElement?.tagName.toLowerCase() !== 'div') {
        metrics.deepGenericChains += 1;
        deepChainStarts.add(current);
      }
    }

    if ((tag === 'div' || tag === 'span') && (current.hasAttribute('onclick') || role === 'button')) {
      addHint({
        tone: 'review',
        title: 'Generic element used as a control',
        description: `<${tag}> is being used with button-like interaction. Native controls usually provide keyboard and accessibility behavior with less custom code.`,
        selector: selectorFor(current),
        suggestion: 'Consider a native <button> when the interaction is a button action.',
      });
    }

    if (isPossibleListGroup(current)) {
      addHint({
        tone: 'info',
        title: 'Repeated sibling structure',
        description: 'This container has three or more similarly structured sibling items. It may represent a semantic list, depending on the content.',
        selector: selectorFor(current),
        suggestion: 'Consider <ul>/<ol> with <li> when the repeated items form a meaningful list.',
      });
    }

    if (tag !== 'nav' && !current.closest('nav,[role="navigation"]')) {
      const linkGroup = directLinkRatio(current);
      if (linkGroup.links >= 3 && linkGroup.ratio >= 0.75) {
        addHint({
          tone: 'info',
          title: 'Navigation-like link group',
          description: 'Most direct items in this container are links. If they form a navigation block, a navigation landmark may make the structure easier to understand.',
          selector: selectorFor(current),
          suggestion: 'Consider <nav> or role="navigation" when this group is actually site or page navigation.',
        });
      }
    }

    current = walker.nextNode() as Element;
  }

  if (walker.nextNode()) truncated = true;
  metrics.genericRatio = metrics.totalElements ? Math.round((metrics.genericContainerCount / metrics.totalElements) * 1000) / 10 : 0;

  for (const element of deepChainStarts) {
    if (hints.length >= MAX_HINTS) break;
    addHint({
      tone: 'info',
      title: 'Deep generic wrapper chain',
      description: 'Four or more single-child <div> wrappers are nested before reaching meaningful content.',
      selector: selectorFor(element),
      suggestion: 'Review whether every wrapper is required for layout, styling or behavior.',
    });
  }

  if (metrics.totalElements >= 100 && metrics.divCount / metrics.totalElements >= 0.6) {
    addHint({
      tone: 'info',
      title: 'High <div> density',
      description: `${Math.round((metrics.divCount / metrics.totalElements) * 100)}% of the sampled DOM elements are <div> containers.`,
      suggestion: 'Review whether semantic HTML can replace generic containers where the content has a clear purpose.',
    });
  }

  const groupNodes = (nodes: StructureNode[]): StructureNode[] => {
    const grouped: StructureNode[] = [];
    let index = 0;
    while (index < nodes.length) {
      const node = nodes[index]!;
      if (!groupableTags.has(node.tag)) {
        grouped.push(node);
        index += 1;
        continue;
      }
      let end = index + 1;
      while (
        end < nodes.length
        && nodes[end]!.tag === node.tag
        && nodes[end]!.role === node.role
        && nodes[end]!.className === node.className
      ) {
        end += 1;
      }
      const count = end - index;
      grouped.push(count >= 3 ? { ...node, count } : node);
      if (count < 3) {
        for (let extra = index + 1; extra < end; extra += 1) grouped.push(nodes[extra]!);
      }
      index = end;
    }
    return grouped;
  };

  const visit = (element: Element): StructureNode[] => {
    if (structureNodeCount >= MAX_STRUCTURE_NODES) {
      truncated = true;
      return [];
    }
    const childNodes = groupNodes([...element.children].flatMap((child) => visit(child)));
    if (!isRelevant(element)) return childNodes;

    structureNodeCount += 1;
    structureSequence += 1;
    const tag = element.tagName.toLowerCase();
    const role = roleOf(element);
    const label = labelOf(element);
    const className = compactClassName(element);
    return [{
      id: `structure-node-${structureSequence}`,
      tag,
      selector: selectorFor(element),
      ...(role ? { role } : {}),
      ...(label ? { label } : {}),
      ...(className ? { className } : {}),
      children: childNodes,
    }];
  };

  const roots = groupNodes([...document.body.children].flatMap((child) => visit(child)));

  return {
    url: location.href,
    title: document.title,
    capturedAt: Date.now(),
    roots,
    hints,
    metrics,
    truncated,
  };
}
