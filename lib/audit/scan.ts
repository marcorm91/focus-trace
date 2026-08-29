import type { ComponentScanScope, FindingOutcome, ScanIssue, ScanResult } from '../../shared/types';
import {
  ALLOWED_ARIA_CHILD_RULE,
  ADVANCED_ARIA_RULES,
  ARIA_REFERENCE_RULE,
  ARIA_STATE_CONSISTENCY_RULE,
  INVALID_ARIA_ROLE_RULE,
  INVALID_ARIA_VALUE_RULE,
  REQUIRED_ARIA_PARENT_RULE,
  REQUIRED_ARIA_PROPERTY_RULE,
  UNKNOWN_ARIA_ATTRIBUTE_RULE,
} from '../../shared/aria-authoring-rules';
import {
  HTML_CONTENT_MODEL_RULE,
  HTML_PARENT_CONTEXT_RULE,
  MAIN_HIERARCHY_RULE,
  NESTED_INTERACTIVE_CONTENT_RULE,
  REPEATED_LANDMARK_LABEL_RULE,
  SECTION_HEADING_REVIEW_RULE,
  STRUCTURAL_HTML_RULES,
} from '../../shared/structural-html-rules';
import { evaluateAdvancedAria, type AriaValidationSignalKind } from './aria-validator';
import { evaluateStructuralHtml, type StructuralHtmlSignalKind } from './content-model';
import { selectorFor } from './dom';
import { collectHeadingOutline, runFocusTraceScan as runBaseFocusTraceScan } from './scan-base';

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
} satisfies Record<AriaValidationSignalKind, (typeof ADVANCED_ARIA_RULES)[number]>;

const REVIEW_KINDS = new Set<StructuralHtmlSignalKind>(['section-heading', 'landmark-label']);
const PAGE_ONLY_RULE_IDS = new Set([MAIN_HIERARCHY_RULE.id, REPEATED_LANDMARK_LABEL_RULE.id]);

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
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: ariaDescriptionFor(kind),
    severity: rule.severity,
    outcome: 'warning',
    targets: [selectorFor(element)],
    evidence: detail,
    references: rule.references,
  };
}

export function runFocusTraceScan(scope?: ComponentScanScope): ScanResult {
  const result = runBaseFocusTraceScan(scope);
  const componentScope = result.scope?.type === 'component' ? result.scope : undefined;
  const root = componentScope ? document.querySelector(componentScope.selector) : document;
  if (!root) return result;

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
  return result;
}
