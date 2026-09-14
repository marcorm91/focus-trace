import { accessibleNameDetails, isDisabledUiComponent, isProgrammaticallyHidden } from './dom';
import { scopedElements, type ScanRoot } from './scan-elements';

export type FormAuditSignalKind =
  | 'multiple-labels'
  | 'title-only'
  | 'unnamed-group'
  | 'constraint-instructions'
  | 'required-state';

export interface FormAuditEvaluation {
  element: Element;
  kind: FormAuditSignalKind;
  detail: string;
}

const CONTROL_SELECTOR = [
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="spinbutton"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="slider"]',
  '[role="listbox"]',
].join(',');

const CONSTRAINT_ATTRIBUTES = ['pattern', 'min', 'max', 'step', 'minlength', 'maxlength'] as const;
const REQUIRED_WORD = /\b(?:required|mandatory|obligatori[oa]s?)\b/i;

function isEligibleControl(element: Element): boolean {
  return !isDisabledUiComponent(element) && !isProgrammaticallyHidden(element);
}

function nativeLabels(element: Element): HTMLLabelElement[] {
  if (
    element instanceof HTMLInputElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLTextAreaElement
  ) {
    return element.labels ? [...element.labels] : [];
  }
  return [];
}

function referencedNonEmptyText(element: Element, attribute: 'aria-labelledby' | 'aria-describedby' | 'aria-details'): boolean {
  const ids = element.getAttribute(attribute)?.trim().split(/\s+/).filter(Boolean) ?? [];
  const ownerDocument = element.ownerDocument;
  return ids.some((id) => Boolean(ownerDocument.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim()));
}

function associatedLabelText(element: Element): string {
  const ownerDocument = element.ownerDocument;
  const pieces = nativeLabels(element).map((label) => label.textContent ?? '');
  const labelledBy = element.getAttribute('aria-labelledby')?.trim().split(/\s+/).filter(Boolean) ?? [];
  for (const id of labelledBy) pieces.push(ownerDocument.getElementById(id)?.textContent ?? '');
  return pieces.join(' ').replace(/\s+/g, ' ').trim();
}

function hasProgrammaticRequiredState(element: Element): boolean {
  return element.hasAttribute('required') || element.getAttribute('aria-required')?.trim().toLowerCase() === 'true';
}

function hasConstraintMetadata(element: Element): boolean {
  return CONSTRAINT_ATTRIBUTES.some((attribute) => element.hasAttribute(attribute));
}

function hasInstructionRelationship(element: Element): boolean {
  return referencedNonEmptyText(element, 'aria-describedby') || referencedNonEmptyText(element, 'aria-details');
}

function controlsWithin(group: Element): Element[] {
  return [...group.querySelectorAll(CONTROL_SELECTOR)].filter(isEligibleControl);
}

function hasGroupName(group: Element): boolean {
  if (group instanceof HTMLFieldSetElement) {
    const legend = [...group.children].find((child) => child instanceof HTMLLegendElement);
    if (legend?.textContent?.replace(/\s+/g, ' ').trim()) return true;
  }

  if (group.getAttribute('aria-label')?.trim()) return true;
  return referencedNonEmptyText(group, 'aria-labelledby');
}

export function evaluateFormAudit(root: ScanRoot): FormAuditEvaluation[] {
  const evaluations: FormAuditEvaluation[] = [];
  const controls = scopedElements<Element>(root, CONTROL_SELECTOR).filter(isEligibleControl);

  for (const element of controls) {
    const labels = nativeLabels(element);
    if (labels.length > 1) {
      evaluations.push({
        element,
        kind: 'multiple-labels',
        detail: `The native control has ${labels.length} associated label elements. Review whether one clear label would better expose the field purpose and avoid repeated or conflicting announcements.`,
      });
    }

    const nameDetails = accessibleNameDetails(element);
    if (nameDetails.source === 'title') {
      evaluations.push({
        element,
        kind: 'title-only',
        detail: 'The control is named only by its title attribute. Review whether a persistent visible label or equivalent robust labeling mechanism is available.',
      });
    }

    if (hasConstraintMetadata(element) && !hasInstructionRelationship(element)) {
      evaluations.push({
        element,
        kind: 'constraint-instructions',
        detail: `The control exposes constraint metadata (${CONSTRAINT_ATTRIBUTES.filter((attribute) => element.hasAttribute(attribute)).join(', ')}) but no non-empty aria-describedby or aria-details relationship was resolved. Review whether any instructions users need before input are programmatically associated.`,
      });
    }

    const labelText = associatedLabelText(element);
    if (labelText && REQUIRED_WORD.test(labelText) && !hasProgrammaticRequiredState(element)) {
      evaluations.push({
        element,
        kind: 'required-state',
        detail: 'Associated labeling indicates that the field is required, but neither native required nor aria-required="true" is exposed. Review whether the required state is programmatically determinable.',
      });
    }
  }

  const groups = scopedElements<Element>(root, 'fieldset, [role="group"], [role="radiogroup"]');
  for (const group of groups) {
    if (isProgrammaticallyHidden(group)) continue;
    const members = controlsWithin(group);
    if (members.length < 2 || hasGroupName(group)) continue;
    evaluations.push({
      element: group,
      kind: 'unnamed-group',
      detail: `The exposed form group contains ${members.length} eligible controls but no non-empty legend, aria-label or resolved aria-labelledby name. Review whether the controls need a shared group label.`,
    });
  }

  return evaluations;
}
