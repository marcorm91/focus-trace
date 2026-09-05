import ariaRegistryJson from '../../generated/aria-registry.json';
import languageRegistryJson from '../../generated/language-subtags.json';

export interface AriaRoleRecord {
  name: string;
  parentRoles: string[];
  deprecated: boolean;
  deprecatedVersion: string | null;
  supportedProperties: string[];
  requiredProperties: string[];
  disallowedProperties: string[];
  deprecatedProperties: string[];
}

const ABSTRACT_ARIA_ROLES = new Set([
  'command',
  'composite',
  'input',
  'landmark',
  'range',
  'roletype',
  'section',
  'sectionhead',
  'select',
  'structure',
  'widget',
  'window',
]);

const ariaRoles = new Map(
  (ariaRegistryJson.roles as AriaRoleRecord[]).map((role) => [role.name, role] as const),
);
const knownPrimaryLanguageSubtags = new Set(languageRegistryJson.subtags as string[]);

export interface PageLanguageStatus {
  applicable: boolean;
  value: string;
  primary: string;
  present: boolean;
  knownPrimary: boolean;
}

export type AriaAuthoringSignal =
  | { kind: 'deprecated-role'; element: Element; role: AriaRoleRecord }
  | { kind: 'deprecated-property'; element: Element; role: AriaRoleRecord; property: string }
  | { kind: 'prohibited-property'; element: Element; role: AriaRoleRecord; property: string };

export function pageLanguageStatus(): PageLanguageStatus {
  const root = document.documentElement;
  const applicable =
    root?.namespaceURI === 'http://www.w3.org/1999/xhtml' &&
    root?.localName === 'html' &&
    document.contentType.toLowerCase() === 'text/html' &&
    window.top === window;
  const value = root?.getAttribute('lang') ?? '';
  const trimmed = value.trim();
  const primary = trimmed.split('-')[0]?.toLowerCase() ?? '';
  return {
    applicable,
    value,
    primary,
    present: trimmed.length > 0,
    knownPrimary: /^[a-z0-9]+$/i.test(primary) && knownPrimaryLanguageSubtags.has(primary),
  };
}

export function ariaRoleTokens(element: Element): string[] {
  const value = element.getAttribute('role');
  if (value == null) return [];
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function ariaRoleRecord(name: string): AriaRoleRecord | undefined {
  return ariaRoles.get(name.trim().toLowerCase());
}

export function isAbstractAriaRole(name: string): boolean {
  return ABSTRACT_ARIA_ROLES.has(name.trim().toLowerCase());
}

/**
 * Resolves role tokens using ARIA fallback semantics: the first recognised,
 * non-abstract role wins. Unknown tokens may intentionally precede a fallback
 * role for forward compatibility, while abstract roles are never valid author
 * roles and therefore cannot become the computed role.
 */
export function registeredExplicitAriaRole(element: Element): AriaRoleRecord | null {
  for (const token of ariaRoleTokens(element)) {
    const role = ariaRoles.get(token);
    if (role && !isAbstractAriaRole(token)) return role;
  }
  return null;
}

export function evaluateAriaAuthoringSignals(): AriaAuthoringSignal[] {
  const signals: AriaAuthoringSignal[] = [];
  for (const element of document.querySelectorAll('[role]')) {
    const role = registeredExplicitAriaRole(element);
    if (!role) continue;

    if (role.deprecated) signals.push({ kind: 'deprecated-role', element, role });

    const attributes = new Set(
      element.getAttributeNames().map((name) => name.toLowerCase()).filter((name) => name.startsWith('aria-')),
    );
    for (const property of role.deprecatedProperties) {
      if (attributes.has(property)) signals.push({ kind: 'deprecated-property', element, role, property });
    }
    for (const property of role.disallowedProperties) {
      if (attributes.has(property)) signals.push({ kind: 'prohibited-property', element, role, property });
    }
  }
  return signals;
}
