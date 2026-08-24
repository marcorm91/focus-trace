import { RULES, type RuleDefinition } from '../../shared/rule-catalog';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { accessibleName, accessibleNameDetails, isMarkedDecorative, isProgrammaticallyHidden, isSequentiallyFocusable, selectorFor, semanticRole } from './dom';

interface RuleExecution { issues: ScanIssue[]; review: ScanIssue[]; passes: number }
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function finding(rule: RuleDefinition, outcome: 'fail' | 'review', target: Element | string, description: string, evidence?: string): ScanIssue {
  return { id: uid(), ruleId: rule.id, title: rule.title, description, severity: rule.severity, outcome, targets: [typeof target === 'string' ? target : selectorFor(target)], ...(evidence ? { evidence } : {}), references: rule.references };
}

function runPageTitle(): RuleExecution {
  const result: RuleExecution = { issues: [], review: [], passes: 0 };
  const titles = [...document.documentElement.querySelectorAll('title')].filter((title) => title.namespaceURI === 'http://www.w3.org/1999/xhtml');
  const first = titles[0];
  if (!first || !first.textContent?.trim()) result.issues.push(finding(RULES.pageTitle, 'fail', 'html', 'The first HTML <title> is missing or contains only whitespace.', `document.title = ${JSON.stringify(document.title)}`));
  else result.passes += 1;
  return result;
}

function runImages(): RuleExecution {
  const result: RuleExecution = { issues: [], review: [], passes: 0 };
  for (const element of [...document.querySelectorAll('img, [role="img"]')]) {
    if (isProgrammaticallyHidden(element)) continue;
    if (isMarkedDecorative(element) || accessibleName(element)) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.imageName, 'fail', element, 'The image is exposed as image content but has an empty accessible name and is not marked decorative.', element instanceof HTMLImageElement && !element.hasAttribute('alt') ? 'The <img> element has no alt attribute and no alternative naming mechanism was detected.' : 'No non-empty accessible name was detected.'));
  }
  return result;
}

function runButtons(): RuleExecution {
  const result: RuleExecution = { issues: [], review: [], passes: 0 };
  for (const element of [...document.querySelectorAll('button, input, [role]')]) {
    if (element instanceof HTMLInputElement && element.type.toLowerCase() === 'image') continue;
    if (semanticRole(element) !== 'button' || isProgrammaticallyHidden(element)) continue;
    if (accessibleName(element)) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.buttonName, 'fail', element, 'The button is exposed to assistive technology with an empty accessible name.', 'No aria-labelledby, aria-label, native label/value, relevant text content or title was detected.'));
  }
  return result;
}

const FORM_FIELD_ROLES = new Set(['checkbox', 'combobox', 'listbox', 'menuitemcheckbox', 'menuitemradio', 'radio', 'searchbox', 'slider', 'spinbutton', 'switch', 'textbox']);
function runFormFields(): RuleExecution {
  const result: RuleExecution = { issues: [], review: [], passes: 0 };
  for (const element of [...document.querySelectorAll('input, select, textarea, [role]')]) {
    const role = semanticRole(element);
    if (!role || !FORM_FIELD_ROLES.has(role) || isProgrammaticallyHidden(element)) continue;
    if (accessibleName(element)) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.formFieldName, 'fail', element, 'The form field has an empty accessible name.', 'No programmatic label or other non-empty accessible naming mechanism was detected.'));
  }
  return result;
}

function runPlaceholderOnlyLabels(): RuleExecution {
  const result: RuleExecution = { issues: [], review: [], passes: 0 };

  for (const element of [...document.querySelectorAll('input, textarea')]) {
    if (isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDetails(element);
    if (name.source !== 'placeholder' && name.source !== 'aria-placeholder') continue;

    result.review.push(finding(
      RULES.placeholderOnlyLabel,
      'review',
      element,
      'The control has a programmatically computed name, but that name comes only from placeholder text. Review whether a persistent visible label or instruction identifies the field for all users.',
      `Accessible name ${JSON.stringify(name.name)} is sourced from ${name.source}.`,
    ));
  }

  if (!result.review.length) result.passes += 1;
  return result;
}

function runLinks(): RuleExecution {
  const result: RuleExecution = { issues: [], review: [], passes: 0 };
  for (const element of [...document.querySelectorAll('a, area, [role]')]) {
    if (semanticRole(element) !== 'link' || isProgrammaticallyHidden(element)) continue;
    if (accessibleName(element)) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.linkName, 'fail', element, 'The link has an empty accessible name, so its purpose cannot be programmatically determined from its name.', 'No non-empty accessible name was detected.'));
  }
  return result;
}

function runAriaHiddenFocusable(): RuleExecution {
  const result: RuleExecution = { issues: [], review: [], passes: 0 };
  const containers = [...document.querySelectorAll('[aria-hidden]')].filter((element) => element.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true');
  for (const container of containers) {
    const focusable = [container, ...container.querySelectorAll('*')].find((element) => isSequentiallyFocusable(element));
    if (!focusable) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.ariaHiddenFocusable, 'fail', focusable, 'An element hidden from assistive technologies remains in sequential keyboard focus navigation.', `Focusable element is inside ${selectorFor(container)} with aria-hidden="true".`));
  }
  return result;
}

function runPositiveTabindex(): RuleExecution {
  const result: RuleExecution = { issues: [], review: [], passes: 0 };
  for (const element of [...document.querySelectorAll('[tabindex]')]) {
    const value = Number.parseInt(element.getAttribute('tabindex') ?? '', 10);
    if (!Number.isFinite(value) || value <= 0 || isProgrammaticallyHidden(element)) continue;
    result.review.push(finding(RULES.positiveTabindex, 'review', element, 'A positive tabindex changes the natural sequential focus order. Review whether the resulting order preserves meaning and operability.', `tabindex="${value}"`));
  }
  if (!result.review.length) result.passes += 1;
  return result;
}

function runHeadingJumps(): RuleExecution {
  const result: RuleExecution = { issues: [], review: [], passes: 0 };
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((heading) => !isProgrammaticallyHidden(heading));
  for (let index = 1; index < headings.length; index += 1) {
    const previousHeading = headings[index - 1]; const currentHeading = headings[index];
    if (!previousHeading || !currentHeading) continue;
    const previous = Number(previousHeading.tagName.slice(1)); const current = Number(currentHeading.tagName.slice(1));
    if (current <= previous + 1) continue;
    result.review.push(finding(RULES.headingJump, 'review', currentHeading, 'A skipped heading level is not automatically a WCAG failure, but it can indicate that structure or relationships need manual review.', `${previousHeading.tagName} → ${currentHeading.tagName}`));
  }
  if (!result.review.length) result.passes += 1;
  return result;
}

export function runFocusTraceScan(): ScanResult {
  const executions = [runPageTitle(), runImages(), runButtons(), runFormFields(), runPlaceholderOnlyLabels(), runLinks(), runAriaHiddenFocusable(), runPositiveTabindex(), runHeadingJumps()];
  return { engine: 'FocusTrace Rules', standard: 'WCAG 2.2', url: location.href, title: document.title, scannedAt: Date.now(), issues: executions.flatMap((execution) => execution.issues), review: executions.flatMap((execution) => execution.review), passes: executions.reduce((sum, execution) => sum + execution.passes, 0), rulesRun: executions.length };
}
