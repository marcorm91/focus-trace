import { RULES } from '../../shared/rule-catalog';
import type { ScanIssue } from '../../shared/types';
import type { SiteAuditPageResult, SiteHelpMechanismKind } from './model';

const HELP_KIND_LABEL: Record<SiteHelpMechanismKind, string> = {
  'human-contact-details': 'human contact details',
  'human-contact': 'human contact mechanism',
  'self-help': 'self-help option',
  'automated-contact': 'automated contact mechanism',
};

function stableIssueId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `site-help-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function orderForKinds(
  page: SiteAuditPageResult,
  kinds: Set<SiteHelpMechanismKind>,
): SiteHelpMechanismKind[] {
  return (page.structure?.helpMechanisms ?? [])
    .map((mechanism) => mechanism.kind)
    .filter((kind) => kinds.has(kind));
}

function sharedKinds(
  left: SiteAuditPageResult,
  right: SiteAuditPageResult,
): Set<SiteHelpMechanismKind> {
  const rightKinds = new Set((right.structure?.helpMechanisms ?? []).map((mechanism) => mechanism.kind));
  return new Set(
    (left.structure?.helpMechanisms ?? [])
      .map((mechanism) => mechanism.kind)
      .filter((kind) => rightKinds.has(kind)),
  );
}

function sameOrder(left: SiteHelpMechanismKind[], right: SiteHelpMechanismKind[]): boolean {
  return left.length === right.length && left.every((kind, index) => kind === right[index]);
}

function formatOrder(order: SiteHelpMechanismKind[]): string {
  return order.map((kind) => HELP_KIND_LABEL[kind]).join(' → ');
}

export function buildConsistentHelpReviewByUrl(
  pages: SiteAuditPageResult[],
): Map<string, ScanIssue[]> {
  const eligible = pages.filter((page) =>
    page.scan && (page.structure?.helpMechanisms?.length ?? 0) >= 2,
  );
  const comparisonByUrl = new Map<string, { otherUrl: string; ownOrder: SiteHelpMechanismKind[]; otherOrder: SiteHelpMechanismKind[] }>();

  for (let leftIndex = 0; leftIndex < eligible.length; leftIndex += 1) {
    const left = eligible[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < eligible.length; rightIndex += 1) {
      const right = eligible[rightIndex]!;
      const common = sharedKinds(left, right);
      if (common.size < 2) continue;
      const leftOrder = orderForKinds(left, common);
      const rightOrder = orderForKinds(right, common);
      if (sameOrder(leftOrder, rightOrder)) continue;

      if (!comparisonByUrl.has(left.url)) {
        comparisonByUrl.set(left.url, { otherUrl: right.url, ownOrder: leftOrder, otherOrder: rightOrder });
      }
      if (!comparisonByUrl.has(right.url)) {
        comparisonByUrl.set(right.url, { otherUrl: left.url, ownOrder: rightOrder, otherOrder: leftOrder });
      }
    }
  }

  const rule = RULES.consistentHelp;
  const result = new Map<string, ScanIssue[]>();
  for (const page of eligible) {
    const comparison = comparisonByUrl.get(page.url);
    if (!comparison) continue;
    result.set(page.url, [{
      id: stableIssueId(`${page.url}|${comparison.otherUrl}|${comparison.ownOrder.join(',')}`),
      ruleId: rule.id,
      title: rule.title,
      description: 'The same observed help mechanisms appear in a different relative order across sampled pages. Review whether these mechanisms are within the scope of WCAG 3.2.6 and, if so, keep their relative order consistent.',
      severity: rule.severity,
      outcome: 'review',
      targets: ['page:help-mechanisms'],
      evidence: `Observed order: ${formatOrder(comparison.ownOrder)}. Comparison page ${comparison.otherUrl}: ${formatOrder(comparison.otherOrder)}.`,
      references: rule.references,
    }]);
  }
  return result;
}
