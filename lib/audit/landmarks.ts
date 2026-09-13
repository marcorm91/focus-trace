import { accessibleNameDetails, isProgrammaticallyHidden } from './dom';
import { scopedElements } from './scan-elements';
import { registeredExplicitAriaRole } from './standards-registry';

const ROLES = ['banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation', 'region', 'search'] as const;
export type LandmarkRole = (typeof ROLES)[number];

export function landmarkRoleForElement(element: Element): LandmarkRole | null {
  const explicit = element.hasAttribute('role') ? registeredExplicitAriaRole(element)?.name : undefined;
  if (explicit && (ROLES as readonly string[]).includes(explicit)) return explicit as LandmarkRole;
  const named = () => Boolean(accessibleNameDetails(element).name);
  switch (element.tagName) {
    case 'MAIN': return 'main';
    case 'NAV': return 'navigation';
    case 'ASIDE': return 'complementary';
    case 'SEARCH': return 'search';
    case 'HEADER': return element.parentElement?.closest('article,aside,main,nav,section') ? null : 'banner';
    case 'FOOTER': return element.parentElement?.closest('article,aside,main,nav,section') ? null : 'contentinfo';
    case 'SECTION': return named() ? 'region' : null;
    case 'FORM': return named() ? 'form' : null;
    default: return null;
  }
}

export function pageLandmarks(): Element[] {
  return scopedElements(document, 'header,footer,main,nav,aside,section,form,search,[role]')
    .filter((element) => !isProgrammaticallyHidden(element) && landmarkRoleForElement(element) != null);
}

function scopeRole(element: Element): string | undefined {
  return element.hasAttribute('role') ? registeredExplicitAriaRole(element)?.name : undefined;
}

export function landmarkScopeOwner(element: Element): Element | Document {
  for (let current = element.parentElement; current; current = current.parentElement) {
    const role = scopeRole(current);
    if (role === 'document' || role === 'application') return current;
  }
  return document;
}

export function containingLandmarkRole(element: Element, includeSelf = false): LandmarkRole | null {
  for (let current: Element | null = includeSelf ? element : element.parentElement; current; current = current.parentElement) {
    const explicit = scopeRole(current);
    if (explicit === 'document' || explicit === 'application') return null;
    const role = landmarkRoleForElement(current);
    if (role) return role;
  }
  return null;
}
