import type { ComponentScanScope, FindingOutcome, ScanIssue, ScanResult } from '../../shared/types';
import {
  HTML_CONTENT_MODEL_RULE,
  HTML_PARENT_CONTEXT_RULE,
  MAIN_HIERARCHY_RULE,
  NESTED_INTERACTIVE_CONTENT_RULE,
  REPEATED_LANDMARK_LABEL_RULE,
  SECTION_HEADING_REVIEW_RULE,
  STRUCTURAL_HTML_RULES,
} from '../../shared/structural-html-rules';
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
      };
    }),
  ];
  result.rulesRun += activeRules.length;
  return result;
}
