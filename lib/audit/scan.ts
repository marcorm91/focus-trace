import { DUPLICATE_ID_RULE } from '../../shared/html-authoring-rules';
import { RULES, type RuleDefinition } from '../../shared/rule-catalog';
import type { ComponentScanScope, FindingOutcome, HeadingSnapshot, ScanIssue, ScanResult } from '../../shared/types';
import { evaluateTextContrastForElement, textContrastSubjectsForElement } from './contrast';
import { accessibleNameDetails, accessibleNameDiagnostics, isMarkedDecorative, isProgrammaticallyHidden, isSequentiallyFocusable, selectorFor, semanticRole } from './dom';
import { evaluateDuplicateIds } from './duplicate-ids';
import { evaluateLabelInName } from './label-in-name';
import { evaluateNonTextContrast } from './non-text-contrast';
import { evaluateAriaAuthoringSignals, pageLanguageStatus, type AriaAuthoringSignal } from './standards-registry';

interface RuleExecution {
  rule: RuleDefinition;
  issues: ScanIssue[];
  review: ScanIssue[];
  warnings: ScanIssue[];
  passes: number;
}
type ScanRoot = Document | Element;
const emptyExecution = (rule: RuleDefinition): RuleExecution => ({ rule, issues: [], review: [], warnings: [], passes: 0 });
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const COMPONENT_SCAN_SCOPE_ATTRIBUTE = 'data-focustrace-scan-component';
const COMPONENT_FOCUS_SCOPE_ATTRIBUTE = 'data-focustrace-focus-component';

function scopedElements(root: ScanRoot, selector: string): Element[] {
  const descendants = [...root.querySelectorAll(selector)];
  return root instanceof Element && root.matches(selector) ? [root, ...descendants] : descendants;
}

function containsInScope(root: ScanRoot, element: Element): boolean {
  return root instanceof Document || root === element || root.contains(element);
}

function consumePendingComponentScope(): ComponentScanScope | undefined {
  const raw = document.documentElement.getAttribute(COMPONENT_SCAN_SCOPE_ATTRIBUTE);
  if (!raw) return undefined;
  document.documentElement.removeAttribute(COMPONENT_SCAN_SCOPE_ATTRIBUTE);
  try {
    const parsed = JSON.parse(raw) as Partial<ComponentScanScope>;
    if (parsed.type !== 'component' || typeof parsed.selector !== 'string' || typeof parsed.tag !== 'string') return undefined;
    return {
      type: 'component',
      selector: parsed.selector,
      tag: parsed.tag,
      ...(typeof parsed.role === 'string' && parsed.role ? { role: parsed.role } : {}),
      ...(typeof parsed.label === 'string' && parsed.label ? { label: parsed.label } : {}),
    };
  } catch {
    return undefined;
  }
}

function syncFocusWalkComponentScope(scope: ComponentScanScope | undefined) {
  if (!scope) {
    document.documentElement.removeAttribute(COMPONENT_FOCUS_SCOPE_ATTRIBUTE);
    return;
  }
  document.documentElement.setAttribute(
    COMPONENT_FOCUS_SCOPE_ATTRIBUTE,
    JSON.stringify({ selector: scope.selector }),
  );
}

function finding(
  rule: RuleDefinition,
  outcome: FindingOutcome,
  target: Element | string,
  description: string,
  evidence?: string,
  accessibleName?: ScanIssue['accessibleName'],
  contrast?: ScanIssue['contrast'],
): ScanIssue {
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description,
    severity: rule.severity,
    outcome,
    targets: [typeof target === 'string' ? target : selectorFor(target)],
    ...(evidence ? { evidence } : {}),
    ...(accessibleName ? { accessibleName } : {}),
    ...(contrast ? { contrast } : {}),
    references: rule.references,
  };
}

function runPageTitle(): RuleExecution {
  const result = emptyExecution(RULES.pageTitle);
  const titles = [...document.documentElement.querySelectorAll('title')].filter((title) => title.namespaceURI === 'http://www.w3.org/1999/xhtml');
  const first = titles[0];
  if (!first || !first.textContent?.trim()) result.issues.push(finding(RULES.pageTitle, 'fail', 'html', 'The first HTML <title> is missing or contains only whitespace.', `document.title = ${JSON.stringify(document.title)}`));
  else result.passes += 1;
  return result;
}

function runPageLangPresent(): RuleExecution {
  const result = emptyExecution(RULES.pageLangPresent);
  const status = pageLanguageStatus();
  if (!status.applicable) return result;
  if (status.present) result.passes += 1;
  else result.issues.push(finding(RULES.pageLangPresent, 'fail', 'html', 'The root HTML element does not have a non-empty lang attribute.', `lang = ${JSON.stringify(status.value)}`));
  return result;
}

function runPageLangKnown(): RuleExecution {
  const result = emptyExecution(RULES.pageLangKnown);
  const status = pageLanguageStatus();
  if (!status.applicable || !status.present) return result;
  if (status.knownPrimary) result.passes += 1;
  else result.issues.push(finding(RULES.pageLangKnown, 'fail', 'html', 'The page lang value does not start with a primary language subtag registered by IANA as Type: language.', `lang = ${JSON.stringify(status.value)}; primary subtag = ${JSON.stringify(status.primary)}`));
  return result;
}

function runImages(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.imageName);
  for (const element of scopedElements(root, 'img, [role="img"]')) {
    if (isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDiagnostics(element);
    if (isMarkedDecorative(element) || name.name) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.imageName, 'fail', element, 'The image is exposed as image content but has an empty accessible name and is not marked decorative.', element instanceof HTMLImageElement && !element.hasAttribute('alt') ? 'The <img> element has no alt attribute and no alternative naming mechanism was detected.' : 'No non-empty accessible name was detected.', name));
  }
  return result;
}

function runButtons(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.buttonName);
  for (const element of scopedElements(root, 'button, input, [role]')) {
    if (element instanceof HTMLInputElement && element.type.toLowerCase() === 'image') continue;
    if (semanticRole(element) !== 'button' || isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDiagnostics(element);
    if (name.name) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.buttonName, 'fail', element, 'The button is exposed to assistive technology with an empty accessible name.', 'The accessible-name computation returned an empty string.', name));
  }
  return result;
}

const FORM_FIELD_ROLES = new Set(['checkbox', 'combobox', 'listbox', 'menuitemcheckbox', 'menuitemradio', 'radio', 'searchbox', 'slider', 'spinbutton', 'switch', 'textbox']);
function runFormFields(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.formFieldName);
  for (const element of scopedElements(root, 'input, select, textarea, [role]')) {
    const role = semanticRole(element);
    if (!role || !FORM_FIELD_ROLES.has(role) || isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDiagnostics(element);
    if (name.name) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.formFieldName, 'fail', element, 'The form field has an empty accessible name.', 'The accessible-name computation returned an empty string.', name));
  }
  return result;
}

function runPlaceholderOnlyLabels(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.placeholderOnlyLabel);
  for (const element of scopedElements(root, 'input, textarea')) {
    if (isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDetails(element);
    if (name.source !== 'placeholder' && name.source !== 'aria-placeholder') continue;
    result.review.push(finding(RULES.placeholderOnlyLabel, 'review', element, 'The control has a programmatically computed name, but that name comes only from placeholder text. Review whether a persistent visible label or instruction identifies the field for all users.', `Accessible name ${JSON.stringify(name.name)} is sourced from ${name.source}.`));
  }
  return result;
}

function runLinks(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.linkName);
  for (const element of scopedElements(root, 'a, area, [role]')) {
    if (semanticRole(element) !== 'link' || isProgrammaticallyHidden(element)) continue;
    const name = accessibleNameDiagnostics(element);
    if (name.name) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.linkName, 'fail', element, 'The link has an empty accessible name, so its purpose cannot be programmatically determined from its name.', 'The accessible-name computation returned an empty string.', name));
  }
  return result;
}

function runLabelInName(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.labelInName);
  for (const evaluation of evaluateLabelInName().filter((entry) => containsInScope(root, entry.element))) {
    if (evaluation.outcome === 'pass') {
      result.passes += 1;
      continue;
    }

    const evidence = `Visible label ${JSON.stringify(evaluation.visibleLabel)} is not contained in accessible name ${JSON.stringify(evaluation.accessibleName)}.${evaluation.reason ? ` ${evaluation.reason}` : ''}`;
    if (evaluation.outcome === 'warning') {
      result.warnings.push(finding(RULES.labelInName, 'warning', evaluation.element, 'The control has visible text that is not fully contained in the accessible name, but the mismatch looks ambiguous and needs manual review.', evidence));
      continue;
    }

    result.issues.push(finding(RULES.labelInName, 'fail', evaluation.element, 'The control has visible text, but that visible label is not contained in the accessible name used by assistive technology and speech input.', evidence));
  }
  return result;
}

function runAriaHiddenFocusable(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.ariaHiddenFocusable);
  const containers = scopedElements(root, '[aria-hidden]').filter((element) => element.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true');
  for (const container of containers) {
    const focusable = [container, ...container.querySelectorAll('*')].find((element) => isSequentiallyFocusable(element));
    if (!focusable) { result.passes += 1; continue; }
    result.issues.push(finding(RULES.ariaHiddenFocusable, 'fail', focusable, 'An element hidden from assistive technologies remains in sequential keyboard focus navigation.', `Focusable element is inside ${selectorFor(container)} with aria-hidden="true".`));
  }
  return result;
}

function runDuplicateIds(root: ScanRoot): RuleExecution {
  const result = emptyExecution(DUPLICATE_ID_RULE);
  const signals = evaluateDuplicateIds(root);
  for (const signal of signals) {
    result.warnings.push(finding(
      DUPLICATE_ID_RULE,
      'warning',
      signal.element,
      'This id value is used by more than one element in the document. HTML requires non-empty IDs to be unique; duplicate identifiers can make ID-based relationships or navigation resolve unpredictably.',
      `id=${JSON.stringify(signal.id)} is used by ${signal.occurrences} elements in this document.`,
    ));
  }
  return result;
}

function ariaWarningExecutions(signals: AriaAuthoringSignal[]): RuleExecution[] {
  const deprecatedRoles = emptyExecution(RULES.deprecatedAriaRole);
  const deprecatedProperties = emptyExecution(RULES.deprecatedAriaProperty);
  const prohibitedProperties = emptyExecution(RULES.prohibitedAriaProperty);

  for (const signal of signals) {
    if (signal.kind === 'deprecated-role') {
      deprecatedRoles.warnings.push(finding(RULES.deprecatedAriaRole, 'warning', signal.element, 'This explicit ARIA role is marked deprecated in the current WAI-ARIA registry. Prefer the replacement or native host-language semantics where possible.', `role=${JSON.stringify(signal.role.name)}${signal.role.deprecatedVersion ? `; deprecated since ARIA ${signal.role.deprecatedVersion}` : ''}`));
    } else if (signal.kind === 'deprecated-property') {
      deprecatedProperties.warnings.push(finding(RULES.deprecatedAriaProperty, 'warning', signal.element, 'This ARIA state/property is marked deprecated for the resolved explicit role in the current WAI-ARIA registry.', `${signal.property} on role=${JSON.stringify(signal.role.name)}`));
    } else {
      prohibitedProperties.warnings.push(finding(RULES.prohibitedAriaProperty, 'warning', signal.element, 'This ARIA state/property is listed as prohibited for the resolved explicit role in the current WAI-ARIA registry. Review the authoring semantics.', `${signal.property} on role=${JSON.stringify(signal.role.name)}`));
    }
  }

  return [deprecatedRoles, deprecatedProperties, prohibitedProperties];
}

function runPositiveTabindex(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.positiveTabindex);
  for (const element of scopedElements(root, '[tabindex]')) {
    const value = Number.parseInt(element.getAttribute('tabindex') ?? '', 10);
    if (!Number.isFinite(value) || value <= 0 || isProgrammaticallyHidden(element)) continue;
    result.review.push(finding(RULES.positiveTabindex, 'review', element, 'A positive tabindex changes the natural sequential focus order. Review whether the resulting order preserves meaning and operability.', `tabindex="${value}"`));
  }
  return result;
}

function runTextContrast(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.textContrast);
  const elements = root instanceof Document
    ? document.body ? [document.body, ...document.body.querySelectorAll('*')] : []
    : [root, ...root.querySelectorAll('*')];
  if (!elements.length) return result;

  for (const element of elements) {
    if (isProgrammaticallyHidden(element)) continue;
    const subjects = textContrastSubjectsForElement(element);
    for (const subject of subjects) {
      const evaluation = evaluateTextContrastForElement(element, subject.pseudo);
      if (evaluation.status === 'inapplicable') continue;

      const contrast: ScanIssue['contrast'] = {
        kind: 'text',
        subject: subject.subject,
        requiredRatio: evaluation.requiredRatio ?? 4.5,
        ...(evaluation.ratio != null ? { ratio: evaluation.ratio } : {}),
        ...(evaluation.foreground ? { foreground: evaluation.foreground } : {}),
        ...(evaluation.background ? { background: evaluation.background } : {}),
        ...(evaluation.fontSizePx != null ? { fontSizePx: evaluation.fontSizePx } : {}),
        ...(evaluation.fontWeight != null ? { fontWeight: evaluation.fontWeight } : {}),
        ...(evaluation.largeText != null ? { largeText: evaluation.largeText } : {}),
        ...(evaluation.reason ? { reason: evaluation.reason } : {}),
      };

      if (evaluation.status === 'pass') {
        result.passes += 1;
        continue;
      }

      if (evaluation.status === 'fail') {
        const evidence = `${subject.subject}: contrast ${evaluation.ratio}:1; required ${evaluation.requiredRatio}:1; foreground ${evaluation.foreground}; background ${evaluation.background}; font ${evaluation.fontSizePx}px / ${evaluation.fontWeight}.`;
        result.issues.push(finding(
          RULES.textContrast,
          'fail',
          element,
          `Rendered ${subject.subject} contrast is ${evaluation.ratio}:1, below the required ${evaluation.requiredRatio}:1 for ${evaluation.largeText ? 'large' : 'normal'} text.`,
          evidence,
          undefined,
          contrast,
        ));
        continue;
      }

      result.review.push(finding(
        RULES.textContrast,
        'review',
        element,
        `FocusTrace could not determine the rendered ${subject.subject}/background contrast reliably. Review this text manually instead of treating an uncertain visual calculation as a WCAG failure.`,
        `${evaluation.reason ?? 'Rendered colors could not be resolved reliably.'} Required ratio: ${evaluation.requiredRatio}:1 for ${evaluation.largeText ? 'large' : 'normal'} text.`,
        undefined,
        contrast,
      ));
    }
  }

  return result;
}

function runNonTextContrast(root: ScanRoot): RuleExecution {
  const result = emptyExecution(RULES.nonTextContrast);
  const evaluations = evaluateNonTextContrast().filter(({ element }) => containsInScope(root, element));
  if (!evaluations.length) return result;

  for (const { element, evaluation } of evaluations) {
    if (isProgrammaticallyHidden(element) || evaluation.status === 'inapplicable') continue;
    const contrast: ScanIssue['contrast'] = {
      kind: evaluation.kind,
      subject: evaluation.subject,
      requiredRatio: evaluation.requiredRatio,
      ...(evaluation.ratio != null ? { ratio: evaluation.ratio } : {}),
      ...(evaluation.foreground ? { foreground: evaluation.foreground } : {}),
      ...(evaluation.background ? { background: evaluation.background } : {}),
      ...(evaluation.reason ? { reason: evaluation.reason } : {}),
    };

    if (evaluation.status === 'pass') {
      result.passes += 1;
      continue;
    }

    const evidence = evaluation.ratio != null
      ? `${evaluation.subject}: ${evaluation.ratio}:1; required ${evaluation.requiredRatio}:1; visual color ${evaluation.foreground ?? 'unresolved'}; adjacent color ${evaluation.background ?? 'unresolved'}.`
      : `${evaluation.subject}: ${evaluation.reason ?? 'A deterministic non-text contrast ratio could not be resolved.'}`;

    if (evaluation.status === 'fail') {
      result.issues.push(finding(
        RULES.nonTextContrast,
        'fail',
        element,
        `The observed ${evaluation.subject} contrast is ${evaluation.ratio}:1, below the required 3:1 for the non-text visual cue used to identify the component or its current state.`,
        evidence,
        undefined,
        contrast,
      ));
      continue;
    }

    result.review.push(finding(
      RULES.nonTextContrast,
      'review',
      element,
      'A non-text visual cue is below 3:1 or cannot be reduced to one reliable ratio, but whether that cue is required to identify the component, state or graphic depends on visual context. Review it manually instead of treating it as an automatic WCAG failure.',
      `${evidence}${evaluation.reason ? ` ${evaluation.reason}` : ''}`,
      undefined,
      contrast,
    ));
  }

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
    if ((index === 0 && level > 1) || (previousLevel != null && level > previousLevel + 1)) signals.push('level-jump');
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
  const result = emptyExecution(RULES.headingJump);
  const headings = visibleHeadings();
  const firstHeading = headings[0];
  if (firstHeading) {
    const firstLevel = Number(firstHeading.tagName.slice(1));
    if (firstLevel > 1) {
      result.review.push(finding(
        RULES.headingJump,
        'review',
        firstHeading,
        'The heading outline starts below H1. This is not automatically a WCAG failure, but it can indicate that the page hierarchy needs manual review.',
        `Document starts with ${firstHeading.tagName} before any H1.`,
      ));
    } else {
      result.passes += 1;
    }
  }

  for (let index = 1; index < headings.length; index += 1) {
    const previousHeading = headings[index - 1]; const currentHeading = headings[index];
    if (!previousHeading || !currentHeading) continue;
    const previous = Number(previousHeading.tagName.slice(1)); const current = Number(currentHeading.tagName.slice(1));
    if (current <= previous + 1) {
      result.passes += 1;
      continue;
    }
    result.review.push(finding(RULES.headingJump, 'review', currentHeading, 'A skipped heading level is not automatically a WCAG failure, but it can indicate that structure or relationships need manual review.', `${previousHeading.tagName} → ${currentHeading.tagName}`));
  }
  return result;
}

export function runFocusTraceScan(scope: ComponentScanScope | undefined = consumePendingComponentScope()): ScanResult {
  const root = scope ? document.querySelector(scope.selector) : document;
  if (!root) throw new Error('Selected scan component is no longer present on the page.');
  syncFocusWalkComponentScope(scope);

  const ariaSignals = evaluateAriaAuthoringSignals().filter((signal) => containsInScope(root, signal.element));
  const ariaExecutions = ariaWarningExecutions(ariaSignals);
  const componentExecutions = [
    runImages(root),
    runButtons(root),
    runFormFields(root),
    runPlaceholderOnlyLabels(root),
    runLinks(root),
    runLabelInName(root),
    runAriaHiddenFocusable(root),
    runDuplicateIds(root),
    runTextContrast(root),
    runNonTextContrast(root),
    ...ariaExecutions,
    runPositiveTabindex(root),
  ];
  const executions = scope
    ? componentExecutions
    : [runPageTitle(), runPageLangPresent(), runPageLangKnown(), ...componentExecutions, runHeadingJumps()];

  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: location.href,
    title: document.title,
    scannedAt: Date.now(),
    scope: scope ?? { type: 'page' },
    issues: executions.flatMap((execution) => execution.issues),
    review: executions.flatMap((execution) => execution.review),
    warnings: executions.flatMap((execution) => execution.warnings),
    ...(scope ? {} : { headings: collectHeadingOutline() }),
    ruleResults: executions.map((execution) => ({
      ruleId: execution.rule.id,
      applicable: execution.passes
        + execution.issues.length
        + execution.review.length
        + execution.warnings.length,
      passed: execution.passes,
      failures: execution.issues.length,
      reviews: execution.review.length,
      warnings: execution.warnings.length,
    })),
    passes: executions.reduce((sum, execution) => sum + execution.passes, 0),
    rulesRun: executions.length,
  };
}
