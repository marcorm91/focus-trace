import { accessibleNameDetails, isProgrammaticallyHidden } from './dom';

type ScanRoot = Document | Element;

export type StructuralHtmlSignalKind =
  | 'parent-context'
  | 'content-model'
  | 'nested-interactive'
  | 'main-hierarchy'
  | 'section-heading'
  | 'landmark-label';

export interface StructuralHtmlSignal {
  kind: StructuralHtmlSignalKind;
  element: Element;
  detail: string;
}

const SCRIPT_SUPPORTING = new Set(['SCRIPT', 'TEMPLATE']);
const SECTIONING_SELECTOR = 'article, aside, nav, section';
const INTERACTIVE_SELECTOR = [
  'button',
  'details',
  'embed',
  'iframe',
  'label',
  'select',
  'textarea',
  'a[href]',
  'audio[controls]',
  'img[usemap]',
  'input:not([type="hidden"])',
  'video[controls]',
].join(', ');
const LABELABLE_SELECTOR = 'button, input:not([type="hidden"]), meter, output, progress, select, textarea';

function scopedElements(root: ScanRoot, selector: string): Element[] {
  const descendants = [...root.querySelectorAll(selector)];
  return root instanceof Element && root.matches(selector) ? [root, ...descendants] : descendants;
}

function tag(element: Element | null | undefined): string {
  return element?.tagName.toLowerCase() ?? 'none';
}

function directElements(element: Element, ignoreScriptSupporting = true): Element[] {
  const children = [...element.children];
  return ignoreScriptSupporting ? children.filter((child) => !SCRIPT_SUPPORTING.has(child.tagName)) : children;
}

function add(signals: StructuralHtmlSignal[], kind: StructuralHtmlSignalKind, element: Element, detail: string) {
  signals.push({ kind, element, detail });
}

function isValidDescriptionSequence(elements: Element[]): boolean {
  if (!elements.length) return true;
  let hasTerms = false;
  let hasDescriptions = false;

  for (const element of elements) {
    if (element.tagName === 'DT') {
      if (hasDescriptions) {
        hasTerms = true;
        hasDescriptions = false;
      } else {
        hasTerms = true;
      }
      continue;
    }
    if (element.tagName === 'DD') {
      if (!hasTerms) return false;
      hasDescriptions = true;
      continue;
    }
    return false;
  }

  return hasTerms && hasDescriptions;
}

function evaluateRequiredContexts(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const element of scopedElements(root, 'li')) {
    if (!['UL', 'OL', 'MENU'].includes(element.parentElement?.tagName ?? '')) {
      add(signals, 'parent-context', element, `<li> requires a direct <ul>, <ol> or <menu> parent; current parent is <${tag(element.parentElement)}>.`);
    }
  }

  for (const element of scopedElements(root, 'dt, dd')) {
    const parent = element.parentElement;
    const valid = parent?.tagName === 'DL' || (parent?.tagName === 'DIV' && parent.parentElement?.tagName === 'DL');
    if (!valid) add(signals, 'parent-context', element, `<${tag(element)}> must belong directly to <dl>, or to a grouping <div> that is a direct child of <dl>.`);
  }

  const directParentRules: Array<[string, readonly string[]]> = [
    ['figcaption', ['FIGURE']],
    ['legend', ['FIELDSET', 'OPTGROUP']],
    ['summary', ['DETAILS']],
    ['caption', ['TABLE']],
    ['colgroup', ['TABLE']],
    ['col', ['COLGROUP']],
    ['thead', ['TABLE']],
    ['tbody', ['TABLE']],
    ['tfoot', ['TABLE']],
    ['tr', ['TABLE', 'THEAD', 'TBODY', 'TFOOT']],
    ['td', ['TR']],
    ['th', ['TR']],
    ['source', ['PICTURE', 'AUDIO', 'VIDEO']],
    ['track', ['AUDIO', 'VIDEO']],
  ];

  for (const [selector, parents] of directParentRules) {
    for (const element of scopedElements(root, selector)) {
      if (!parents.includes(element.parentElement?.tagName ?? '')) {
        add(signals, 'parent-context', element, `<${tag(element)}> requires one of these direct parents: ${parents.map((name) => `<${name.toLowerCase()}>`).join(', ')}; current parent is <${tag(element.parentElement)}>.`);
      }
    }
  }

  for (const element of scopedElements(root, 'optgroup')) {
    if (!element.closest('select')) add(signals, 'parent-context', element, '<optgroup> must be a descendant of <select>.');
  }

  for (const element of scopedElements(root, 'option')) {
    if (!element.closest('select, datalist, optgroup')) add(signals, 'parent-context', element, '<option> must be a descendant of <select>, <datalist> or <optgroup>.');
  }

  for (const element of scopedElements(root, 'area')) {
    if (!element.closest('map')) add(signals, 'parent-context', element, '<area> requires a <map> ancestor.');
  }

  for (const element of scopedElements(root, 'selectedcontent')) {
    const button = element.closest('button');
    if (!button || button.parentElement?.tagName !== 'SELECT') {
      add(signals, 'parent-context', element, '<selectedcontent> must be inside the <button> that is the first child control of a customizable <select>.');
    }
  }
}

function evaluateLists(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const list of scopedElements(root, 'ul, ol, menu')) {
    const invalid = directElements(list).filter((child) => child.tagName !== 'LI');
    for (const child of invalid) add(signals, 'content-model', child, `<${tag(list)}> may contain list items as its structural children; unexpected direct child <${tag(child)}> breaks the native list content model.`);
  }

  for (const dl of scopedElements(root, 'dl')) {
    const children = directElements(dl);
    if (!children.length) continue;
    const grouped = children.some((child) => child.tagName === 'DIV');

    if (grouped) {
      if (children.some((child) => child.tagName !== 'DIV')) {
        add(signals, 'content-model', dl, '<dl> must use either direct dt/dd groups or div-wrapped dt/dd groups; both forms cannot be mixed at the same level.');
      }
      for (const group of children.filter((child) => child.tagName === 'DIV')) {
        if (!isValidDescriptionSequence(directElements(group))) add(signals, 'content-model', group, 'A grouping <div> inside <dl> must contain one or more <dt> elements followed by one or more <dd> elements.');
      }
      continue;
    }

    if (!isValidDescriptionSequence(children)) add(signals, 'content-model', dl, '<dl> direct children must form groups of one or more <dt> elements followed by one or more <dd> elements.');
  }
}

function evaluateFiguresAndDisclosure(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const details of scopedElements(root, 'details')) {
    const summaries = [...details.children].filter((child) => child.tagName === 'SUMMARY');
    if (summaries.length !== 1 || details.firstElementChild?.tagName !== 'SUMMARY') {
      add(signals, 'content-model', details, `<details> requires exactly one <summary> as its first element child; found ${summaries.length}.`);
    }
  }

  for (const legend of scopedElements(root, 'legend')) {
    const parent = legend.parentElement;
    if ((parent?.tagName === 'FIELDSET' || parent?.tagName === 'OPTGROUP') && parent.firstElementChild !== legend) {
      add(signals, 'content-model', legend, `<legend> must be the first element child of its <${tag(parent)}> parent.`);
    }
  }

  for (const figure of scopedElements(root, 'figure')) {
    const captions = [...figure.children].filter((child) => child.tagName === 'FIGCAPTION');
    if (captions.length > 1) add(signals, 'content-model', figure, `<figure> can contain at most one direct <figcaption>; found ${captions.length}.`);
    const caption = captions[0];
    if (caption && figure.firstElementChild !== caption && figure.lastElementChild !== caption) {
      add(signals, 'content-model', caption, '<figcaption> must be the first or last element child of its <figure>.');
    }
  }
}

function evaluateTables(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const table of scopedElements(root, 'table')) {
    const children = directElements(table);
    const allowed = new Set(['CAPTION', 'COLGROUP', 'THEAD', 'TBODY', 'TFOOT', 'TR']);
    for (const child of children.filter((item) => !allowed.has(item.tagName))) {
      add(signals, 'content-model', child, `Unexpected direct <${tag(child)}> inside <table>; native table structure expects caption/column groups/row groups/rows.`);
    }

    const captions = children.filter((child) => child.tagName === 'CAPTION');
    const heads = children.filter((child) => child.tagName === 'THEAD');
    const feet = children.filter((child) => child.tagName === 'TFOOT');
    if (captions.length > 1) add(signals, 'content-model', table, `<table> can contain at most one <caption>; found ${captions.length}.`);
    if (heads.length > 1) add(signals, 'content-model', table, `<table> can contain at most one <thead>; found ${heads.length}.`);
    if (feet.length > 1) add(signals, 'content-model', table, `<table> can contain at most one <tfoot>; found ${feet.length}.`);
    if (captions[0] && children[0] !== captions[0]) add(signals, 'content-model', captions[0], '<caption> must precede the structural table children.');

    const firstRowStructure = children.findIndex((child) => ['THEAD', 'TBODY', 'TFOOT', 'TR'].includes(child.tagName));
    for (const colgroup of children.filter((child) => child.tagName === 'COLGROUP')) {
      if (children.indexOf(colgroup) > firstRowStructure && firstRowStructure >= 0) add(signals, 'content-model', colgroup, '<colgroup> must appear before table head/body/footer/row content.');
    }

    const theadIndex = children.findIndex((child) => child.tagName === 'THEAD');
    const firstBodyIndex = children.findIndex((child) => ['TBODY', 'TFOOT', 'TR'].includes(child.tagName));
    if (theadIndex >= 0 && firstBodyIndex >= 0 && theadIndex > firstBodyIndex) add(signals, 'content-model', heads[0]!, '<thead> must precede tbody/tfoot/direct tr content.');

    const tfootIndex = children.findIndex((child) => child.tagName === 'TFOOT');
    if (tfootIndex >= 0 && children.slice(tfootIndex + 1).some((child) => ['THEAD', 'TBODY', 'TR'].includes(child.tagName))) {
      add(signals, 'content-model', feet[0]!, '<tfoot> must follow the table body/direct row content.');
    }

    if (children.some((child) => child.tagName === 'TBODY') && children.some((child) => child.tagName === 'TR')) {
      add(signals, 'content-model', table, '<table> cannot mix direct <tr> children with direct <tbody> children in the same content model branch.');
    }
  }

  for (const section of scopedElements(root, 'thead, tbody, tfoot')) {
    for (const child of directElements(section).filter((item) => item.tagName !== 'TR')) add(signals, 'content-model', child, `<${tag(section)}> may contain only structural <tr> children.`);
  }

  for (const row of scopedElements(root, 'tr')) {
    for (const child of directElements(row).filter((item) => item.tagName !== 'TD' && item.tagName !== 'TH')) add(signals, 'content-model', child, '<tr> may contain only <td> and <th> cells as structural children.');
  }

  for (const colgroup of scopedElements(root, 'colgroup')) {
    const children = [...colgroup.children].filter((child) => child.tagName !== 'TEMPLATE');
    if (colgroup.hasAttribute('span') && children.length) add(signals, 'content-model', colgroup, '<colgroup span="…"> must not contain <col> children.');
    if (!colgroup.hasAttribute('span')) {
      for (const child of children.filter((item) => item.tagName !== 'COL')) add(signals, 'content-model', child, '<colgroup> without span may contain only <col> and <template> children.');
    }
  }
}

function evaluateMedia(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const picture of scopedElements(root, 'picture')) {
    const children = directElements(picture);
    const images = children.filter((child) => child.tagName === 'IMG');
    if (images.length !== 1) add(signals, 'content-model', picture, `<picture> requires exactly one direct <img> fallback; found ${images.length}.`);
    const imgIndex = children.findIndex((child) => child.tagName === 'IMG');
    for (const child of children) {
      if (!['SOURCE', 'IMG'].includes(child.tagName)) add(signals, 'content-model', child, `<picture> may structurally contain only <source> elements followed by one <img>; found <${tag(child)}>.`);
      if (child.tagName === 'SOURCE' && imgIndex >= 0 && children.indexOf(child) > imgIndex) add(signals, 'content-model', child, '<source> inside <picture> must appear before the fallback <img>.');
    }
  }

  for (const media of scopedElements(root, 'audio, video')) {
    const children = directElements(media);
    const firstFallback = children.findIndex((child) => !['SOURCE', 'TRACK'].includes(child.tagName));
    const firstTrack = children.findIndex((child) => child.tagName === 'TRACK');
    for (const source of children.filter((child) => child.tagName === 'SOURCE')) {
      if (media.hasAttribute('src')) add(signals, 'content-model', source, `<${tag(media)}> with a src attribute must not also contain <source> alternatives.`);
      if ((firstTrack >= 0 && children.indexOf(source) > firstTrack) || (firstFallback >= 0 && children.indexOf(source) > firstFallback)) add(signals, 'content-model', source, `<source> inside <${tag(media)}> must precede tracks and fallback flow content.`);
    }
    for (const track of children.filter((child) => child.tagName === 'TRACK')) {
      if (firstFallback >= 0 && children.indexOf(track) > firstFallback) add(signals, 'content-model', track, `<track> inside <${tag(media)}> must precede fallback flow content.`);
    }
    const nested = media.querySelector('audio, video');
    if (nested) add(signals, 'content-model', nested, `<${tag(media)}> must not contain descendant media elements; found nested <${tag(nested)}>.`);
  }
}

function evaluateFormsAndMaps(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const optgroup of scopedElements(root, 'optgroup')) {
    const legend = [...optgroup.children].find((child) => child.tagName === 'LEGEND');
    if (!legend && !optgroup.getAttribute('label')?.trim()) add(signals, 'content-model', optgroup, '<optgroup> without a child <legend> requires a non-empty label attribute.');
  }

  for (const select of scopedElements(root, 'select:not([multiple])')) {
    const selected = [...select.querySelectorAll('option[selected]')];
    if (selected.length > 1) add(signals, 'content-model', select, `A non-multiple <select> must not declare more than one selected <option>; found ${selected.length}.`);
  }

  for (const map of scopedElements(root, 'map')) {
    const name = map.getAttribute('name') ?? '';
    if (!name || /\s/.test(name)) add(signals, 'content-model', map, '<map> requires a non-empty name without ASCII whitespace.');
    const id = map.getAttribute('id');
    if (id != null && id !== name) add(signals, 'content-model', map, '<map> id and name must be equal when both are specified.');
  }

  for (const area of scopedElements(root, 'area')) {
    if (area.hasAttribute('href') && !area.hasAttribute('alt')) add(signals, 'content-model', area, '<area href="…"> requires an alt attribute.');
    if (!area.hasAttribute('href') && area.hasAttribute('alt')) add(signals, 'content-model', area, '<area> without href must omit alt.');
  }
}

function isInteractive(element: Element): boolean {
  return element.matches(INTERACTIVE_SELECTOR);
}

function isLabelable(element: Element | null): boolean {
  return Boolean(element?.matches(LABELABLE_SELECTOR));
}

function evaluateInteractiveNesting(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const anchor of scopedElements(root, 'a[href]')) {
    const conflict = [...anchor.querySelectorAll('*')].find((descendant) => descendant.tagName === 'A' || descendant.hasAttribute('tabindex') || isInteractive(descendant));
    if (conflict) add(signals, 'nested-interactive', conflict, `<a href> must not contain interactive content, descendant anchors, or descendants with tabindex; found <${tag(conflict)}> inside the link.`);
  }

  for (const button of scopedElements(root, 'button')) {
    const conflict = [...button.querySelectorAll('*')].find((descendant) => descendant.hasAttribute('tabindex') || isInteractive(descendant));
    if (conflict) add(signals, 'nested-interactive', conflict, `<button> must not contain interactive content or descendants with tabindex; found <${tag(conflict)}> inside the button.`);
  }

  for (const label of scopedElements(root, 'label')) {
    const nestedLabel = label.querySelector('label');
    if (nestedLabel) add(signals, 'nested-interactive', nestedLabel, '<label> must not contain another <label>.');

    const control = (label as HTMLLabelElement).control;
    for (const candidate of label.querySelectorAll(LABELABLE_SELECTOR)) {
      if (candidate !== control) add(signals, 'nested-interactive', candidate, `<label> contains a labelable element that is not its labeled control (<${tag(candidate)}>).`);
    }

    const htmlFor = (label as HTMLLabelElement).htmlFor;
    if (htmlFor) {
      const target = label.ownerDocument.getElementById(htmlFor);
      if (!isLabelable(target)) add(signals, 'nested-interactive', label, `<label for=${JSON.stringify(htmlFor)}> does not reference a labelable element in the same document.`);
    }
  }

  for (const option of scopedElements(root, 'option:not([label])')) {
    if (option.closest('datalist')) continue;
    const conflict = [...option.querySelectorAll('*')].find((descendant) => descendant.hasAttribute('tabindex') || isInteractive(descendant) || descendant.tagName === 'DATALIST' || descendant.tagName === 'OBJECT');
    if (conflict) add(signals, 'nested-interactive', conflict, `<option> must not contain interactive content, datalist/object descendants, or descendants with tabindex; found <${tag(conflict)}>.`);
  }

  for (const form of scopedElements(root, 'form')) {
    const nested = form.querySelector('form');
    if (nested) add(signals, 'nested-interactive', nested, '<form> must not contain another <form>. Browsers may repair this in parsed source, but dynamically-created nested forms are still invalid.');
  }

  for (const dt of scopedElements(root, 'dt')) {
    const forbidden = dt.querySelector('header, footer, article, aside, nav, section, h1, h2, h3, h4, h5, h6, hgroup');
    if (forbidden) add(signals, 'content-model', forbidden, `<dt> must not contain header/footer, sectioning content or heading content; found <${tag(forbidden)}>.`);
  }

  for (const address of scopedElements(root, 'address')) {
    const forbidden = address.querySelector('address, header, footer, article, aside, nav, section, h1, h2, h3, h4, h5, h6, hgroup');
    if (forbidden) add(signals, 'content-model', forbidden, `<address> must not contain heading content, sectioning content, header/footer or another address; found <${tag(forbidden)}>.`);
  }
}

function evaluateMainHierarchy(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const main of scopedElements(root, 'main')) {
    let ancestor = main.parentElement;
    while (ancestor) {
      const name = ancestor.tagName;
      const allowed = name === 'HTML'
        || name === 'BODY'
        || name === 'DIV'
        || name.includes('-')
        || (name === 'FORM' && !accessibleNameDetails(ancestor).name);
      if (!allowed) {
        add(signals, 'main-hierarchy', main, `<main> has disallowed ancestor <${tag(ancestor)}>. Native main ancestors are limited to html, body, div, unnamed form and autonomous custom elements.`);
        break;
      }
      ancestor = ancestor.parentElement;
    }
  }
}

function hasOwnSectionHeading(element: Element): boolean {
  return [...element.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .some((heading) => heading.closest(SECTIONING_SELECTOR) === element);
}

function evaluateSectionIdentification(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  for (const element of scopedElements(root, 'section, article')) {
    if (isProgrammaticallyHidden(element)) continue;
    if (hasOwnSectionHeading(element) || accessibleNameDetails(element).name) continue;
    add(signals, 'section-heading', element, `<${tag(element)}> has no heading that belongs to this sectioning element and no computed accessible name. Review whether the section is identifiable or whether a generic <div> would better match the content.`);
  }
}

function resolvedLandmarkRole(element: Element): 'navigation' | 'complementary' | 'search' | undefined {
  const explicit = element.getAttribute('role')?.trim().toLowerCase().split(/\s+/)[0];
  if (explicit === 'navigation' || explicit === 'complementary' || explicit === 'search') return explicit;
  if (element.tagName === 'NAV') return 'navigation';
  if (element.tagName === 'ASIDE') return 'complementary';
  if (element.tagName === 'SEARCH') return 'search';
  return undefined;
}

function evaluateRepeatedLandmarks(root: ScanRoot, signals: StructuralHtmlSignal[]) {
  const landmarks = scopedElements(root, 'nav, aside, search, [role="navigation"], [role="complementary"], [role="search"]')
    .filter((element) => !isProgrammaticallyHidden(element));
  const groups = new Map<string, Element[]>();

  for (const landmark of landmarks) {
    const role = resolvedLandmarkRole(landmark);
    if (!role) continue;
    const group = groups.get(role) ?? [];
    if (!group.includes(landmark)) group.push(landmark);
    groups.set(role, group);
  }

  for (const [role, group] of groups) {
    if (group.length < 2) continue;
    const names = group.map((element) => accessibleNameDetails(element).name.trim());
    for (let index = 0; index < group.length; index += 1) {
      const element = group[index]!;
      const name = names[index]!;
      const duplicate = Boolean(name && names.filter((candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase()).length > 1);
      if (!name || duplicate) add(signals, 'landmark-label', element, `${group.length} ${role} landmarks are exposed. This landmark ${!name ? 'has no accessible name' : `reuses the name ${JSON.stringify(name)}`}; repeated landmarks should be distinguishable.`);
    }
  }
}

export function evaluateStructuralHtml(root: ScanRoot, includePageContext = root instanceof Document): StructuralHtmlSignal[] {
  const signals: StructuralHtmlSignal[] = [];
  evaluateRequiredContexts(root, signals);
  evaluateLists(root, signals);
  evaluateFiguresAndDisclosure(root, signals);
  evaluateTables(root, signals);
  evaluateMedia(root, signals);
  evaluateFormsAndMaps(root, signals);
  evaluateInteractiveNesting(root, signals);
  evaluateSectionIdentification(root, signals);
  if (includePageContext) {
    evaluateMainHierarchy(root, signals);
    evaluateRepeatedLandmarks(root, signals);
  }
  return signals;
}
