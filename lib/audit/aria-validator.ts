import ariaRegistryJson from '../../generated/aria-registry.json';
import {
  ariaRoleRecord,
  ariaRoleTokens,
  isAbstractAriaRole,
  registeredExplicitAriaRole,
  type AriaRoleRecord,
} from './standards-registry';

export type AriaValidationSignalKind =
  | 'invalid-role'
  | 'unknown-attribute'
  | 'invalid-value'
  | 'missing-required-property'
  | 'broken-reference'
  | 'required-parent'
  | 'allowed-child'
  | 'state-consistency';

export interface AriaValidationSignal {
  kind: AriaValidationSignalKind;
  element: Element;
  detail: string;
}

type ScanRoot = Document | Element;

const KNOWN_PROPERTIES = new Set(Object.keys(ariaRegistryJson.properties));
const TRANSPARENT_ROLES = new Set<string | null>([null, 'generic', 'none', 'presentation']);

const REQUIRED_PARENT = new Map<string, Set<string>>([
  ['caption', new Set(['figure', 'grid', 'radiogroup', 'table', 'treegrid'])],
  ['cell', new Set(['row'])],
  ['columnheader', new Set(['row'])],
  ['gridcell', new Set(['row'])],
  ['listitem', new Set(['list'])],
  ['row', new Set(['grid', 'rowgroup', 'table', 'treegrid'])],
  ['rowgroup', new Set(['grid', 'table', 'treegrid'])],
  ['rowheader', new Set(['row'])],
  ['tab', new Set(['tablist'])],
]);

const GROUPED_REQUIRED_PARENT = new Map<string, { direct: Set<string>; groupParent: Set<string> }>([
  ['menuitem', { direct: new Set(['menu', 'menubar']), groupParent: new Set(['menu', 'menubar']) }],
  ['menuitemcheckbox', { direct: new Set(['menu', 'menubar']), groupParent: new Set(['menu', 'menubar']) }],
  ['menuitemradio', { direct: new Set(['menu', 'menubar']), groupParent: new Set(['menu', 'menubar']) }],
  ['option', { direct: new Set(['listbox']), groupParent: new Set(['listbox']) }],
  ['treeitem', { direct: new Set(['tree']), groupParent: new Set(['treeitem']) }],
]);

const ALLOWED_CHILD = new Map<string, Set<string>>([
  ['grid', new Set(['caption', 'row', 'rowgroup'])],
  ['table', new Set(['caption', 'row', 'rowgroup'])],
  ['treegrid', new Set(['caption', 'row', 'rowgroup'])],
  ['rowgroup', new Set(['row'])],
  ['row', new Set(['cell', 'columnheader', 'gridcell', 'rowheader'])],
  ['list', new Set(['listitem'])],
  ['listbox', new Set(['group', 'option'])],
  ['menu', new Set(['group', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'separator'])],
  ['menubar', new Set(['group', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'separator'])],
  ['tablist', new Set(['tab'])],
  ['tree', new Set(['treeitem'])],
]);

const ID_REFERENCE_LIST_PROPERTIES = new Set([
  'aria-controls',
  'aria-describedby',
  'aria-details',
  'aria-errormessage',
  'aria-flowto',
  'aria-labelledby',
  'aria-owns',
]);

const BOOLEAN_PROPERTIES = new Set([
  'aria-atomic',
  'aria-busy',
  'aria-disabled',
  'aria-expanded',
  'aria-hidden',
  'aria-modal',
  'aria-multiline',
  'aria-multiselectable',
  'aria-readonly',
  'aria-required',
]);

const TRISTATE_PROPERTIES = new Set(['aria-checked', 'aria-pressed']);

const ENUM_PROPERTIES = new Map<string, Set<string>>([
  ['aria-autocomplete', new Set(['both', 'inline', 'list', 'none'])],
  ['aria-haspopup', new Set(['dialog', 'false', 'grid', 'listbox', 'menu', 'tree', 'true'])],
  ['aria-invalid', new Set(['false', 'grammar', 'spelling', 'true'])],
  ['aria-live', new Set(['assertive', 'off', 'polite'])],
  ['aria-orientation', new Set(['horizontal', 'undefined', 'vertical'])],
  ['aria-sort', new Set(['ascending', 'descending', 'none', 'other'])],
]);

const POSITIVE_INTEGER_PROPERTIES = new Set([
  'aria-colindex',
  'aria-colspan',
  'aria-level',
  'aria-posinset',
  'aria-rowindex',
  'aria-rowspan',
]);

const COUNT_PROPERTIES = new Set(['aria-colcount', 'aria-rowcount', 'aria-setsize']);
const NUMBER_PROPERTIES = new Set(['aria-valuemax', 'aria-valuemin', 'aria-valuenow']);

function scopedElements(root: ScanRoot): Element[] {
  const descendants = [...root.querySelectorAll('*')];
  return root instanceof Element ? [root, ...descendants] : descendants;
}

function tokens(value: string | null): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}

function strictInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function finiteNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function nativeRole(element: Element): string | null {
  if (element instanceof HTMLButtonElement) return 'button';
  if ((element instanceof HTMLAnchorElement || element instanceof HTMLAreaElement) && element.hasAttribute('href')) return 'link';
  if (element instanceof HTMLImageElement) return element.alt === '' ? 'presentation' : 'img';
  if (element instanceof HTMLSelectElement) return element.multiple || element.size > 1 ? 'listbox' : 'combobox';
  if (element instanceof HTMLOptionElement) return 'option';
  if (element instanceof HTMLTextAreaElement) return 'textbox';
  if (element instanceof HTMLProgressElement) return 'progressbar';
  if (element instanceof HTMLMeterElement) return 'meter';
  if (element instanceof HTMLInputElement) {
    switch (element.type.toLowerCase()) {
      case 'button':
      case 'submit':
      case 'reset':
      case 'image': return 'button';
      case 'checkbox': return 'checkbox';
      case 'radio': return 'radio';
      case 'range': return 'slider';
      case 'number': return 'spinbutton';
      case 'search': return 'searchbox';
      case 'hidden': return null;
      default: return 'textbox';
    }
  }

  switch (element.tagName.toLowerCase()) {
    case 'ul':
    case 'ol':
    case 'menu': return 'list';
    case 'li': return 'listitem';
    case 'table': return 'table';
    case 'caption': return 'caption';
    case 'thead':
    case 'tbody':
    case 'tfoot': return 'rowgroup';
    case 'tr': return 'row';
    case 'td': return 'cell';
    case 'th': return element.getAttribute('scope')?.toLowerCase().startsWith('row') ? 'rowheader' : 'columnheader';
    default: return null;
  }
}

export function resolvedExplicitAriaRole(element: Element): AriaRoleRecord | null {
  return registeredExplicitAriaRole(element);
}

export function effectiveAriaRole(element: Element): string | null {
  return registeredExplicitAriaRole(element)?.name ?? nativeRole(element);
}

function hasExplicitResolvedRole(element: Element): boolean {
  return registeredExplicitAriaRole(element) != null;
}

function propertyValueIsValid(property: string, raw: string): boolean {
  const value = raw.trim().toLowerCase();

  if (BOOLEAN_PROPERTIES.has(property)) return ['false', 'true', 'undefined'].includes(value);
  if (TRISTATE_PROPERTIES.has(property)) return ['false', 'mixed', 'true', 'undefined'].includes(value);
  if (ENUM_PROPERTIES.has(property)) return ENUM_PROPERTIES.get(property)!.has(value);
  if (NUMBER_PROPERTIES.has(property)) return finiteNumber(value) != null;

  if (POSITIVE_INTEGER_PROPERTIES.has(property)) {
    const parsed = strictInteger(value);
    return parsed != null && parsed >= 1;
  }

  if (COUNT_PROPERTIES.has(property)) {
    const parsed = strictInteger(value);
    return parsed === -1 || (parsed != null && parsed >= 1);
  }

  if (property === 'aria-relevant') {
    const relevant = tokens(value);
    return relevant.length > 0 && relevant.every((token) => ['additions', 'all', 'removals', 'text'].includes(token));
  }

  // aria-current deliberately accepts custom non-empty tokens: ARIA maps
  // unknown token values to true rather than making them invalid authoring.
  return true;
}

function hostProvidesRequiredProperty(element: Element, role: string, property: string): boolean {
  if (property === 'aria-checked') {
    return element instanceof HTMLInputElement
      && ['checkbox', 'radio'].includes(element.type.toLowerCase())
      && ['checkbox', 'radio'].includes(role);
  }

  if (property === 'aria-level') {
    return /^h[1-6]$/i.test(element.tagName);
  }

  if (property === 'aria-valuenow') {
    if (element instanceof HTMLInputElement) {
      return (role === 'slider' && element.type.toLowerCase() === 'range')
        || (role === 'spinbutton' && element.type.toLowerCase() === 'number');
    }
    return (role === 'meter' && element instanceof HTMLMeterElement)
      || (role === 'progressbar' && element instanceof HTMLProgressElement && element.hasAttribute('value'));
  }

  return false;
}

function idTargets(element: Element, property: string): Element[] {
  return tokens(element.getAttribute(property)).map((id) => document.getElementById(id)).filter((target): target is Element => target != null);
}

interface OwnershipModel {
  ownerFor: Map<Element, Element>;
  ownedBy: Map<Element, Element[]>;
  invalidOwners: Set<Element>;
  signals: AriaValidationSignal[];
}

function buildOwnershipModel(elements: Element[]): OwnershipModel {
  const claims = new Map<Element, Element[]>();
  const invalidOwners = new Set<Element>();
  const signals: AriaValidationSignal[] = [];

  for (const owner of elements.filter((element) => element.hasAttribute('aria-owns'))) {
    const ids = tokens(owner.getAttribute('aria-owns'));
    if (!ids.length) continue;
    for (const id of ids) {
      const target = document.getElementById(id);
      if (!target) continue;
      if (target === owner || target.contains(owner)) {
        invalidOwners.add(owner);
        signals.push({
          kind: 'broken-reference',
          element: owner,
          detail: `aria-owns references #${id}, which would create a self/ancestor ownership cycle.`,
        });
        continue;
      }
      const owners = claims.get(target) ?? [];
      owners.push(owner);
      claims.set(target, owners);
    }
  }

  const ownerFor = new Map<Element, Element>();
  const ownedBy = new Map<Element, Element[]>();
  for (const [target, owners] of claims) {
    if (owners.length !== 1) {
      for (const owner of owners) {
        invalidOwners.add(owner);
        signals.push({
          kind: 'broken-reference',
          element: owner,
          detail: `The element #${target.id || target.tagName.toLowerCase()} is claimed by ${owners.length} aria-owns owners; an accessibility element can have only one effective owner.`,
        });
      }
      continue;
    }
    const owner = owners[0]!;
    ownerFor.set(target, owner);
    const children = ownedBy.get(owner) ?? [];
    children.push(target);
    ownedBy.set(owner, children);
  }

  return { ownerFor, ownedBy, invalidOwners, signals };
}

function rawAccessibilityParent(element: Element, ownership: OwnershipModel): Element | null {
  return ownership.ownerFor.get(element) ?? element.parentElement;
}

function semanticAccessibilityParent(element: Element, ownership: OwnershipModel): Element | null {
  let parent = rawAccessibilityParent(element, ownership);
  const seen = new Set<Element>();
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    if (!TRANSPARENT_ROLES.has(effectiveAriaRole(parent))) return parent;
    parent = rawAccessibilityParent(parent, ownership);
  }
  return null;
}

function directAccessibilityChildren(owner: Element, ownership: OwnershipModel): Element[] {
  const result = [...owner.children];
  for (const owned of ownership.ownedBy.get(owner) ?? []) {
    if (!result.includes(owned)) result.push(owned);
  }
  return result.filter((child) => ownership.ownerFor.get(child) == null || ownership.ownerFor.get(child) === owner);
}

function semanticAccessibilityChildren(owner: Element, ownership: OwnershipModel): Element[] {
  const result: Element[] = [];
  const seen = new Set<Element>();

  const visit = (element: Element) => {
    if (seen.has(element)) return;
    seen.add(element);
    const role = effectiveAriaRole(element);
    if (!TRANSPARENT_ROLES.has(role)) {
      result.push(element);
      return;
    }
    for (const child of directAccessibilityChildren(element, ownership)) visit(child);
  };

  for (const child of directAccessibilityChildren(owner, ownership)) visit(child);
  return result;
}

function isAccessibilityDescendant(owner: Element, target: Element, ownership: OwnershipModel): boolean {
  if (owner === target) return false;
  let current: Element | null = target;
  const seen = new Set<Element>();
  while (current && !seen.has(current)) {
    seen.add(current);
    current = rawAccessibilityParent(current, ownership);
    if (current === owner) return true;
  }
  return false;
}

function requiredParentSatisfied(element: Element, role: string, ownership: OwnershipModel): boolean {
  const parent = semanticAccessibilityParent(element, ownership);
  if (!parent) return false;
  const parentRole = effectiveAriaRole(parent);

  const direct = REQUIRED_PARENT.get(role);
  if (direct) return parentRole != null && direct.has(parentRole);

  const grouped = GROUPED_REQUIRED_PARENT.get(role);
  if (!grouped) return true;
  if (parentRole != null && grouped.direct.has(parentRole)) return true;
  if (parentRole !== 'group') return false;

  const groupParent = semanticAccessibilityParent(parent, ownership);
  const groupParentRole = groupParent ? effectiveAriaRole(groupParent) : null;
  return groupParentRole != null && grouped.groupParent.has(groupParentRole);
}

function validateActiveDescendant(element: Element, ownership: OwnershipModel): AriaValidationSignal | null {
  if (!element.hasAttribute('aria-activedescendant')) return null;
  const ids = tokens(element.getAttribute('aria-activedescendant'));
  if (ids.length !== 1) {
    return {
      kind: 'broken-reference',
      element,
      detail: `aria-activedescendant must reference one element; received ${ids.length} ID tokens.`,
    };
  }

  const target = document.getElementById(ids[0]!);
  if (!target) {
    return {
      kind: 'broken-reference',
      element,
      detail: `aria-activedescendant references missing element #${ids[0]}.`,
    };
  }

  if (isAccessibilityDescendant(element, target, ownership)) return null;

  const role = effectiveAriaRole(element);
  if (role && ['combobox', 'searchbox', 'textbox'].includes(role)) {
    for (const controlled of idTargets(element, 'aria-controls')) {
      if (controlled === target || isAccessibilityDescendant(controlled, target, ownership)) return null;
    }
  }

  return {
    kind: 'broken-reference',
    element,
    detail: `aria-activedescendant references #${ids[0]}, but that element is not an accessibility descendant of the active-descendant owner${role && ['combobox', 'searchbox', 'textbox'].includes(role) ? ' or of an aria-controls target' : ''}.`,
  };
}

function stateConsistencySignals(element: Element): AriaValidationSignal[] {
  const signals: AriaValidationSignal[] = [];
  const min = element.hasAttribute('aria-valuemin') ? finiteNumber(element.getAttribute('aria-valuemin') ?? '') : null;
  const max = element.hasAttribute('aria-valuemax') ? finiteNumber(element.getAttribute('aria-valuemax') ?? '') : null;
  const now = element.hasAttribute('aria-valuenow') ? finiteNumber(element.getAttribute('aria-valuenow') ?? '') : null;

  if (min != null && max != null && min > max) {
    signals.push({
      kind: 'state-consistency',
      element,
      detail: `aria-valuemin=${min} is greater than aria-valuemax=${max}.`,
    });
  }
  if (now != null && min != null && now < min) {
    signals.push({
      kind: 'state-consistency',
      element,
      detail: `aria-valuenow=${now} is below aria-valuemin=${min}.`,
    });
  }
  if (now != null && max != null && now > max) {
    signals.push({
      kind: 'state-consistency',
      element,
      detail: `aria-valuenow=${now} is above aria-valuemax=${max}.`,
    });
  }

  const comparePosition = (indexProperty: string, countProperty: string) => {
    if (!element.hasAttribute(indexProperty) || !element.hasAttribute(countProperty)) return;
    const index = strictInteger(element.getAttribute(indexProperty) ?? '');
    const count = strictInteger(element.getAttribute(countProperty) ?? '');
    if (index == null || count == null || count === -1 || index <= count) return;
    signals.push({
      kind: 'state-consistency',
      element,
      detail: `${indexProperty}=${index} exceeds ${countProperty}=${count}.`,
    });
  };

  comparePosition('aria-posinset', 'aria-setsize');
  comparePosition('aria-colindex', 'aria-colcount');
  comparePosition('aria-rowindex', 'aria-rowcount');
  return signals;
}

export function evaluateAdvancedAria(root: ScanRoot): AriaValidationSignal[] {
  const elements = scopedElements(root);
  const signals: AriaValidationSignal[] = [];
  const ownership = buildOwnershipModel([...document.querySelectorAll('*')]);
  signals.push(...ownership.signals.filter((signal) => root instanceof Document || signal.element === root || root.contains(signal.element)));

  for (const element of elements) {
    if (element.hasAttribute('role')) {
      const roleTokens = ariaRoleTokens(element);
      const abstractTokens = roleTokens.filter((token) => isAbstractAriaRole(token));
      const resolved = registeredExplicitAriaRole(element);

      if (abstractTokens.length) {
        signals.push({
          kind: 'invalid-role',
          element,
          detail: `role contains abstract ARIA role token${abstractTokens.length > 1 ? 's' : ''}: ${abstractTokens.join(', ')}. Abstract roles are ontology concepts and must not be used by authors.`,
        });
      }
      if (!resolved) {
        const knownTokens = roleTokens.filter((token) => ariaRoleRecord(token) != null);
        signals.push({
          kind: 'invalid-role',
          element,
          detail: roleTokens.length
            ? `No non-abstract ARIA role can be resolved from role=${JSON.stringify(element.getAttribute('role'))}.${knownTokens.length ? ' The recognised token(s) are abstract.' : ' None of the tokens are registered ARIA roles.'}`
            : 'The role attribute is empty, so it does not resolve to an ARIA role.',
        });
      }
    }

    for (const attribute of element.getAttributeNames().map((name) => name.toLowerCase()).filter((name) => name.startsWith('aria-'))) {
      if (!KNOWN_PROPERTIES.has(attribute)) {
        signals.push({
          kind: 'unknown-attribute',
          element,
          detail: `${attribute} is not a state or property in the synced WAI-ARIA registry.`,
        });
        continue;
      }

      const raw = element.getAttribute(attribute) ?? '';
      if (!propertyValueIsValid(attribute, raw)) {
        signals.push({
          kind: 'invalid-value',
          element,
          detail: `${attribute}=${JSON.stringify(raw)} does not match the value grammar FocusTrace can verify for this ARIA state/property.`,
        });
      }

      if (ID_REFERENCE_LIST_PROPERTIES.has(attribute)) {
        const ids = tokens(raw);
        if (!ids.length) {
          signals.push({
            kind: 'broken-reference',
            element,
            detail: `${attribute} is present but does not contain any ID reference.`,
          });
        } else {
          const missing = ids.filter((id) => document.getElementById(id) == null);
          if (missing.length) {
            signals.push({
              kind: 'broken-reference',
              element,
              detail: `${attribute} references missing ID${missing.length > 1 ? 's' : ''}: ${missing.map((id) => `#${id}`).join(', ')}.`,
            });
          }
        }
      }
    }

    const role = registeredExplicitAriaRole(element);
    if (role) {
      for (const property of role.requiredProperties) {
        if (!element.hasAttribute(property) && !hostProvidesRequiredProperty(element, role.name, property)) {
          signals.push({
            kind: 'missing-required-property',
            element,
            detail: `role=${JSON.stringify(role.name)} requires ${property}, but the attribute is missing and no equivalent native host state was detected.`,
          });
        }
      }

      if ((REQUIRED_PARENT.has(role.name) || GROUPED_REQUIRED_PARENT.has(role.name)) && !requiredParentSatisfied(element, role.name, ownership)) {
        signals.push({
          kind: 'required-parent',
          element,
          detail: `role=${JSON.stringify(role.name)} is not inside the required accessibility parent context. Generic/presentation wrappers and valid aria-owns ownership were ignored while resolving the semantic parent.`,
        });
      }

      const allowed = ALLOWED_CHILD.get(role.name);
      if (allowed) {
        for (const child of semanticAccessibilityChildren(element, ownership)) {
          const childRole = effectiveAriaRole(child);
          if (!childRole || allowed.has(childRole)) continue;
          signals.push({
            kind: 'allowed-child',
            element: child,
            detail: `role=${JSON.stringify(role.name)} exposes accessibility child role=${JSON.stringify(childRole)}, which is outside the allowed child-role model for this container.`,
          });
        }
      }
    }

    const activeDescendant = validateActiveDescendant(element, ownership);
    if (activeDescendant) signals.push(activeDescendant);
    signals.push(...stateConsistencySignals(element));
  }

  return signals;
}
