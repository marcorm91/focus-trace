import {
  isDisabledUiComponent,
  isProgrammaticallyHidden,
  isSequentiallyFocusable,
  semanticRole,
} from './dom';
import { scopedElements } from './scan-elements';

export type AutocompletePurposeControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export interface AutocompletePurposeEvaluation {
  element: AutocompletePurposeControl;
  value: string;
  outcome: 'pass' | 'review';
  reason?: string;
}

const ASCII_WHITESPACE = /[\t\n\f\r ]+/;
const FIXED_INPUT_TYPES = new Set(['button', 'checkbox', 'file', 'image', 'radio', 'reset', 'submit']);
const CONTACT_HINTS = new Set(['home', 'work', 'mobile', 'fax', 'pager']);
const MODE_HINTS = new Set(['shipping', 'billing']);
const NORMAL_FIELDS = new Set([
  'name',
  'honorific-prefix',
  'given-name',
  'additional-name',
  'family-name',
  'honorific-suffix',
  'nickname',
  'organization-title',
  'username',
  'new-password',
  'current-password',
  'one-time-code',
  'organization',
  'street-address',
  'address-line1',
  'address-line2',
  'address-line3',
  'address-level4',
  'address-level3',
  'address-level2',
  'address-level1',
  'country',
  'country-name',
  'postal-code',
  'cc-name',
  'cc-given-name',
  'cc-additional-name',
  'cc-family-name',
  'cc-number',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-csc',
  'cc-type',
  'transaction-currency',
  'transaction-amount',
  'language',
  'bday',
  'bday-day',
  'bday-month',
  'bday-year',
  'sex',
  'url',
  'photo',
]);
const CONTACT_FIELDS = new Set([
  'tel',
  'tel-country-code',
  'tel-national',
  'tel-area-code',
  'tel-local',
  'tel-local-prefix',
  'tel-local-suffix',
  'tel-extension',
  'email',
  'impp',
]);
const WIDGET_ROLES = new Set([
  'checkbox',
  'combobox',
  'listbox',
  'menuitemcheckbox',
  'menuitemradio',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'textbox',
]);

function trimAsciiWhitespace(value: string): string {
  return value.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
}

function autocompleteTokens(value: string): string[] {
  return trimAsciiWhitespace(value)
    .split(ASCII_WHITESPACE)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function isApplicableControl(element: AutocompletePurposeControl, value: string): boolean {
  const normalized = trimAsciiWhitespace(value);
  if (!normalized) return false;

  const tokens = autocompleteTokens(value);
  if (tokens.length === 1 && (tokens[0] === 'on' || tokens[0] === 'off')) return false;
  if (isDisabledUiComponent(element)) return false;
  if (element instanceof HTMLInputElement && FIXED_INPUT_TYPES.has(element.type.toLowerCase())) return false;
  if (isProgrammaticallyHidden(element)) return false;

  const role = semanticRole(element);
  if (!isSequentiallyFocusable(element) && (!role || !WIDGET_ROLES.has(role))) return false;

  return true;
}

function usesStandardAutocompleteSyntax(tokens: string[]): boolean {
  return tokens.some((token) =>
    NORMAL_FIELDS.has(token)
    || CONTACT_FIELDS.has(token)
    || CONTACT_HINTS.has(token)
    || MODE_HINTS.has(token)
    || token === 'webauthn'
    || token.startsWith('section-'));
}

function parseStandardAutocomplete(tokens: string[]): { valid: true } | { valid: false; reason: string } {
  let index = 0;

  if (tokens[index]?.startsWith('section-')) index += 1;
  if (MODE_HINTS.has(tokens[index] ?? '')) index += 1;

  const contactHint = CONTACT_HINTS.has(tokens[index] ?? '') ? tokens[index] : undefined;
  if (contactHint) index += 1;

  const field = tokens[index];
  if (!field) return { valid: false, reason: 'The token list does not contain a required autocomplete field name.' };

  const isNormalField = NORMAL_FIELDS.has(field);
  const isContactField = CONTACT_FIELDS.has(field);
  if (!isNormalField && !isContactField) {
    return { valid: false, reason: `The required autocomplete field token ${JSON.stringify(field)} is not recognized by the standard token grammar.` };
  }

  if (contactHint && !isContactField) {
    return { valid: false, reason: `The contact hint ${JSON.stringify(contactHint)} is only valid before email, impp or telephone autocomplete fields.` };
  }

  index += 1;
  if (tokens[index] === 'webauthn') index += 1;

  if (index !== tokens.length) {
    return { valid: false, reason: `Unexpected autocomplete token ${JSON.stringify(tokens[index])} appears after the allowed token sequence.` };
  }

  return { valid: true };
}

export function evaluateAutocompletePurpose(root: Document | Element = document): AutocompletePurposeEvaluation[] {
  const controls = scopedElements(root, 'input[autocomplete], select[autocomplete], textarea[autocomplete]');

  const results: AutocompletePurposeEvaluation[] = [];
  for (const candidate of controls) {
    if (!(candidate instanceof HTMLInputElement || candidate instanceof HTMLSelectElement || candidate instanceof HTMLTextAreaElement)) continue;

    const value = candidate.getAttribute('autocomplete') ?? '';
    if (!isApplicableControl(candidate, value)) continue;

    const tokens = autocompleteTokens(value);
    if (!usesStandardAutocompleteSyntax(tokens)) {
      // ACT 73f2c2 explicitly notes that custom taxonomies can satisfy the
      // criterion even when they do not match the HTML autocomplete vocabulary.
      // FocusTrace therefore does not manufacture a finding from unknown-only values.
      continue;
    }

    const parsed = parseStandardAutocomplete(tokens);
    if (parsed.valid) {
      results.push({ element: candidate, value, outcome: 'pass' });
      continue;
    }

    results.push({
      element: candidate,
      value,
      outcome: 'review',
      reason: parsed.reason,
    });
  }

  return results;
}
