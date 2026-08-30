import { semanticRole } from '../audit/dom';

function ids(value: string | null): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}

export function ariaOwnedElements(owner: Element): Element[] {
  return ids(owner.getAttribute('aria-owns'))
    .map((id) => document.getElementById(id))
    .filter((element): element is HTMLElement => element != null);
}

export function accessibilityOwns(owner: Element, candidate: Element): boolean {
  const visited = new Set<Element>();

  const visit = (current: Element): boolean => {
    if (visited.has(current)) return false;
    visited.add(current);

    if (current === candidate || current.contains(candidate)) return true;

    const logicalOwners = [current, ...current.querySelectorAll('[aria-owns]')];
    for (const logicalOwner of logicalOwners) {
      for (const owned of ariaOwnedElements(logicalOwner)) {
        if (owned === candidate || owned.contains(candidate)) return true;
        if (visit(owned)) return true;
      }
    }

    return false;
  };

  return visit(owner);
}

export function ownedRoleElements(owner: Element, roles: string[]): Element[] {
  if (!roles.length) return [];
  const result = new Set<Element>();
  const visitedOwners = new Set<Element>();

  const collect = (current: Element) => {
    if (visitedOwners.has(current)) return;
    visitedOwners.add(current);

    if (roles.includes(semanticRole(current) ?? '')) result.add(current);
    current.querySelectorAll('[role]').forEach((element) => {
      if (roles.includes(semanticRole(element) ?? '')) result.add(element);
    });

    const logicalOwners = [current, ...current.querySelectorAll('[aria-owns]')];
    for (const logicalOwner of logicalOwners) {
      for (const owned of ariaOwnedElements(logicalOwner)) collect(owned);
    }
  };

  collect(owner);
  return [...result].filter((candidate) => accessibilityOwns(owner, candidate));
}
