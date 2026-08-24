import ariaRegistryJson from '../../generated/aria-registry.json';
import languageRegistryJson from '../../generated/language-subtags.json';

interface AriaRoleRecord {
  name: string;
  parentRoles: string[];
  deprecated: boolean;
  deprecatedVersion: string | null;
  supportedProperties: string[];
  requiredProperties: string[];
  disallowedProperties: string[];
  deprecatedProperties: string[];
}

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

export function registeredExplicitAriaRole(element: Element): AriaRoleRecord | null {
  const roleValue = element.getAttribute('role');
  if (!roleValue) return null;
  for (const token of roleValue.trim().toLowerCase().split(/\s+/)) {
    const role = ariaRoles.get(token);
    if (role) return role;
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
