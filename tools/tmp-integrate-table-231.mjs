import { readFile, writeFile } from 'node:fs/promises';

const path = 'lib/audit/scan.ts';
let source = await readFile(path, 'utf8');

function replaceOnce(before, after) {
  if (!source.includes(before)) throw new Error(`Missing integration anchor: ${before.slice(0, 80)}`);
  source = source.replace(before, after);
}

replaceOnce(
  "import { TEXT_SPACING_ACT_ID_BY_PROPERTY, TEXT_SPACING_RULE } from '../../shared/text-spacing-rules';",
  "import { TEXT_SPACING_ACT_ID_BY_PROPERTY, TEXT_SPACING_RULE } from '../../shared/text-spacing-rules';\nimport { TABLE_RULES } from '../../shared/table-rules';",
);
replaceOnce(
  "import { evaluateTargetSize, type TargetSizeEvaluation } from './target-size';",
  "import { evaluateTableRelationships, type TableRelationshipSignal } from './table-relationships';\nimport { evaluateTargetSize, type TargetSizeEvaluation } from './target-size';",
);

const anchor = `function documentStructureIssueFor(signal: DocumentStructureSignal): ScanIssue {`;
const addition = `function tableRelationshipIssueFor(signal: TableRelationshipSignal): ScanIssue {
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

function appendTableRelationships(result: ScanResult, root: Document | Element): void {
  const evaluation = evaluateTableRelationships(root);
  const additions = evaluation.signals.map(tableRelationshipIssueFor);
  result.issues.push(...additions.filter((issue) => issue.outcome === 'fail'));
  result.review.push(...additions.filter((issue) => issue.outcome === 'review'));
  result.warnings.push(...additions.filter((issue) => issue.outcome === 'warning'));
  result.ruleResults = [...(result.ruleResults ?? []), ...evaluation.ruleResults];
  result.passes += evaluation.passes;
  result.rulesRun += TABLE_RULES.length;
}

`;
replaceOnce(anchor, addition + anchor);
replaceOnce(
  `  appendAutocompletePurposeReview(result, root);\n  appendTextSpacingReview(result, root);`,
  `  appendAutocompletePurposeReview(result, root);\n  appendTableRelationships(result, root);\n  appendTextSpacingReview(result, root);`,
);

await writeFile(path, source, 'utf8');
