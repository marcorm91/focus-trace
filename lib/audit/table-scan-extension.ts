import { TABLE_RULES } from '../../shared/table-rules';
import type { ScanIssue, ScanResult } from '../../shared/types';
import { selectorFor } from './dom';
import { evaluateTableRelationships, type TableRelationshipSignal } from './table-relationships';

type ScanRoot = Document | Element;

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function issueFor(signal: TableRelationshipSignal): ScanIssue {
  return {
    id: uid(),
    ruleId: signal.rule.id,
    title: signal.rule.title,
    description: signal.description,
    severity: signal.rule.severity,
    outcome: signal.outcome,
    targets: [selectorFor(signal.element)],
    evidence: signal.evidence,
    references: signal.rule.references,
  };
}

export function appendTableRelationshipChecks(result: ScanResult, root: ScanRoot): void {
  const evaluation = evaluateTableRelationships(root);
  const findings = evaluation.signals.map(issueFor);

  result.issues.push(...findings.filter((issue) => issue.outcome === 'fail'));
  result.review.push(...findings.filter((issue) => issue.outcome === 'review'));
  result.warnings.push(...findings.filter((issue) => issue.outcome === 'warning'));
  result.ruleResults = [...(result.ruleResults ?? []), ...evaluation.ruleResults];
  result.passes += evaluation.passes;
  result.rulesRun += TABLE_RULES.length;
}
