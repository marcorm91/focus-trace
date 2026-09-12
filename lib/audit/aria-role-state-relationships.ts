import { accessibleName, isProgrammaticallyHidden } from './dom';
import { effectiveAriaRole, hasAccessibilityAncestorRole, resolvedExplicitAriaRole } from './aria-validator';
import { scopedElements, type ScanRoot } from './scan-elements';

export type AriaRoleStateRelationshipFamily =
  | 'hidden-body'
  | 'host-constraint'
  | 'description-equivalence';

export type AriaRoleStateRelationshipOutcome = 'pass' | 'fail' | 'warning' | 'review';

export interface AriaRoleStateRelationshipEvaluation {
  family: AriaRoleStateRelationshipFamily;
  outcome: AriaRoleStateRelationshipOutcome;
  element: Element;
  detail: string;
}

const BUTTON_ALLOWED_ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'gridcell',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'separator',
  'slider',
  'switch',
  'tab',
  'treeitem',
]);

const ROW_CONDITIONAL_PROPERTIES = [
  'aria-expanded',
  'aria-level',
  'aria-posinset',
  'aria-setsize',
] as const;

function explicitRoleName(element: Element): string | null {
  return resolvedExplicitAriaRole(element)?.name ?? null;
}

function hostRoleConstraint(element: Element): string | null {
  const role = explicitRoleName(element);
  if (!role) return null;
  const tag = element.tagName.toLowerCase();

  if (tag === 'body' && role !== 'generic') {
    return `ARIA in HTML permits no explicit body role other than generic; observed role=${JSON.stringify(role)}.`;
  }

  if ((tag === 'br' || tag === 'wbr') && role !== 'none' && role !== 'presentation') {
    return `ARIA in HTML permits only role=none or role=presentation on <${tag}>; observed role=${JSON.stringify(role)}.`;
  }

  if (tag === 'caption' && role !== 'caption') {
    return `ARIA in HTML does not permit <caption> to override its native caption role; observed role=${JSON.stringify(role)}.`;
  }

  if (tag === 'button') {
    const select = element.parentElement instanceof HTMLSelectElement ? element.parentElement : null;
    if (select?.firstElementChild === element) {
      return `A <button> that is the first child of <select> is inert in the ARIA in HTML conformance table and must not declare an explicit role; observed role=${JSON.stringify(role)}.`;
    }
    if (!BUTTON_ALLOWED_ROLES.has(role)) {
      return `ARIA in HTML does not allow role=${JSON.stringify(role)} on <button>.`;
    }
  }

  return null;
}

function nativeCheckedConstraint(element: Element): string | null {
  if (!(element instanceof HTMLInputElement) || !element.hasAttribute('aria-checked')) return null;
  const type = element.type.toLowerCase();
  if (type !== 'checkbox' && type !== 'radio') return null;
  return `<input type=${JSON.stringify(type)}> already exposes its checked state natively; aria-checked conflicts with the host-language state and must not be used as a competing source of truth.`;
}

function rowConditionalConstraint(element: Element): string | null {
  if (effectiveAriaRole(element) !== 'row' || hasAccessibilityAncestorRole(element, 'treegrid')) return null;
  const authored = ROW_CONDITIONAL_PROPERTIES.filter((property) => element.hasAttribute(property));
  if (!authored.length) return null;
  return `${authored.join(', ')} ${authored.length === 1 ? 'is' : 'are'} only conditionally applicable to role=row in a treegrid context; no treegrid DOM ancestor was observed.`;
}

function hostConstraintEvaluations(root: ScanRoot): AriaRoleStateRelationshipEvaluation[] {
  const candidates = scopedElements(
    root,
    '[role], input[aria-checked], [aria-expanded], [aria-level], [aria-posinset], [aria-setsize]',
  );
  const result: AriaRoleStateRelationshipEvaluation[] = [];

  for (const element of candidates) {
    const details = [
      hostRoleConstraint(element),
      nativeCheckedConstraint(element),
      rowConditionalConstraint(element),
    ].filter((detail): detail is string => Boolean(detail));

    if (details.length) {
      result.push({
        family: 'host-constraint',
        outcome: 'warning',
        element,
        detail: details.join(' '),
      });
    }
  }
  return result;
}

function descriptionEvaluations(root: ScanRoot): AriaRoleStateRelationshipEvaluation[] {
  const candidates = scopedElements(root, '[aria-braillelabel], [aria-brailleroledescription], [aria-roledescription]');
  const result: AriaRoleStateRelationshipEvaluation[] = [];

  for (const element of candidates) {
    if (isProgrammaticallyHidden(element)) continue;
    const detail: string[] = [];
    const brailleLabel = element.getAttribute('aria-braillelabel');
    const brailleRole = element.getAttribute('aria-brailleroledescription');
    const roleDescription = element.getAttribute('aria-roledescription');

    if (brailleLabel != null) {
      if (!brailleLabel.trim()) {
        detail.push('aria-braillelabel is empty or whitespace-only.');
      } else if (!accessibleName(element).trim()) {
        detail.push('aria-braillelabel is authored but no non-braille accessible name is observable.');
      }
    }

    if (brailleRole != null) {
      if (!brailleRole.trim()) detail.push('aria-brailleroledescription is empty or whitespace-only.');
      if (!roleDescription?.trim()) {
        detail.push('aria-brailleroledescription is authored without a non-empty aria-roledescription equivalent.');
      }
    }

    if (roleDescription != null) {
      if (!roleDescription.trim()) detail.push('aria-roledescription is empty or whitespace-only.');
      if (!effectiveAriaRole(element)) {
        detail.push('aria-roledescription is authored on an element with no resolved implicit or explicit ARIA role.');
      }
    }

    if (detail.length) {
      result.push({
        family: 'description-equivalence',
        outcome: 'review',
        element,
        detail: detail.join(' '),
      });
    } else {
      result.push({
        family: 'description-equivalence',
        outcome: 'pass',
        element,
        detail: 'Braille/custom role-description authoring has the observable non-braille semantic counterpart required by this bounded check.',
      });
    }
  }
  return result;
}

function hiddenBodyEvaluations(root: ScanRoot): AriaRoleStateRelationshipEvaluation[] {
  if (!(root instanceof Document) || !root.body) return [];
  const hidden = root.body.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true';
  return [{
    family: 'hidden-body',
    outcome: hidden ? 'fail' : 'pass',
    element: root.body,
    detail: hidden
      ? 'The document body declares aria-hidden="true". ARIA in HTML explicitly prohibits hiding body from the accessibility tree.'
      : 'The document body does not declare aria-hidden="true".',
  }];
}

export function evaluateAriaRoleStateRelationships(root: ScanRoot): AriaRoleStateRelationshipEvaluation[] {
  return [
    ...hiddenBodyEvaluations(root),
    ...hostConstraintEvaluations(root),
    ...descriptionEvaluations(root),
  ];
}
