import {
  ARIA_DESCRIPTION_EQUIVALENCE_RULE,
  ARIA_HIDDEN_BODY_RULE,
  ARIA_HOST_CONSTRAINT_RULE,
} from '../../shared/aria-role-state-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import {
  evaluateAriaRoleStateRelationships,
  type AriaRoleStateRelationshipEvaluation,
  type AriaRoleStateRelationshipFamily,
} from './aria-role-state-relationships';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
type ScanRoot = Document | Element;

const RULE_BY_FAMILY = {
  'hidden-body': ARIA_HIDDEN_BODY_RULE,
  'host-constraint': ARIA_HOST_CONSTRAINT_RULE,
  'description-equivalence': ARIA_DESCRIPTION_EQUIVALENCE_RULE,
} satisfies Record<AriaRoleStateRelationshipFamily, typeof ARIA_HIDDEN_BODY_RULE>;

function issueFor(evaluation: AriaRoleStateRelationshipEvaluation): ScanIssue {
  const rule = RULE_BY_FAMILY[evaluation.family];
  const descriptions: Record<AriaRoleStateRelationshipFamily, string> = {
    'hidden-body': 'The document body is hidden from the accessibility tree. This can remove the page semantics and relationships that assistive technologies need to perceive and operate the document.',
    'host-constraint': 'ARIA authoring conflicts with a host-language or conditional semantic constraint. Correct the HTML/ARIA source of truth instead of relying on browser repair.',
    'description-equivalence': 'Braille-specific or custom role-description authoring needs an equivalent non-braille semantic label or valid role context. Review the author intent and resulting assistive-technology exposure.',
  };
  return {
    id: uid(),
    ruleId: rule.id,
    title: rule.title,
    description: descriptions[evaluation.family],
    severity: rule.severity,
    outcome: evaluation.outcome === 'fail'
      ? 'fail'
      : evaluation.outcome === 'warning'
        ? 'warning'
        : 'review',
    targets: [selectorFor(evaluation.element)],
    evidence: evaluation.detail,
    references: rule.references,
  };
}

export function appendAriaRoleStateRelationshipChecks(result: ScanResult, root: ScanRoot): void {
  const evaluations = evaluateAriaRoleStateRelationships(root);

  for (const family of ['hidden-body', 'host-constraint', 'description-equivalence'] as const) {
    const rule = RULE_BY_FAMILY[family];
    const relevant = evaluations.filter((evaluation) => evaluation.family === family);
    const failures = relevant.filter((evaluation) => evaluation.outcome === 'fail');
    const warnings = relevant.filter((evaluation) => evaluation.outcome === 'warning');
    const reviews = relevant.filter((evaluation) => evaluation.outcome === 'review');
    const passes = relevant.filter((evaluation) => evaluation.outcome === 'pass').length;

    result.issues.push(...failures.map(issueFor));
    result.warnings.push(...warnings.map(issueFor));
    result.review.push(...reviews.map(issueFor));
    result.ruleResults = [
      ...(result.ruleResults ?? []),
      {
        ruleId: rule.id,
        applicable: relevant.length,
        passed: passes,
        failures: failures.length,
        reviews: reviews.length,
        warnings: warnings.length,
        ...(family === 'host-constraint' ? { coverage: 'findings-only' as const } : {}),
      },
    ];
    result.passes += passes;
    result.rulesRun += 1;
  }
}
