import { accessibleNameDetails, isProgrammaticallyHidden } from './dom';
import { scopedElements } from './scan-elements';
import { registeredExplicitAriaRole } from './standards-registry';

export type LandmarkRole = 'banner' | 'complementary' | 'contentinfo' | 'form' | 'main' | 'navigation' | 'region' | 'search';

const LANDMARK_ROLES = new Set<LandmarkRole>([
  'banner',
  'complementary',
  'contentinfo',
  'form',
  'main',
  'navigation',
  'region',
  'search',
]);
const SECTIONING_ANCESTOR_SELECTOR = 'article, aside, main, nav, section';
const LANDMARK_CANDIDATE_SELECTOR = 'header, footer, main, nav, aside, section, form, search, [role]';

function asLandmarkRole(value: string | undefined): LandmarkRole | null {
  return value && LANDMARK_ROLES.has(value as LandmarkRole) ? value as LandmarkRole : null;
}

function explicitRole(element: Element): string | undefined {
  return element.hasAttribute('role') ? registeredExplicitAriaRole(element)?.name : undefined;
}

function nativeLandmarkRole(element: Element): LandmarkRole | null {
  switch (element.tagName) {
    case 'MAIN': return 'main';
    case 'NAV': return 'navigation';
    case 'ASIDE': return 'complementary';
    case 'SEARCH': return 'search';
    case 'HEADER':
      return element.parentElement?.closest(SECTIONING_ANCESTOR_SELECTOR) ? null : 'banner';
    case 'FOOTER':
      return element.parentElement?.closest(SECTIONING_ANCESTOR_SELECTOR) ? null : 'contentinfo';
    case 'SECTION':
      return accessibleNameDetails(element).name ? 'region' : null;
    case 'FORM':
      return accessibleNameDetails(element).name ? 'form' : null;
    default:
      return null;
  }
}

export function landmarkRoleForElement(element: Element): LandmarkRole | null {
  const explicit = explicitRole(element);
  if (explicit) return asLandmarkRole(explicit);
  return nativeLandmarkRole(element);
}

export function pageLandmarks(): Element[] {
  return scopedElements(document, LANDMARK_CANDIDATE_SELECTOR)
    .filter((element) => !isProgrammaticallyHidden(element) && landmarkRoleForElement(element) != null);
}

export function landmarkScopeOwner(element: Element): Element | Document {
  let current = element.parentElement;
  while (current) {
    const role = registeredExplicitAriaRole(current)?.name;
    if (role === 'document' || role === 'application') return current;
    current = current.parentElement;
  }
  return document;
}

export function nearestContainingLandmark(
  element: Element,
  includeSelf = false,
): { element: Element; role: LandmarkRole } | null {
  let current: Element | null = includeSelf ? element : element.parentElement;
  while (current) {
    const explicit = registeredExplicitAriaRole(current)?.name;
    if (explicit === 'document' || explicit === 'application') return null;
    const role = landmarkRoleForElement(current);
    if (role) return { element: current, role };
    current = current.parentElement;
  }
  return null;
}
