import { isProgrammaticallyHidden, isSequentiallyFocusable, semanticRole } from './dom';

const MIN_NAVIGATION_STOPS = 3;
const BYPASS_HINT = /\b(?:skip|bypass|main|content|contenido|principal|saltar|conteudo|conteúdo|inhalt|contenuto)\b/i;

export type BypassBlocksStatus = 'pass' | 'review' | 'inapplicable';

export interface BypassBlocksEvaluation {
  status: BypassBlocksStatus;
  target?: Element;
  description?: string;
  evidence?: string;
}

function precedes(left: Node, right: Node): boolean {
  return Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function isMainLandmark(element: Element): boolean {
  return element.tagName === 'MAIN' || semanticRole(element) === 'main';
}

function isNavigationLandmark(element: Element): boolean {
  return element.tagName === 'NAV' || semanticRole(element) === 'navigation';
}

function exposedMainLandmarks(): Element[] {
  return [...document.querySelectorAll('main, [role]')]
    .filter(isMainLandmark)
    .filter((element) => !isProgrammaticallyHidden(element));
}

function navigationStops(element: Element): number {
  return [element, ...element.querySelectorAll('*')]
    .filter((candidate) => isSequentiallyFocusable(candidate))
    .length;
}

function bypassWorthyNavigation(main: Element): Array<{ element: Element; stops: number }> {
  return [...document.querySelectorAll('nav, [role]')]
    .filter(isNavigationLandmark)
    .filter((element) => !isProgrammaticallyHidden(element))
    .filter((element) => precedes(element, main))
    .map((element) => ({ element, stops: navigationStops(element) }))
    .filter(({ stops }) => stops >= MIN_NAVIGATION_STOPS);
}

function fragmentId(link: HTMLAnchorElement): string | undefined {
  const raw = link.getAttribute('href')?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw, document.baseURI);
    const current = new URL(document.location.href);
    if (!url.hash) return undefined;
    if (url.origin !== current.origin || url.pathname !== current.pathname || url.search !== current.search) return undefined;
    return decodeURIComponent(url.hash.slice(1));
  } catch {
    return raw.startsWith('#') && raw.length > 1 ? decodeURIComponent(raw.slice(1)) : undefined;
  }
}

function earlyFragmentLinks(boundary: Element): HTMLAnchorElement[] {
  return [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .filter((link) => precedes(link, boundary))
    .filter((link) => !isProgrammaticallyHidden(link))
    .filter((link) => isSequentiallyFocusable(link))
    .filter((link) => Boolean(fragmentId(link)));
}

function targetInsideMain(link: HTMLAnchorElement, main: Element): Element | undefined {
  const id = fragmentId(link);
  if (!id) return undefined;
  const target = document.getElementById(id);
  if (!target || isProgrammaticallyHidden(target)) return undefined;
  return target === main || main.contains(target) ? target : undefined;
}

function hintedBrokenCandidate(links: HTMLAnchorElement[]): { link: HTMLAnchorElement; id: string } | undefined {
  for (const link of links) {
    const id = fragmentId(link);
    if (!id || document.getElementById(id)) continue;
    const hint = `${link.getAttribute('aria-label') ?? ''} ${link.textContent ?? ''} ${id}`;
    if (BYPASS_HINT.test(hint)) return { link, id };
  }
  return undefined;
}

export function evaluateBypassBlocks(): BypassBlocksEvaluation {
  const main = exposedMainLandmarks()[0];
  if (!main) return { status: 'inapplicable' };

  const navigation = bypassWorthyNavigation(main);
  const boundary = navigation[0]?.element ?? main;
  const earlyLinks = earlyFragmentLinks(boundary);
  const valid = earlyLinks.find((link) => targetInsideMain(link, main));

  if (valid) {
    const id = fragmentId(valid)!;
    return {
      status: 'pass',
      target: valid,
      evidence: `Keyboard-focusable same-document fragment link resolves to #${id} inside the primary main landmark before the repeated-navigation candidate.`,
    };
  }

  const broken = hintedBrokenCandidate(earlyLinks);
  if (broken) {
    return {
      status: 'review',
      target: broken.link,
      description: 'An early keyboard-focusable fragment link looks like a bypass mechanism, but its destination does not exist. Review the intended skip-link behavior and any alternative mechanism before treating this as a WCAG 2.4.1 failure.',
      evidence: `Potential bypass link points to missing fragment target #${broken.id}.`,
    };
  }

  if (!navigation.length) return { status: 'inapplicable' };

  const first = navigation[0]!;
  return {
    status: 'review',
    target: first.element,
    description: 'A substantial navigation block appears before the primary content, but FocusTrace did not detect a keyboard-focusable same-document fragment link before it that resolves to the main landmark or content inside it. Review whether another mechanism satisfies WCAG 2.4.1 Bypass Blocks.',
    evidence: `Navigation landmark before main exposes ${first.stops} sequential keyboard stops. No validated keyboard bypass link to the primary main content was detected before that block.`,
  };
}
