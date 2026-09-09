import { isProgrammaticallyHidden } from './dom';

type ScanRoot = Document | Element;

export interface AccessibleAuthenticationEvaluation {
  element: HTMLInputElement;
  blocker: Element;
  purpose: 'username' | 'current-password' | 'one-time-code';
  detail: string;
}

const AUTHENTICATION_PURPOSES = new Set(['username', 'current-password', 'one-time-code']);
const BLOCKING_PASTE_HANDLER = /(?:return\s*(?:\(\s*)?false\b|preventDefault\s*\()/i;

function autocompleteTokens(element: HTMLInputElement): string[] {
  return (element.getAttribute('autocomplete') ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function authenticationPurpose(element: HTMLInputElement): AccessibleAuthenticationEvaluation['purpose'] | undefined {
  const tokens = autocompleteTokens(element);
  if (tokens.includes('new-password')) return undefined;

  for (const token of tokens) {
    if (AUTHENTICATION_PURPOSES.has(token)) {
      return token as AccessibleAuthenticationEvaluation['purpose'];
    }
  }
  return undefined;
}

function formHasAuthenticationCredential(element: HTMLInputElement): boolean {
  const form = element.form;
  if (!form) return false;

  for (const candidate of form.querySelectorAll('input')) {
    if (!(candidate instanceof HTMLInputElement) || candidate === element) continue;
    const purpose = authenticationPurpose(candidate);
    if (purpose === 'current-password' || purpose === 'one-time-code') return true;
  }
  return false;
}

function isAuthenticationField(element: HTMLInputElement, purpose: AccessibleAuthenticationEvaluation['purpose']): boolean {
  if (element.disabled || element.readOnly || element.type === 'hidden') return false;
  if (isProgrammaticallyHidden(element)) return false;

  if (purpose === 'current-password' || purpose === 'one-time-code') return true;
  return purpose === 'username' && formHasAuthenticationCredential(element);
}

function pasteBlockingAncestor(element: HTMLInputElement): Element | undefined {
  let current: Element | null = element;
  const form = element.form;

  while (current) {
    const handler = current.getAttribute('onpaste');
    if (handler && BLOCKING_PASTE_HANDLER.test(handler)) return current;
    if (current === form || current === document.documentElement) break;
    current = current.parentElement;
  }
  return undefined;
}

function inputsWithin(root: ScanRoot): HTMLInputElement[] {
  const inputs: HTMLInputElement[] = [];
  if (root instanceof HTMLInputElement) inputs.push(root);
  for (const element of root.querySelectorAll('input')) {
    if (element instanceof HTMLInputElement) inputs.push(element);
  }
  return inputs;
}

export function evaluateAccessibleAuthentication(root: ScanRoot): AccessibleAuthenticationEvaluation[] {
  const evaluations: AccessibleAuthenticationEvaluation[] = [];

  for (const element of inputsWithin(root)) {
    const purpose = authenticationPurpose(element);
    if (!purpose || !isAuthenticationField(element, purpose)) continue;

    const blocker = pasteBlockingAncestor(element);
    if (!blocker) continue;

    const handler = blocker.getAttribute('onpaste')?.replace(/\s+/g, ' ').trim().slice(0, 180) ?? '';
    const blockerLabel = blocker === element
      ? 'authentication input'
      : blocker === element.form
        ? 'containing form'
        : `<${blocker.tagName.toLowerCase()}> ancestor`;

    evaluations.push({
      element,
      blocker,
      purpose,
      detail: `autocomplete purpose=${purpose}; explicit inline onpaste blocker found on ${blockerLabel}: ${JSON.stringify(handler)}. FocusTrace did not inspect or retain the field value.`,
    });
  }

  return evaluations;
}
