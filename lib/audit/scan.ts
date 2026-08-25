import { RULES, type RuleDefinition } from '../../shared/rule-catalog';
import type { FindingOutcome, HeadingSnapshot, ScanIssue, ScanResult } from '../../shared/types';
import { accessibleNameDetails, accessibleNameDiagnostics, isMarkedDecorative, isProgrammaticallyHidden, isSequentiallyFocusable, selectorFor, semanticRole } from './dom';
import { evaluateLabelInName } from './label-in-name';
import { evaluateAriaAuthoringSignals, pageLanguageStatus, type AriaAuthoringSignal } from './standards-registry';

interface RuleExecution { issues: ScanIssue[]; review: ScanIssue[]; warnings: ScanIssue[]; passes: number }
const emptyExecution = (): RuleExecution => ({ issues: [], review: [], warnings: [], passes: 0 });
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function finding(rule: RuleDefinition, outcome: FindingOutcome, target: Element | string, description: string, evidence?: string, accessibleName?: ScanIssue['accessibleName']): ScanIssue {
  return { id: uid(), ruleId: rule.id, title: rule.title, description, severity: rule.severity, outcome, targets: [typeof target === 'string' ? target : selectorFor(target)], ...(evidence ? { evidence } : {}), ...(accessibleName ? { accessibleName } : {}), references: rule.references };
}

function runPageTitle(): RuleExecution {
  const result = emptyExecution();
  const titles = [...document.documentElement.querySelectorAll('title')].filter((title) => title.namespaceURI === 'http://www.w3.org/1999/xhtml');
  const first = titles[0];
  if (!first || !first.textContent?.trim()) result.issues.push(finding(RULES.pageTitle, 'fail', 'html', 'The first HTML <title> is missing or contains only whitespace.', `document.title = ${JSON.stringify(document.title)}`));
  else result.passes += 1;
  return result;
}

function runPageLangPresent(): RuleExecution {
  const result = emptyExecution();
  const status = pageLanguageStatus();
  if (!status.applicable) return result;
  if (status.present) result.passes += 1;
  else result.issues.push(finding(RULES.pageLangPresent, 'fail', 'html', 'The root HTML element does not have a non-empty lang attribute.', `lang = ${JSON.stringify(status.value)}`));
  return result;
}

function runPageLangKnown(): RuleExecution {
  const result = emptyExecution();
  const status = pageLanguageStatus();
  if (!status.applicable || !status.present) return result;
  if (status.knownPrimary) result.passes += 1;
  else result.issues.push(finding(RULES.pageLangKnown, 'fail', 'html', 'The page lang value does not start with a primary language subtag registered by IANA as Type: language.', `lang = ${JSON.stringify(status.value)}; primary subtag = ${JSON.stringify(status.primary)}`));
  return result;
}

function runImages(): RuleExecution {
  const result = emptyExecution();
  for (const element of [...document.querySelectorAll('img, [role="img"]')]) {
    if (isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDiagnostics(element);
    if (isMarkedDecorative(element) || name.name) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.imageName, 'fail', element, 'The image is exposed as image content but has an empty accessible name and is not marked decorative.', element instanceof HTMLImageElement && !element.hasAttribute('alt') ? 'The <img> element has no alt attribute and no alternative naming mechanism was detected.' : 'No non-empty accessible name was detected.', name));
  }
  return result;
}

function runButtons(): RuleExecution {
  const result = emptyExecution();
  for (const element of [...document.querySelectorAll('button, input, [role]')]) {
    if (element instanceof HTMLInputElement && element.type.toLowerCase() === 'image') continue;
    if (semanticRole(element) !== 'button' || isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDiagnostics(element);
    if (name.name) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.buttonName, 'fail', element, 'The button is exposed to assistive technology with an empty accessible name.', 'The accessible-name computation returned an empty string.', name));
  }
  return result;
}

const FORM_FIELD_ROLES = new Set(['checkbox', 'combobox', 'listbox', 'menuitemcheckbox', 'menuitemradio', 'radio', 'searchbox', 'slider', 'spinbutton', 'switch', 'textbox']);
function runFormFields(): RuleExecution {
  const result = emptyExecution();
  for (const element of [...document.querySelectorAll('input, select, textarea, [role]')]) {
    const role = semanticRole(element);
    if (!role || !FORM_FIELD_ROLES.has(role) || isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDiagnostics(element);
    if (name.name) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.formFieldName, 'fail', element, 'The form field has an empty accessible name.', 'The accessible-name computation returned an empty string.', name));
  }
  return result;
}

function runPlaceholderOnlyLabels(): RuleExecution {
  const result = emptyExecution();
  for (const element of [...document.querySelectorAll('input, textarea')]) {
    if (isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDetails(element);
    if (name.source !== 'placeholder' && name.source !== 'aria-placeholder') continue;
    result.review.push(finding(RULES.placeholderOnlyLabel, 'review', element, 'The control has a programmatically computed name, but that name comes only from placeholder text. Review whether a persistent visible label or instruction identifies the field for all users.', `Accessible name ${JSON.stringify(name.name)} is sourced from ${name.source}.`));
  }
  if (!result.review.length) result.passes += 1;
  return result;
}

function runLinks(): RuleExecution {
  const result = emptyExecution();
  for (const element of [...document.querySelectorAll('a, area, [role]')]) {
    if (semanticRole(element) !== 'link' || isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDiagnostics(element);
    if (name.name) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.linkName, 'fail', element, 'The link has an empty accessible name, so its purpose cannot be programmatically determined from its name.', 'The accessible-name computation returned an empty string.', name));
  }
  return result;
}

function runLabelInName(): RuleExecution {
  const result = emptyExecution();
  for (const evaluation of evaluateLabelInName()) {
    if (evaluation.outcome === 'pass') continue;

    const evidence = `Visible label ${JSON.stringify(evaluation.visibleLabel)} is not contained in accessible name ${JSON.stringify(evaluation.accessibleName)}.${evaluation.reason ? ` ${evaluation.reason}` : ''}`;
    if (evaluation.outcome === 'warning') {
      result.warnings.push(finding(RULES.labelInName, 'warning', evaluation.element, 'The control has visible text that is not fully contained in the accessible name, but the mismatch looks ambiguous and needs manual review.', evidence));
      continue;
    }

    result.issues.push(finding(RULES.labelInName, 'fail', evaluation.element, 'The control has visible text, but that visible label is not contained in the accessible name used by assistive technology and speech input.', evidence));
  }
  if (!result.issues.length && !result.warnings.length) result.passes += 1;
  return result;
}

function runAriaHiddenFocusable(): RuleExecution {
  const result = emptyExecution();
  const containers = [...document.querySelectorAll('[aria-hidden]')].filter((element) => element.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true');
  for (const container of containers) {
    const focusable = [container, ...container.querySelectorAll('*')].find((element) => isSequentiallyFocusable(element));
    if (!focusable) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.ariaHiddenFocusable, 'fail', focusable, 'An element hidden from assistive technologies remains in sequential keyboard focus navigation.', `Focusable element is inside ${selectorFor(container)} with aria-hidden="true".`));
  }
  return result;
}

function ariaWarningExecutions(signals: AriaAuthoringSignal[]): RuleExecution[] {
  const deprecatedRoles = emptyExecution();
  const deprecatedProperties = emptyExecution();
  const prohibitedProperties = emptyExecution();

  for (const signal of signals) {
    if (signal.kind === 'deprecated-role') {
      deprecatedRoles.warnings.push(finding(RULES.deprecatedAriaRole, 'warning', signal.element, 'This explicit ARIA role is marked deprecated in the current WAI-ARIA registry. Prefer the replacement or native host-language semantics where possible.', `role=${JSON.stringify(signal.role.name)}${signal.role.deprecatedVersion ? `; deprecated since ARIA ${signal.role.deprecatedVersion}` : ''}`));
    } else if (signal.kind === 'deprecated-property') {
      deprecatedProperties.warnings.push(finding(RULES.deprecatedAriaProperty, 'warning', signal.element, 'This ARIA state/property is marked deprecated for the resolved explicit role in the current WAI-ARIA registry.', `${signal.property} on role=${JSON.stringify(signal.role.name)}`));
    } else {
      prohibitedProperties.warnings.push(finding(RULES.prohibitedAriaProperty, 'warning', signal.element, 'This ARIA state/property is listed as prohibited for the resolved explicit role in the current WAI-ARIA registry. Review the authoring semantics.', `${signal.property} on role=${JSON.stringify(signal.role.name)}`));
    }
  }

  if (!deprecatedRoles.warnings.length) deprecatedRoles.passes += 1;
  if (!deprecatedProperties.warnings.length) deprecatedProperties.passes += 1;
  if (!prohibitedProperties.warnings.length) prohibitedProperties.passes += 1;
  return [deprecatedRoles, deprecatedProperties, prohibitedProperties];
}

function runPositiveTabindex(): RuleExecution {
  const result = emptyExecution();
  for (const element of [...document.querySelectorAll('[tabindex]')]) {
    const value = Number.parseInt(element.getAttribute('tabindex') ?? '', 10);
    if (!Number.isFinite(value) || value <= 0 || isProgrammaticallyHidden(element)) continue;
    result.review.push(finding(RULES.positiveTabindex, 'review', element, 'A positive tabindex changes the natural sequential focus order. Review whether the resulting order preserves meaning and operability.', `tabindex="${value}"`));
  }
  if (!result.review.length) result.passes += 1;
  return result;
}

function visibleHeadings(): Element[] {
  return [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter((heading) => !isProgrammaticallyHidden(heading));
}

export function collectHeadingOutline(): HeadingSnapshot[] {
  const headings = visibleHeadings();
  const h1Count = headings.filter((heading) => heading.tagName === 'H1').length;
  let previousLevel: number | undefined;

  return headings.map((heading, index) => {
    const level = Number(heading.tagName.slice(1)) as HeadingSnapshot['level'];
    const text = heading.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const signals: HeadingSnapshot['signals'] = [];
    if (!text) signals.push('empty');
    if (previousLevel != null && level > previousLevel + 1) signals.push('level-jump');
    if (level === 1 && h1Count > 1) signals.push('multiple-h1');
    previousLevel = level;

    return {
      id: `heading-${index + 1}`,
      level,
      text,
      selector: selectorFor(heading),
      signals,
    };
  });
}

function runHeadingJumps(): RuleExecution {
  const result = emptyExecution();
  const headings = visibleHeadings();
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
  const ariaExecutions = ariaWarningExecutions(evaluateAriaAuthoringSignals());
  const headings = collectHeadingOutline();
  const executions = [runPageTitle(), runPageLangPresent(), runPageLangKnown(), runImages(), runButtons(), runFormFields(), runPlaceholderOnlyLabels(), runLinks(), runLabelInName(), runAriaHiddenFocusable(), ...ariaExecutions, runPositiveTabindex(), runHeadingJumps()];
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: location.href,
    title: document.title,
    scannedAt: Date.now(),
    issues: executions.flatMap((execution) => execution.issues),
    review: executions.flatMap((execution) => execution.review),
    warnings: executions.flatMap((execution) => execution.warnings),
    headings,
    passes: executions.reduce((sum, execution) => sum + execution.passes, 0),
    rulesRun: executions.length,
  };
}
