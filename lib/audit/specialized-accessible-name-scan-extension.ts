import {
  RANGE_INDICATOR_NAME_RULE,
  SPECIALIZED_ARIA_NAME_WARNING_RULE,
  SPECIALIZED_CONTROL_NAME_RULE,
} from '../../shared/specialized-accessible-name-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import {
  evaluateSpecializedAccessibleNames,
  type SpecializedAccessibleNameEvaluation,
  type SpecializedAccessibleNameFamily,
} from './specialized-accessible-names';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
type ScanRoot = Document | Element;

const RULE_BY_FAMILY = {
  'wcag-control': SPECIALIZED_CONTROL_NAME_RULE,
  'wcag-range': RANGE_INDICATOR_NAME_RULE,
  'aria-warning': SPECIALIZED_ARIA_NAME_WARNING_RULE,
} satisfies Record<SpecializedAccessibleNameFamily, typeof SPECIALIZED_CONTROL_NAME_RULE>;

function issueFor(evaluation: SpecializedAccessibleNameEvaluation): ScanIssue {
  const rule = RULE_BY_FAMILY[evaluation.family];
  const warning = evaluation.family === 'aria-warning';
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: warning
      ? 'This exposed ARIA dialog or tree item has no usable accessible name. Correct the authoring semantics so assistive-technology users can identify the component.'
      : 'This exposed specialized control or range indicator has an empty accessible name, so assistive technologies cannot identify what the component represents.',
    severity: rule.severity,
    outcome: warning ? 'warning' : 'fail',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    accessibleName: evaluation.evidence,
    references: rule.references,
  };
}

export function appendSpecializedAccessibleNameChecks(result: ScanResult, root: ScanRoot): void {
  const evaluations = evaluateSpecializedAccessibleNames(root);

  for (const family of ['wcag-control', 'wcag-range', 'aria-warning'] as const) {
    const rule = RULE_BY_FAMILY[family];
    const relevant = evaluations.filter((evaluation) => evaluation.family === family);
    const failures = relevant.filter((evaluation) => evaluation.outcome === 'fail');
    const warnings = relevant.filter((evaluation) => evaluation.outcome === 'warning');
    const passes = relevant.filter((evaluation) => evaluation.outcome === 'pass').length;

    result.issues.push(...failures.map(issueFor));
    result.warnings.push(...warnings.map(issueFor));
    result.ruleResults = [
      ...(result.ruleResults ?? []),
      {
        ruleId: rule.id,
        applicable: relevant.length,
        passed: passes,
        failures: failures.length,
        reviews: 0,
        warnings: warnings.length,
      },
    ];
    result.passes += passes;
    result.rulesRun += 1;
  }
}
