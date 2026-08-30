import ariaRegistryJson from '../../generated/aria-registry.json';
import { isProgrammaticallyHidden } from './dom';
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
  | 'state-consistency'
  | 'unsupported-property'
  | 'relationship-consistency';

export interface AriaValidationSignal {
  kind: AriaValidationSignalKind;
  element: Element;
  detail: string;
}

type ScanRoot = Document | Element;

type OwnershipModel = {
  ownerFor: Map<Element, Element>;
  ownedBy: Map<Element, Element[]>;
  signals: AriaValidationSignal[];
};

const KNOWN_PROPERTIES = new Set(Object.keys(ariaRegistryJson.properties));
const TRANSPARENT_ROLES = new Set<string | null>([null, 'generic', 'none', 'presentation']);

const REQUIRED_PARENT: Record<string, string[]> = {
  caption: ['figure', 'grid', 'radiogroup', 'table', 'treegrid'],
  cell: ['row'],
  columnheader: ['row'],
  gridcell: ['row'],
  listitem: ['list'],
  row: ['grid', 'rowgroup', 'table', 'treegrid'],
  rowgroup: ['grid', 'table', 'treegrid'],
  rowheader: ['row'],
  tab: ['tablist'],
};

const GROUPED_PARENT: Record<string, { direct: string[]; throughGroup: string[] }> = {
  menuitem: { direct: ['menu', 'menubar'], throughGroup: ['menu', 'menubar'] },
  menuitemcheckbox: { direct: ['menu', 'menubar'], throughGroup: ['menu', 'menubar'] },
  menuitemradio: { direct: ['menu', 'menubar'], throughGroup: ['menu', 'menubar'] },
  option: { direct: ['listbox'], throughGroup: ['listbox'] },
  treeitem: { direct: ['tree'], throughGroup: ['treeitem'] },
};

const ALLOWED_CHILD: Record<string, string[]> = {
  grid: ['caption', 'row', 'rowgroup'],
  table: ['caption', 'row', 'rowgroup'],
  treegrid: ['caption', 'row', 'rowgroup'],
  rowgroup: ['row'],
  row: ['cell', 'columnheader', 'gridcell', 'rowheader'],
  list: ['listitem'],
  listbox: ['group', 'option'],
  menu: ['group', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'separator'],
  menubar: ['group', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'separator'],
  tablist: ['tab'],
  tree: ['treeitem'],
};

const IDREF_LIST = new Set([
  'aria-controls', 'aria-describedby', 'aria-details', 'aria-errormessage',
  'aria-flowto', 'aria-labelledby', 'aria-owns',
]);

const TRUE_FALSE = new Set([
  'aria-atomic', 'aria-busy', 'aria-disabled', 'aria-modal', 'aria-multiline',
  'aria-multiselectable', 'aria-readonly', 'aria-required',
]);
const TRUE_FALSE_UNDEFINED = new Set(['aria-expanded', 'aria-hidden', 'aria-selected']);
const TRISTATE = new Set(['aria-checked', 'aria-pressed']);
const ENUMS: Record<string, string[]> = {
  'aria-autocomplete': ['both', 'inline', 'list', 'none'],
  'aria-haspopup': ['dialog', 'false', 'grid', 'listbox', 'menu', 'tree', 'true'],
  'aria-invalid': ['false', 'grammar', 'spelling', 'true'],
  'aria-live': ['assertive', 'off', 'polite'],
  'aria-orientation': ['horizontal', 'undefined', 'vertical'],
  'aria-sort': ['ascending', 'descending', 'none', 'other'],
};
const POSITIVE_INTEGER = new Set([
  'aria-colindex', 'aria-colspan', 'aria-level', 'aria-posinset', 'aria-rowindex',
]);
const COUNT = new Set(['aria-colcount', 'aria-rowcount', 'aria-setsize']);
const NUMBER = new Set(['aria-valuemax', 'aria-valuemin', 'aria-valuenow']);

function scopedElements(root: ScanRoot): Element[] {
  const descendants = [...root.querySelectorAll('*')];
  return root instanceof Element ? [root, ...descendants] : descendants;
}

function tokens(value: string | null): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}

function integer(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function number(value: string): number | null {
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
  if (typeof HTMLDialogElement !== 'undefined' && element instanceof HTMLDialogElement) return 'dialog';
  if (typeof HTMLOutputElement !== 'undefined' && element instanceof HTMLOutputElement) return 'status';
  if (element instanceof HTMLInputElement) {
    const inputRoles: Record<string, string | null> = {
      button: 'button', submit: 'button', reset: 'button', image: 'button',
      checkbox: 'checkbox', radio: 'radio', range: 'slider', number: 'spinbutton',
      search: 'searchbox', hidden: null,
    };
    return element.type.toLowerCase() in inputRoles ? inputRoles[element.type.toLowerCase()]! : 'textbox';
  }

  const tag = element.tagName.toLowerCase();
  const tagRoles: Record<string, string> = {
    ul: 'list', ol: 'list', menu: 'list', li: 'listitem', table: 'table', caption: 'caption',
    thead: 'rowgroup', tbody: 'rowgroup', tfoot: 'rowgroup', tr: 'row', td: 'cell',
    main: 'main', nav: 'navigation', aside: 'complementary', figure: 'figure', summary: 'button',
  };
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'th') {
    return element.getAttribute('scope')?.toLowerCase().startsWith('row') ? 'rowheader' : 'columnheader';
  }
  return tagRoles[tag] ?? null;
}

function effectiveRoleRecord(element: Element): AriaRoleRecord | null {
  const explicit = registeredExplicitAriaRole(element);
  if (explicit) return explicit;
  const role = nativeRole(element);
  if (!role || role === 'presentation' || role === 'none') return null;
  return ariaRoleRecord(role) ?? null;
}

export function resolvedExplicitAriaRole(element: Element): AriaRoleRecord | null {
  return registeredExplicitAriaRole(element);
}

export function effectiveAriaRole(element: Element): string | null {
  return registeredExplicitAriaRole(element)?.name ?? nativeRole(element);
}

function validPropertyValue(property: string, raw: string): boolean {
  const value = raw.trim().toLowerCase();
  if (TRUE_FALSE.has(property)) return ['false', 'true'].includes(value);
  if (TRUE_FALSE_UNDEFINED.has(property)) return ['false', 'true', 'undefined'].includes(value);
  if (TRISTATE.has(property)) return ['false', 'mixed', 'true', 'undefined'].includes(value);
  if (ENUMS[property]) return ENUMS[property].includes(value);
  if (NUMBER.has(property)) return number(value) != null;
  if (POSITIVE_INTEGER.has(property)) return (integer(value) ?? 0) >= 1;
  if (property === 'aria-rowspan') return (integer(value) ?? -1) >= 0;
  if (COUNT.has(property)) {
    const parsed = integer(value);
    return parsed === -1 || (parsed != null && parsed >= 1);
  }
  if (property === 'aria-relevant') {
    const values = tokens(value);
    return values.length > 0 && values.every((token) => ['additions', 'all', 'removals', 'text'].includes(token));
  }
  // Unknown aria-current tokens intentionally map to true in WAI-ARIA.
  return true;
}

function nativeRequiredState(element: Element, role: string, property: string): boolean {
  if (property === 'aria-checked') {
    return element instanceof HTMLInputElement
      && ['checkbox', 'radio'].includes(element.type.toLowerCase())
      && ['checkbox', 'radio'].includes(role);
  }
  if (property === 'aria-level') return /^h[1-6]$/i.test(element.tagName);
  if (property !== 'aria-valuenow') return false;
  if (element instanceof HTMLInputElement) {
    return (role === 'slider' && element.type.toLowerCase() === 'range')
      || (role === 'spinbutton' && element.type.toLowerCase() === 'number');
  }
  return (role === 'meter' && element instanceof HTMLMeterElement)
    || (role === 'progressbar' && element instanceof HTMLProgressElement && element.hasAttribute('value'));
}

function idTargets(element: Element, property: string): Element[] {
  return tokens(element.getAttribute(property))
    .map((id) => document.getElementById(id))
    .filter((target): target is HTMLElement => target != null);
}

function buildOwnershipModel(): OwnershipModel {
  const claims = new Map<Element, Element[]>();
  const signals: AriaValidationSignal[] = [];

  for (const owner of document.querySelectorAll('[aria-owns]')) {
    for (const id of tokens(owner.getAttribute('aria-owns'))) {
      const target = document.getElementById(id);
      if (!target) continue;
      if (target === owner || target.contains(owner)) {
        signals.push({ kind: 'broken-reference', element: owner, detail: `aria-owns references #${id}, which would create a self/ancestor ownership cycle.` });
        continue;
      }
      claims.set(target, [...(claims.get(target) ?? []), owner]);
    }
  }

  const ownerFor = new Map<Element, Element>();
  const ownedBy = new Map<Element, Element[]>();
  for (const [target, owners] of claims) {
    if (owners.length > 1) {
      for (const owner of owners) {
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
    ownedBy.set(owner, [...(ownedBy.get(owner) ?? []), target]);
  }
  return { ownerFor, ownedBy, signals };
}

function rawParent(element: Element, model: OwnershipModel): Element | null {
  return model.ownerFor.get(element) ?? element.parentElement;
}

function semanticParent(element: Element, model: OwnershipModel): Element | null {
  let parent = rawParent(element, model);
  const seen = new Set<Element>();
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    if (!TRANSPARENT_ROLES.has(effectiveAriaRole(parent))) return parent;
    parent = rawParent(parent, model);
  }
  return null;
}

function directChildren(owner: Element, model: OwnershipModel): Element[] {
  const children = [...owner.children, ...(model.ownedBy.get(owner) ?? [])];
  return [...new Set(children)].filter((child) => {
    const effectiveOwner = model.ownerFor.get(child);
    return effectiveOwner == null || effectiveOwner === owner;
  });
}

function semanticChildren(owner: Element, model: OwnershipModel): Element[] {
  const found: Element[] = [];
  const seen = new Set<Element>();
  const visit = (element: Element) => {
    if (seen.has(element)) return;
    seen.add(element);
    if (!TRANSPARENT_ROLES.has(effectiveAriaRole(element))) {
      found.push(element);
      return;
    }
    directChildren(element, model).forEach(visit);
  };
  directChildren(owner, model).forEach(visit);
  return found;
}

function accessibilityDescendant(owner: Element, target: Element, model: OwnershipModel): boolean {
  let current: Element | null = target;
  const seen = new Set<Element>();
  while (current && !seen.has(current)) {
    seen.add(current);
    current = rawParent(current, model);
    if (current === owner) return true;
  }
  return false;
}

function hasRequiredParent(element: Element, role: string, model: OwnershipModel): boolean {
  const parent = semanticParent(element, model);
  if (!parent) return false;
  const parentRole = effectiveAriaRole(parent);
  const direct = REQUIRED_PARENT[role];
  if (direct) return parentRole != null && direct.includes(parentRole);

  const grouped = GROUPED_PARENT[role];
  if (!grouped) return true;
  if (parentRole != null && grouped.direct.includes(parentRole)) return true;
  if (parentRole !== 'group') return false;
  const groupParent = semanticParent(parent, model);
  const groupParentRole = groupParent ? effectiveAriaRole(groupParent) : null;
  return groupParentRole != null && grouped.throughGroup.includes(groupParentRole);
}

function activeDescendantSignal(element: Element, model: OwnershipModel): AriaValidationSignal | null {
  if (!element.hasAttribute('aria-activedescendant')) return null;
  const ids = tokens(element.getAttribute('aria-activedescendant'));
  if (ids.length !== 1) {
    return { kind: 'broken-reference', element, detail: `aria-activedescendant must reference one element; received ${ids.length} ID tokens.` };
  }
  const target = document.getElementById(ids[0]!);
  if (!target) return { kind: 'broken-reference', element, detail: `aria-activedescendant references missing element #${ids[0]}.` };
  if (accessibilityDescendant(element, target, model)) return null;

  const role = effectiveAriaRole(element);
  if (role && ['combobox', 'searchbox', 'textbox'].includes(role)) {
    for (const controlled of idTargets(element, 'aria-controls')) {
      if (controlled === target || accessibilityDescendant(controlled, target, model)) return null;
    }
  }
  return {
    kind: 'broken-reference',
    element,
    detail: `aria-activedescendant references #${ids[0]}, but that element is not an accessibility descendant${role && ['combobox', 'searchbox', 'textbox'].includes(role) ? ' of the owner or an aria-controls target' : ' of the owner'}.`,
  };
}

function consistencySignals(element: Element): AriaValidationSignal[] {
  const result: AriaValidationSignal[] = [];
  const min = element.hasAttribute('aria-valuemin') ? number(element.getAttribute('aria-valuemin') ?? '') : null;
  const max = element.hasAttribute('aria-valuemax') ? number(element.getAttribute('aria-valuemax') ?? '') : null;
  const now = element.hasAttribute('aria-valuenow') ? number(element.getAttribute('aria-valuenow') ?? '') : null;

  if (min != null && max != null && min > max) result.push({ kind: 'state-consistency', element, detail: `aria-valuemin=${min} is greater than aria-valuemax=${max}.` });
  if (now != null && min != null && now < min) result.push({ kind: 'state-consistency', element, detail: `aria-valuenow=${now} is below aria-valuemin=${min}.` });
  if (now != null && max != null && now > max) result.push({ kind: 'state-consistency', element, detail: `aria-valuenow=${now} is above aria-valuemax=${max}.` });

  for (const [indexName, countName] of [
    ['aria-posinset', 'aria-setsize'],
    ['aria-colindex', 'aria-colcount'],
    ['aria-rowindex', 'aria-rowcount'],
  ] as const) {
    if (!element.hasAttribute(indexName) || !element.hasAttribute(countName)) continue;
    const index = integer(element.getAttribute(indexName) ?? '');
    const count = integer(element.getAttribute(countName) ?? '');
    if (index != null && count != null && count !== -1 && index > count) {
      result.push({ kind: 'state-consistency', element, detail: `${indexName}=${index} exceeds ${countName}=${count}.` });
    }
  }
  return result;
}

function relationshipConsistencySignals(element: Element): AriaValidationSignal[] {
  const result: AriaValidationSignal[] = [];

  if (element.hasAttribute('aria-errormessage')) {
    const invalid = element.getAttribute('aria-invalid')?.trim().toLowerCase();
    const errorTargets = idTargets(element, 'aria-errormessage');
    if (!element.hasAttribute('aria-invalid')) {
      result.push({
        kind: 'relationship-consistency',
        element,
        detail: 'aria-errormessage is present without aria-invalid. WAI-ARIA requires authors to use aria-invalid in conjunction with aria-errormessage.',
      });
    } else if (errorTargets.length && invalid === 'false') {
      const visible = errorTargets.filter((target) => !isProgrammaticallyHidden(target));
      if (visible.length) {
        result.push({
          kind: 'relationship-consistency',
          element,
          detail: `aria-invalid="false" marks the value as valid, but aria-errormessage still references visible error content: ${visible.map((target) => `#${target.id || target.tagName.toLowerCase()}`).join(', ')}. Hide the non-pertinent message from all users or remove the relationship.`,
        });
      }
    } else if (errorTargets.length && ['true', 'grammar', 'spelling'].includes(invalid ?? '')) {
      const hidden = errorTargets.filter((target) => isProgrammaticallyHidden(target));
      if (hidden.length) {
        result.push({
          kind: 'relationship-consistency',
          element,
          detail: `aria-invalid=${JSON.stringify(invalid)} makes aria-errormessage pertinent, but referenced error content is hidden from users: ${hidden.map((target) => `#${target.id || target.tagName.toLowerCase()}`).join(', ')}.`,
        });
      }
    }
  }

  const expanded = element.getAttribute('aria-expanded')?.trim().toLowerCase();
  if ((expanded === 'true' || expanded === 'false') && element.hasAttribute('aria-controls')) {
    const controlled = idTargets(element, 'aria-controls');
    if (controlled.length) {
      const available = controlled.map((target) => !isProgrammaticallyHidden(target));
      const mismatch = expanded === 'true'
        ? available.every((value) => !value)
        : available.some(Boolean);
      if (mismatch) {
        result.push({
          kind: 'relationship-consistency',
          element,
          detail: `aria-expanded="${expanded}" contradicts the current availability of controlled content (${controlled.map((target) => `#${target.id || target.tagName.toLowerCase()}`).join(', ')}).`,
        });
      }
    }
  }

  return result;
}

function unsupportedPropertySignal(
  element: Element,
  property: string,
  role: AriaRoleRecord | null,
  explicitRole: AriaRoleRecord | null,
): AriaValidationSignal | null {
  if (!role || role.supportedProperties.includes(property)) return null;
  // Explicit prohibited properties are already reported by the synced
  // authoring-signal pass, so do not duplicate that finding here.
  if (explicitRole?.disallowedProperties.includes(property)) return null;
  return {
    kind: 'unsupported-property',
    element,
    detail: `${property} is a known WAI-ARIA state/property, but role=${JSON.stringify(role.name)} does not list it as supported or inherited in the synced ARIA role model.`,
  };
}

export function evaluateAdvancedAria(root: ScanRoot): AriaValidationSignal[] {
  const elements = scopedElements(root);
  const result: AriaValidationSignal[] = [];
  const ownership = buildOwnershipModel();
  result.push(...ownership.signals.filter(({ element }) => root instanceof Document || element === root || root.contains(element)));

  for (const element of elements) {
    const explicitRole = registeredExplicitAriaRole(element);
    const roleForProperties = effectiveRoleRecord(element);

    if (element.hasAttribute('role')) {
      const roleTokens = ariaRoleTokens(element);
      const abstract = roleTokens.filter(isAbstractAriaRole);
      if (abstract.length) {
        result.push({ kind: 'invalid-role', element, detail: `role contains abstract ARIA role token${abstract.length > 1 ? 's' : ''}: ${abstract.join(', ')}. Abstract roles must not be used by authors.` });
      }
      if (!explicitRole) {
        const recognised = roleTokens.filter((token) => ariaRoleRecord(token) != null);
        result.push({
          kind: 'invalid-role',
          element,
          detail: roleTokens.length
            ? `No non-abstract ARIA role can be resolved from role=${JSON.stringify(element.getAttribute('role'))}.${recognised.length ? ' The recognised token(s) are abstract.' : ' None of the tokens are registered ARIA roles.'}`
            : 'The role attribute is empty, so it does not resolve to an ARIA role.',
        });
      }
    }

    for (const property of element.getAttributeNames().map((name) => name.toLowerCase()).filter((name) => name.startsWith('aria-'))) {
      if (!KNOWN_PROPERTIES.has(property)) {
        result.push({ kind: 'unknown-attribute', element, detail: `${property} is not a state or property in the synced WAI-ARIA registry.` });
        continue;
      }
      const raw = element.getAttribute(property) ?? '';
      if (!validPropertyValue(property, raw)) {
        result.push({ kind: 'invalid-value', element, detail: `${property}=${JSON.stringify(raw)} does not match the deterministic WAI-ARIA value grammar checked by FocusTrace.` });
      }
      const unsupported = unsupportedPropertySignal(element, property, roleForProperties, explicitRole);
      if (unsupported) result.push(unsupported);
      if (IDREF_LIST.has(property)) {
        const ids = tokens(raw);
        if (!ids.length) result.push({ kind: 'broken-reference', element, detail: `${property} is present but does not contain any ID reference.` });
        else {
          const missing = ids.filter((id) => document.getElementById(id) == null);
          if (missing.length) result.push({ kind: 'broken-reference', element, detail: `${property} references missing ID${missing.length > 1 ? 's' : ''}: ${missing.map((id) => `#${id}`).join(', ')}.` });
        }
      }
    }

    if (explicitRole) {
      for (const property of explicitRole.requiredProperties) {
        if (!element.hasAttribute(property) && !nativeRequiredState(element, explicitRole.name, property)) {
          result.push({ kind: 'missing-required-property', element, detail: `role=${JSON.stringify(explicitRole.name)} requires ${property}, but the attribute is missing and no equivalent native host state was detected.` });
        }
      }

      if ((REQUIRED_PARENT[explicitRole.name] || GROUPED_PARENT[explicitRole.name]) && !hasRequiredParent(element, explicitRole.name, ownership)) {
        result.push({ kind: 'required-parent', element, detail: `role=${JSON.stringify(explicitRole.name)} is not inside its required accessibility-parent context after transparent wrappers and valid aria-owns ownership are resolved.` });
      }

      const allowed = ALLOWED_CHILD[explicitRole.name];
      if (allowed) {
        for (const child of semanticChildren(element, ownership)) {
          const childRole = effectiveAriaRole(child);
          if (childRole && !allowed.includes(childRole)) {
            result.push({ kind: 'allowed-child', element: child, detail: `role=${JSON.stringify(explicitRole.name)} exposes accessibility child role=${JSON.stringify(childRole)}, which is outside its allowed child-role model.` });
          }
        }
      }
    }

    const active = activeDescendantSignal(element, ownership);
    if (active) result.push(active);
    result.push(...consistencySignals(element));
    result.push(...relationshipConsistencySignals(element));
  }
  return result;
}
