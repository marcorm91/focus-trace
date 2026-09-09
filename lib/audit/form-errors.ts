import { scopedElements, type ScanRoot } from './scan-elements';

export type FormErrorOutcome = 'pass' | 'review';

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement;

export interface ErrorIdentificationEvaluation {
  element: FormControl;
  outcome: FormErrorOutcome;
  invalidSignal: string;
  descriptionSignals: string[];
  detail: string;
}

export interface ErrorSuggestionEvaluation {
  element: FormControl;
  outcome: 'review';
  invalidSignal: string;
  descriptionSignals: string[];
  constraintSignals: string[];
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
].join(',');

function isDisabled(element: Element): boolean {
  if (element.getAttribute('aria-disabled') === 'true') return true;
  return 'disabled' in element && Boolean((element as HTMLInputElement).disabled);
}

function isRendered(element: Element): boolean {
  if (element.hasAttribute('hidden')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse';
}

function userInvalid(element: Element): boolean {
  try {
    return element.matches(':user-invalid');
  } catch {
    return false;
  }
}

function invalidSignal(element: FormControl): string | undefined {
  const ariaInvalid = element.getAttribute('aria-invalid')?.trim().toLowerCase();
  if (ariaInvalid && ariaInvalid !== 'false') return `aria-invalid=${JSON.stringify(ariaInvalid)}`;
  if (userInvalid(element)) return ':user-invalid';
  return undefined;
}

function referencedText(element: Element, attribute: 'aria-errormessage' | 'aria-describedby'): string[] {
  const values: string[] = [];
  const ids = element.getAttribute(attribute)?.trim().split(/\s+/).filter(Boolean) ?? [];
  for (const id of ids) {
    const target = document.getElementById(id);
    const text = target?.textContent?.replace(/\s+/g, ' ').trim();
    if (text) values.push(`${attribute} -> #${id}: ${JSON.stringify(text.slice(0, 180))}`);
  }
  return values;
}

function descriptionSignals(element: Element): string[] {
  return [
    ...referencedText(element, 'aria-errormessage'),
    ...referencedText(element, 'aria-describedby'),
  ];
}

function constraintSignals(element: FormControl): string[] {
  const signals: string[] = [];
  if (element.hasAttribute('required') || element.getAttribute('aria-required') === 'true') signals.push('required');

  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    if (['email', 'url', 'number', 'date', 'datetime-local', 'month', 'time', 'week'].includes(type)) {
      signals.push(`type=${JSON.stringify(type)}`);
    }
  }

  for (const attribute of ['pattern', 'min', 'max', 'step', 'minlength', 'maxlength'] as const) {
    const value = element.getAttribute(attribute)?.trim();
    if (value) signals.push(`${attribute}=${JSON.stringify(value)}`);
  }
  return signals;
}

function applicableControls(root: ScanRoot): FormControl[] {
  return scopedElements<FormControl>(root, CONTROL_SELECTOR)
    .filter((element) => !isDisabled(element) && isRendered(element));
}

export function evaluateErrorIdentification(root: ScanRoot): ErrorIdentificationEvaluation[] {
  const evaluations: ErrorIdentificationEvaluation[] = [];

  for (const element of applicableControls(root)) {
    const signal = invalidSignal(element);
    if (!signal) continue;
    const descriptions = descriptionSignals(element);
    const outcome: FormErrorOutcome = descriptions.length ? 'pass' : 'review';
    evaluations.push({
      element,
      outcome,
      invalidSignal: signal,
      descriptionSignals: descriptions,
      detail: descriptions.length
        ? `Observed invalid state: ${signal}. Associated text error candidate(s): ${descriptions.join('; ')}. FocusTrace does not verify that the text fully describes the detected input error.`
        : `Observed invalid state: ${signal}. No non-empty aria-errormessage or aria-describedby text reference was found. Review visible/application-level error text and whether the automatically detected error is identified and described before treating this as a WCAG failure.`,
    });
  }

  return evaluations;
}

export function evaluateErrorSuggestions(root: ScanRoot): ErrorSuggestionEvaluation[] {
  const evaluations: ErrorSuggestionEvaluation[] = [];

  for (const element of applicableControls(root)) {
    const signal = invalidSignal(element);
    if (!signal) continue;
    const descriptions = descriptionSignals(element);
    if (!descriptions.length) continue;
    const constraints = constraintSignals(element);
    if (!constraints.length) continue;

    evaluations.push({
      element,
      outcome: 'review',
      invalidSignal: signal,
      descriptionSignals: descriptions,
      constraintSignals: constraints,
      detail: `Observed invalid state: ${signal}. Associated error text exists and the control exposes correction-relevant constraint signal(s): ${constraints.join(', ')}. Review whether the message provides a useful correction suggestion when known, while considering the WCAG security/purpose exception.`,
    });
  }

  return evaluations;
}
