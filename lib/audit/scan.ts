import type { ComponentScanScope, ElementSnapshot, FindingOutcome, ScanIssue, ScanResult } from '../../shared/types';
import {
  ALLOWED_ARIA_CHILD_RULE,
  ADVANCED_ARIA_RULES,
  ARIA_REFERENCE_RULE,
  ARIA_RELATIONSHIP_CONSISTENCY_RULE,
  ARIA_STATE_CONSISTENCY_RULE,
  INVALID_ARIA_ROLE_RULE,
  INVALID_ARIA_VALUE_RULE,
  REQUIRED_ARIA_PARENT_RULE,
  REQUIRED_ARIA_PROPERTY_RULE,
  UNKNOWN_ARIA_ATTRIBUTE_RULE,
  UNSUPPORTED_ARIA_PROPERTY_RULE,
} from '../../shared/aria-authoring-rules';
import { INPUT_PURPOSE_AUTOCOMPLETE_RULE } from '../../shared/form-purpose-rules';
import { LANGUAGE_PARTS_RULE } from '../../shared/language-parts-rules';
import { RULES } from '../../shared/rule-catalog';
import {
  HTML_CONTENT_MODEL_RULE,
  HTML_PARENT_CONTEXT_RULE,
  MAIN_HIERARCHY_RULE,
  NESTED_INTERACTIVE_CONTENT_RULE,
  REPEATED_LANDMARK_LABEL_RULE,
  SECTION_HEADING_REVIEW_RULE,
  STRUCTURAL_HTML_RULES,
} from '../../shared/structural-html-rules';
import { TEXT_SPACING_ACT_ID_BY_PROPERTY, TEXT_SPACING_RULE } from '../../shared/text-spacing-rules';
import { evaluateAdvancedAria, type AriaValidationSignalKind } from './aria-validator';
import { evaluateAutocompletePurpose, type AutocompletePurposeEvaluation } from './autocomplete-purpose';
import { evaluateBypassBlocks } from './bypass-blocks';
import {
  isInactiveContrastElement,
  observedContrastStates,
} from './contrast-state-coverage';
import { textContrastSubjectsForElement } from './contrast';
import { evaluateStructuralHtml, type StructuralHtmlSignalKind } from './content-model';
import { accessibleName, isProgrammaticallyHidden, selectorFor, semanticRole } from './dom';
import { evaluateLanguageParts, type LanguagePartEvaluation } from './language-parts';
import { evaluateLinkPurposeContext, type LinkPurposeContextEvaluation } from './link-purpose-context';
import { evaluatePauseStopHide, type PauseStopHideEvaluation } from './pause-stop-hide';
import { evaluateReflow, type ReflowSignal } from './reflow';
import { appendMediaAccessibilityReviews } from './media-scan-extension';
import { collectHeadingOutline, runFocusTraceScan as runBaseFocusTraceScan } from './scan-base';
import { scopedElements, withScanElementQueryCache } from './scan-elements';
import { evaluateTargetSize, type TargetSizeEvaluation } from './target-size';
import { evaluateTextSpacing, type TextSpacingEvaluation } from './text-spacing';
import { evaluateInlineLinkUseOfColor, type UseOfColorEvaluation } from './use-of-color';

export { collectHeadingOutline };

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const RULE_FOR_KIND = {
  'parent-context': HTML_PARENT_CONTEXT_RULE,
  'content-model': HTML_CONTENT_MODEL_RULE,
  'nested-interactive': NESTED_INTERACTIVE_CONTENT_RULE,
  'main-hierarchy': MAIN_HIERARCHY_RULE,
  'section-heading': SECTION_HEADING_REVIEW_RULE,
  'landmark-label': REPEATED_LANDMARK_LABEL_RULE,
} satisfies Record<StructuralHtmlSignalKind, (typeof STRUCTURAL_HTML_RULES)[number]>;

const RULE_FOR_ARIA_KIND = {
  'invalid-role': INVALID_ARIA_ROLE_RULE,
  'unknown-attribute': UNKNOWN_ARIA_ATTRIBUTE_RULE,
  'invalid-value': INVALID_ARIA_VALUE_RULE,
  'missing-required-property': REQUIRED_ARIA_PROPERTY_RULE,
  'broken-reference': ARIA_REFERENCE_RULE,
  'required-parent': REQUIRED_ARIA_PARENT_RULE,
  'allowed-child': ALLOWED_ARIA_CHILD_RULE,
  'state-consistency': ARIA_STATE_CONSISTENCY_RULE,
  'unsupported-property': UNSUPPORTED_ARIA_PROPERTY_RULE,
  'relationship-consistency': ARIA_RELATIONSHIP_CONSISTENCY_RULE,
} satisfies Record<AriaValidationSignalKind, (typeof ADVANCED_ARIA_RULES)[number]>;

const REVIEW_KINDS = new Set<StructuralHtmlSignalKind>(['section-heading', 'landmark-label']);
const PAGE_ONLY_RULE_IDS = new Set([MAIN_HIERARCHY_RULE.id, REPEATED_LANDMARK_LABEL_RULE.id]);
const CONTRAST_RULE_IDS = new Set([RULES.textContrast.id, RULES.nonTextContrast.id]);

function descriptionFor(kind: StructuralHtmlSignalKind): string {
  switch (kind) {
    case 'parent-context':
      return 'This native HTML element is outside a context where the HTML Living Standard defines its intended structural semantics.';
    case 'content-model':
      return 'This native HTML structure does not match the required child, grouping or ordering model defined by the HTML Living Standard.';
    case 'nested-interactive':
      return 'This native interactive or labeling structure contains a descendant combination that HTML prohibits because focus, activation or control relationships can become ambiguous.';
    case 'main-hierarchy':
      return 'This native <main> element has an ancestor that is not allowed by the HTML definition of a hierarchically correct main element.';
    case 'section-heading':
      return 'This sectioning element has no heading that belongs to it and no computed accessible name. Review whether users can identify the section or whether a generic container would better match the content.';
    case 'landmark-label':
      return 'Several landmarks expose the same role but this one has a missing or non-distinguishable accessible name. Review the landmark labels so users can tell the regions apart.';
  }
}

function ariaDescriptionFor(kind: AriaValidationSignalKind): string {
  switch (kind) {
    case 'invalid-role':
      return 'The explicit role attribute contains an abstract role or cannot resolve to a registered non-abstract WAI-ARIA role using the standard fallback-token model.';
    case 'unknown-attribute':
      return 'This aria-* attribute is not present in the synced WAI-ARIA state/property registry and therefore cannot expose the intended ARIA information reliably.';
    case 'invalid-value':
      return 'This ARIA state/property uses a value that does not match the current WAI-ARIA value grammar that FocusTrace can verify deterministically.';
    case 'missing-required-property':
      return 'The resolved explicit ARIA role is missing a state or property that WAI-ARIA requires for that role, and equivalent native host semantics do not supply it.';
    case 'broken-reference':
      return 'This ARIA ID-based relationship is empty, unresolved, cyclic, multiply owned or points outside the accessibility relationship required by the property.';
    case 'required-parent':
      return 'The resolved ARIA role is outside its required accessibility-parent context after accounting for transparent wrappers and valid aria-owns ownership.';
    case 'allowed-child':
      return 'This ARIA container exposes a semantic accessibility child role that is outside the role model allowed for that container.';
    case 'state-consistency':
      return 'The element exposes ARIA range, position or set metadata whose values contradict each other even though the individual attributes may be syntactically valid.';
    case 'unsupported-property':
      return 'This known ARIA state/property is not supported by the element’s resolved explicit or native role in the synced WAI-ARIA role registry.';
    case 'relationship-consistency':
      return 'The ARIA relationship resolves, but the owner’s exposed state contradicts the relationship or the availability of the referenced content.';
  }
}

function compactElementSnapshot(element: Element): ElementSnapshot {
  const result: ElementSnapshot = {
    tag: element.tagName.toLowerCase(),
    selector: selectorFor(element),
  };
  if (element.id) result.id = element.id.slice(0, 120);
  const role = semanticRole(element);
  if (role) result.role = role;
  const className = element.getAttribute('class')?.replace(/\s+/g, ' ').trim().slice(0, 140);
  if (className) result.className = className;
  try {
    const name = accessibleName(element).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (name) result.name = name;
  } catch {
    // The target may detach while the synchronous scan is being finalized.
  }
  return result;
}

function ariaAllowedChildContext(element: Element, detail: string): Element | undefined {
  const match = detail.match(/^role=("(?:\\.|[^"])*") exposes accessibility child role=/);
  if (!match?.[1]) return undefined;

  let expectedRole: string;
  try {
    expectedRole = JSON.parse(match[1]) as string;
  } catch {
    return undefined;
  }

  let current = element.parentElement;
  while (current) {
    if (semanticRole(current) === expectedRole) return current;
    current = current.parentElement;
  }

  if (element.id) {
    for (const owner of document.querySelectorAll('[aria-owns]')) {
      const ids = owner.getAttribute('aria-owns')?.trim().split(/\s+/).filter(Boolean) ?? [];
      if (ids.includes(element.id) && semanticRole(owner) === expectedRole) return owner;
    }
  }
  return undefined;
}

function annotateIssueElementSnapshots(result: ScanResult): void {
  for (const issue of [...result.issues, ...result.review, ...result.warnings]) {
    if (issue.element) continue;
    const element = elementForIssue(issue);
    if (element) issue.element = compactElementSnapshot(element);
  }
}

function issueFor(
  kind: StructuralHtmlSignalKind,
  element: Element,
  detail: string,
): ScanIssue {
  const rule = RULE_FOR_KIND[kind];
  const outcome: FindingOutcome = REVIEW_KINDS.has(kind) ? 'review' : 'warning';
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: descriptionFor(kind),
    severity: rule.severity,
    outcome,
    targets: [selectorFor(element)],
    evidence: detail,
    references: rule.references,
  };
}

function ariaIssueFor(kind: AriaValidationSignalKind, element: Element, detail: string): ScanIssue {
  const rule = RULE_FOR_ARIA_KIND[kind];
  const context = kind === 'allowed-child' ? ariaAllowedChildContext(element, detail) : undefined;
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: ariaDescriptionFor(kind),
    severity: rule.severity,
    outcome: 'warning',
    targets: [selectorFor(element)],
    ...(context ? { context: compactElementSnapshot(context) } : {}),
    evidence: detail,
    references: rule.references,
  };
}

function autocompletePurposeIssueFor(evaluation: AutocompletePurposeEvaluation): ScanIssue {
  const rule = INPUT_PURPOSE_AUTOCOMPLETE_RULE;
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: 'This control uses standard HTML autocomplete vocabulary, but the observed token sequence is not valid. Review whether the field collects information about the user and, when WCAG 1.3.5 applies, expose its purpose with a valid programmatically determinable input-purpose value.',
    severity: rule.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: `autocomplete=${JSON.stringify(evaluation.value)}. ${evaluation.reason ?? 'The standard autocomplete token grammar is not satisfied.'}`,
    references: rule.references,
  };
}

function languagePartIssueFor(evaluation: LanguagePartEvaluation): ScanIssue {
  const rule = LANGUAGE_PARTS_RULE;
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: 'This content fragment explicitly declares a language, but its lang value does not start with a primary language subtag registered by IANA as Type: language.',
    severity: rule.severity,
    outcome: 'fail',
    targets: [selectorFor(evaluation.element)],
    evidence: `lang = ${JSON.stringify(evaluation.value)}; primary subtag = ${JSON.stringify(evaluation.primary)}`,
    references: rule.references,
  };
}

function textSpacingIssueFor(evaluation: TextSpacingEvaluation): ScanIssue {
  const actId = TEXT_SPACING_ACT_ID_BY_PROPERTY[evaluation.property];
  return {
    id: uid(),
    ruleId: TEXT_SPACING_RULE.id,
    title: TEXT_SPACING_RULE.title,
    description: 'This rendered text uses an inline !important spacing declaration below the ACT expectation. Review whether the page provides an equivalent spacing-adjustment mechanism and whether WCAG 1.4.12 applies to this language/script before treating it as a conformance failure.',
    severity: TEXT_SPACING_RULE.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: TEXT_SPACING_RULE.references.filter((reference) => reference.type === 'WCAG' || reference.id === actId),
  };
}

function reflowIssueFor(signal: ReflowSignal): ScanIssue {
  const rule = RULES.reflow;
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: 'FocusTrace observed non-exempt two-dimensional page overflow or rendered content clipped by an unscrollable ancestor in the current narrow viewport. Review responsive alternatives and WCAG exceptions before treating it as a conformance failure.',
    severity: rule.severity,
    outcome: 'review',
    targets: signal.targets.map(selectorFor),
    evidence: signal.detail,
    reflow: signal.evidence,
    references: rule.references,
  };
}

function useOfColorIssueFor(evaluation: UseOfColorEvaluation): ScanIssue {
  const rule = RULES.inlineLinkUseOfColor;
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: 'FocusTrace observed an inline link whose current rendered text differs from adjacent non-link text by color, with less than a 3:1 lightness difference and no persistent non-color cue it could resolve. Review the complete visual context before treating it as a conformance failure.',
    severity: rule.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    context: compactElementSnapshot(evaluation.context),
    ...(evaluation.detail ? { evidence: evaluation.detail } : {}),
    ...(evaluation.evidence ? { useOfColor: evaluation.evidence } : {}),
    references: rule.references,
  };
}

function pauseStopHideIssueFor(evaluation: PauseStopHideEvaluation): ScanIssue {
  const rule = RULES.pauseStopHide;
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: 'FocusTrace observed rendered moving, blinking or scrolling content that may start automatically, continue for more than five seconds and appear alongside other content. Review automatic start, duration, essentiality and any control mechanism before treating it as a conformance failure.',
    severity: rule.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    ...(evaluation.detail ? { evidence: evaluation.detail } : {}),
    ...(evaluation.evidence ? { pauseStopHide: evaluation.evidence } : {}),
    references: rule.references,
  };
}

function linkPurposeContextIssueFor(evaluation: LinkPurposeContextEvaluation): ScanIssue {
  const rule = RULES.linkPurposeContext;
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: 'FocusTrace observed a non-empty accessible link name that matches a deliberately small set of generic English or Spanish phrases. Review whether the link purpose is clear from the name alone or together with its programmatically determined context before treating it as a conformance failure.',
    severity: rule.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    linkPurposeContext: evaluation.evidence,
    references: rule.references,
  };
}

function targetSizeIssueFor(evaluation: TargetSizeEvaluation): ScanIssue {
  const rule = RULES.targetSizeMinimum;
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: 'This pointer target does not have a deterministically verified 24 × 24 CSS px target area, and its 24 CSS px spacing circle intersects another observed pointer target. Review the WCAG exceptions before treating this as a failure.',
    severity: rule.severity,
    outcome: 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: rule.references,
  };
}

function elementForIssue(issue: ScanIssue): Element | undefined {
  const target = issue.targets[0];
  if (!target) return undefined;
  try {
    return document.querySelector(target) ?? undefined;
  } catch {
    return undefined;
  }
}

function contrastElements(root: Document | Element): Element[] {
  if (root instanceof Document) {
    return document.body
      ? scopedElements(root, '*').filter((element) => document.body?.contains(element))
      : [];
  }
  return scopedElements(root, '*');
}

function pruneInactiveTextContrast(result: ScanResult, root: Document | Element): void {
  const inactiveSubjects = contrastElements(root).reduce((count, element) => {
    if (isProgrammaticallyHidden(element) || !isInactiveContrastElement(element)) return count;
    return count + textContrastSubjectsForElement(element).length;
  }, 0);
  if (!inactiveSubjects) return;

  let removedFailures = 0;
  let removedReviews = 0;
  result.issues = result.issues.filter((issue) => {
    if (issue.ruleId !== RULES.textContrast.id) return true;
    const element = elementForIssue(issue);
    if (!element || !isInactiveContrastElement(element)) return true;
    removedFailures += 1;
    return false;
  });
  result.review = result.review.filter((issue) => {
    if (issue.ruleId !== RULES.textContrast.id) return true;
    const element = elementForIssue(issue);
    if (!element || !isInactiveContrastElement(element)) return true;
    removedReviews += 1;
    return false;
  });

  const removedPasses = Math.max(0, inactiveSubjects - removedFailures - removedReviews);
  const ruleResult = result.ruleResults?.find((entry) => entry.ruleId === RULES.textContrast.id);
  if (ruleResult) {
    ruleResult.applicable = Math.max(0, ruleResult.applicable - inactiveSubjects);
    ruleResult.passed = Math.max(0, ruleResult.passed - removedPasses);
    ruleResult.failures = Math.max(0, ruleResult.failures - removedFailures);
    ruleResult.reviews = Math.max(0, ruleResult.reviews - removedReviews);
  }
  result.passes = Math.max(0, result.passes - removedPasses);
}

function pruneUnresolvedContrastReviews(result: ScanResult): void {
  const removedByRule = new Map<string, number>();
  result.review = result.review.filter((issue) => {
    if (!CONTRAST_RULE_IDS.has(issue.ruleId) || !issue.contrast || issue.contrast.background) return true;
    removedByRule.set(issue.ruleId, (removedByRule.get(issue.ruleId) ?? 0) + 1);
    return false;
  });

  for (const [ruleId, removed] of removedByRule) {
    const ruleResult = result.ruleResults?.find((entry) => entry.ruleId === ruleId);
    if (!ruleResult) continue;
    ruleResult.applicable = Math.max(0, ruleResult.applicable - removed);
    ruleResult.reviews = Math.max(0, ruleResult.reviews - removed);
  }
}

function annotateObservedContrastStates(result: ScanResult): void {
  for (const issue of [...result.issues, ...result.review]) {
    if (!CONTRAST_RULE_IDS.has(issue.ruleId)) continue;
    const element = elementForIssue(issue);
    if (!element) continue;
    const states = observedContrastStates(element);
    if (!states.length) continue;
    const stateEvidence = `Observed visual state: ${states.join(', ')}.`;
    issue.evidence = issue.evidence ? `${issue.evidence} ${stateEvidence}` : stateEvidence;
  }
}

function appendBypassBlocksReview(result: ScanResult): void {
  const evaluation = evaluateBypassBlocks();
  const rule = RULES.bypassBlocks;
  const applicable = evaluation.status === 'inapplicable' ? 0 : 1;
  const passed = evaluation.status === 'pass' ? 1 : 0;
  const reviews = evaluation.status === 'review' ? 1 : 0;

  if (evaluation.status === 'review' && evaluation.target && evaluation.description) {
    result.review.push({
      id: uid(),
      ruleId: rule.id,
      title: rule.title,
      description: evaluation.description,
      severity: rule.severity,
      outcome: 'review',
      targets: [selectorFor(evaluation.target)],
      ...(evaluation.evidence ? { evidence: evaluation.evidence } : {}),
      references: rule.references,
    });
  }

  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: rule.id,
      applicable,
      passed,
      failures: 0,
      reviews,
      warnings: 0,
    },
  ];
  result.passes += passed;
  result.rulesRun += 1;
}

function appendLanguageParts(result: ScanResult): void {
  const evaluations = evaluateLanguageParts(document);
  const failures = evaluations.filter((evaluation) => evaluation.outcome === 'fail');
  const passed = evaluations.length - failures.length;

  result.issues.push(...failures.map(languagePartIssueFor));
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: LANGUAGE_PARTS_RULE.id,
      applicable: evaluations.length,
      passed,
      failures: failures.length,
      reviews: 0,
      warnings: 0,
    },
  ];
  result.passes += passed;
  result.rulesRun += 1;
}

function appendAutocompletePurposeReview(result: ScanResult, root: Document | Element): void {
  const evaluations = evaluateAutocompletePurpose(root);
  const reviews = evaluations.filter((evaluation) => evaluation.outcome === 'review').map(autocompletePurposeIssueFor);
  const passed = evaluations.filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...reviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: INPUT_PURPOSE_AUTOCOMPLETE_RULE.id,
      applicable: evaluations.length,
      passed,
      failures: 0,
      reviews: reviews.length,
      warnings: 0,
    },
  ];
  result.passes += passed;
  result.rulesRun += 1;
}

function appendTextSpacingReview(result: ScanResult, root: Document | Element): void {
  const evaluations = evaluateTextSpacing(root);
  const reviews = evaluations.filter((evaluation) => evaluation.outcome === 'review').map(textSpacingIssueFor);
  const passed = evaluations.filter((evaluation) => evaluation.outcome === 'pass').length;

  result.review.push(...reviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: TEXT_SPACING_RULE.id,
      applicable: evaluations.length,
      passed,
      failures: 0,
      reviews: reviews.length,
      warnings: 0,
    },
  ];
  result.passes += passed;
  result.rulesRun += 1;
}

function appendReflowReview(result: ScanResult): void {
  const evaluation = evaluateReflow(document);
  const reviews = evaluation.signals.map(reflowIssueFor);
  const applicable = evaluation.status === 'inapplicable' ? 0 : Math.max(1, reviews.length);
  const passed = evaluation.status === 'pass' ? 1 : 0;

  result.review.push(...reviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: RULES.reflow.id,
      applicable,
      passed,
      failures: 0,
      reviews: reviews.length,
      warnings: 0,
    },
  ];
  result.passes += passed;
  result.rulesRun += 1;
}

function appendInlineLinkUseOfColorReview(result: ScanResult, root: Document | Element): void {
  const evaluations = evaluateInlineLinkUseOfColor(root);
  const reviews = evaluations
    .filter((evaluation) => evaluation.status === 'review')
    .map(useOfColorIssueFor);
  const passed = evaluations.filter((evaluation) => evaluation.status === 'pass').length;

  result.review.push(...reviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: RULES.inlineLinkUseOfColor.id,
      applicable: evaluations.length,
      passed,
      failures: 0,
      reviews: reviews.length,
      warnings: 0,
    },
  ];
  result.passes += passed;
  result.rulesRun += 1;
}

function appendPauseStopHideReview(result: ScanResult, root: Document | Element): void {
  const evaluations = evaluatePauseStopHide(root);
  const reviews = evaluations
    .filter((evaluation) => evaluation.status === 'review')
    .map(pauseStopHideIssueFor);
  const passed = evaluations.filter((evaluation) => evaluation.status === 'pass').length;

  result.review.push(...reviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: RULES.pauseStopHide.id,
      applicable: evaluations.length,
      passed,
      failures: 0,
      reviews: reviews.length,
      warnings: 0,
    },
  ];
  result.passes += passed;
  result.rulesRun += 1;
}

function appendLinkPurposeContextReview(result: ScanResult, root: Document | Element): void {
  const evaluations = evaluateLinkPurposeContext(root);
  const reviews = evaluations.map(linkPurposeContextIssueFor);

  result.review.push(...reviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: RULES.linkPurposeContext.id,
      applicable: evaluations.length,
      passed: 0,
      failures: 0,
      reviews: reviews.length,
      warnings: 0,
      coverage: 'findings-only',
    },
  ];
  result.rulesRun += 1;
}

function runFocusTraceScanWithCache(scope?: ComponentScanScope): ScanResult {
  const result = runBaseFocusTraceScan(scope);
  const componentScope = result.scope?.type === 'component' ? result.scope : undefined;
  const root = componentScope ? document.querySelector(componentScope.selector) : document;
  if (!root) return result;

  pruneInactiveTextContrast(result, root);
  pruneUnresolvedContrastReviews(result);
  annotateObservedContrastStates(result);
  if (!componentScope) {
    appendBypassBlocksReview(result);
    appendLanguageParts(result);
    appendReflowReview(result);
  }
  appendAutocompletePurposeReview(result, root);
  appendTextSpacingReview(result, root);
  appendInlineLinkUseOfColorReview(result, root);
  appendPauseStopHideReview(result, root);
  appendLinkPurposeContextReview(result, root);
  appendMediaAccessibilityReviews(result, root);

  const signals = evaluateStructuralHtml(root, !componentScope);
  const activeRules = STRUCTURAL_HTML_RULES.filter((rule) => !componentScope || !PAGE_ONLY_RULE_IDS.has(rule.id));
  const additions = signals.map((signal) => ({ signal, issue: issueFor(signal.kind, signal.element, signal.detail) }));

  result.warnings.push(...additions.filter(({ issue }) => issue.outcome === 'warning').map(({ issue }) => issue));
  result.review.push(...additions.filter(({ issue }) => issue.outcome === 'review').map(({ issue }) => issue));
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    ...activeRules.map((rule) => {
      const ruleFindings = additions.filter(({ issue }) => issue.ruleId === rule.id).map(({ issue }) => issue);
      return {
        ruleId: rule.id,
        applicable: ruleFindings.length,
        passed: 0,
        failures: 0,
        reviews: ruleFindings.filter((issue) => issue.outcome === 'review').length,
        warnings: ruleFindings.filter((issue) => issue.outcome === 'warning').length,
        coverage: 'findings-only' as const,
      };
    }),
  ];
  result.rulesRun += activeRules.length;

  const ariaSignals = evaluateAdvancedAria(root);
  const ariaAdditions = ariaSignals.map((signal) => ariaIssueFor(signal.kind, signal.element, signal.detail));
  result.warnings.push(...ariaAdditions);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    ...ADVANCED_ARIA_RULES.map((rule) => {
      const warnings = ariaAdditions.filter((issue) => issue.ruleId === rule.id);
      return {
        ruleId: rule.id,
        applicable: warnings.length,
        passed: 0,
        failures: 0,
        reviews: 0,
        warnings: warnings.length,
        coverage: 'findings-only' as const,
      };
    }),
  ];
  result.rulesRun += ADVANCED_ARIA_RULES.length;

  const targetSizeEvaluations = evaluateTargetSize(root);
  const targetSizeReviews = targetSizeEvaluations
    .filter((evaluation) => evaluation.status === 'review')
    .map(targetSizeIssueFor);
  const targetSizePasses = targetSizeEvaluations.filter((evaluation) => evaluation.status === 'pass').length;
  result.review.push(...targetSizeReviews);
  result.ruleResults = [
    ...(result.ruleResults ?? []),
    {
      ruleId: RULES.targetSizeMinimum.id,
      applicable: targetSizeEvaluations.length,
      passed: targetSizePasses,
      failures: 0,
      reviews: targetSizeReviews.length,
      warnings: 0,
    },
  ];
  result.passes += targetSizePasses;
  result.rulesRun += 1;
  annotateIssueElementSnapshots(result);
  return result;
}

export function runFocusTraceScan(scope?: ComponentScanScope): ScanResult {
  return withScanElementQueryCache(() => runFocusTraceScanWithCache(scope));
}
