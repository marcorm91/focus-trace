import { RULES } from '../../shared/rule-catalog';
import type { ScanIssue } from '../../shared/types';
import type { SiteAuditPageResult, SiteNavigationMechanism } from './model';

const MIN_REPEATED_DESTINATIONS = 3;

function stableIssueId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `site-navigation-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function signatureFor(mechanism: SiteNavigationMechanism): string | undefined {
  const unique = [...new Set(mechanism.destinations)];
  if (unique.length < MIN_REPEATED_DESTINATIONS) return undefined;
  return [...unique].sort().join('\u001f');
}

function uniqueMechanismsBySignature(page: SiteAuditPageResult): Map<string, SiteNavigationMechanism> {
  const grouped = new Map<string, SiteNavigationMechanism[]>();
  for (const mechanism of page.structure?.navigationMechanisms ?? []) {
    const signature = signatureFor(mechanism);
    if (!signature) continue;
    const current = grouped.get(signature) ?? [];
    current.push(mechanism);
    grouped.set(signature, current);
  }

  const unique = new Map<string, SiteNavigationMechanism>();
  for (const [signature, mechanisms] of grouped) {
    // If the same exact destination set occurs more than once on one page,
    // pairing it with another page is ambiguous. Prefer no finding over
    // guessing which repeated navigation block corresponds to which.
    if (mechanisms.length === 1) unique.set(signature, mechanisms[0]!);
  }
  return unique;
}

function sameOrder(left: SiteNavigationMechanism, right: SiteNavigationMechanism): boolean {
  return left.destinations.length === right.destinations.length
    && left.destinations.every((destination, index) => destination === right.destinations[index]);
}

function formatDestination(destination: string, pageUrl: string): string {
  try {
    const parsed = new URL(destination);
    const page = new URL(pageUrl);
    return parsed.origin === page.origin
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : parsed.toString();
  } catch {
    return destination;
  }
}

function formatOrder(mechanism: SiteNavigationMechanism, pageUrl: string): string {
  return mechanism.destinations
    .map((destination) => formatDestination(destination, pageUrl))
    .join(' → ');
}

interface NavigationComparison {
  otherUrl: string;
  own: SiteNavigationMechanism;
  other: SiteNavigationMechanism;
}

export function buildConsistentNavigationReviewByUrl(
  pages: SiteAuditPageResult[],
): Map<string, ScanIssue[]> {
  const eligible = pages.filter((page) => page.scan && (page.structure?.navigationMechanisms?.length ?? 0) > 0);
  const mechanismsByPage = new Map(
    eligible.map((page) => [page.url, uniqueMechanismsBySignature(page)]),
  );
  const comparisonByUrl = new Map<string, NavigationComparison>();

  for (let leftIndex = 0; leftIndex < eligible.length; leftIndex += 1) {
    const left = eligible[leftIndex]!;
    const leftMechanisms = mechanismsByPage.get(left.url)!;
    for (let rightIndex = leftIndex + 1; rightIndex < eligible.length; rightIndex += 1) {
      const right = eligible[rightIndex]!;
      const rightMechanisms = mechanismsByPage.get(right.url)!;

      for (const [signature, leftMechanism] of leftMechanisms) {
        const rightMechanism = rightMechanisms.get(signature);
        if (!rightMechanism || sameOrder(leftMechanism, rightMechanism)) continue;

        if (!comparisonByUrl.has(left.url)) {
          comparisonByUrl.set(left.url, { otherUrl: right.url, own: leftMechanism, other: rightMechanism });
        }
        if (!comparisonByUrl.has(right.url)) {
          comparisonByUrl.set(right.url, { otherUrl: left.url, own: rightMechanism, other: leftMechanism });
        }
        break;
      }
    }
  }

  const rule = RULES.consistentNavigation;
  const result = new Map<string, ScanIssue[]>();
  for (const page of eligible) {
    const comparison = comparisonByUrl.get(page.url);
    if (!comparison) continue;
    const ownOrder = formatOrder(comparison.own, page.url);
    const otherOrder = formatOrder(comparison.other, comparison.otherUrl);
    result.set(page.url, [{
      id: stableIssueId(`${page.url}|${comparison.otherUrl}|${comparison.own.destinations.join(',')}`),
      ruleId: rule.id,
      title: rule.title,
      description: 'The same repeated navigation destination set appears in a different relative order across sampled pages. Review whether this is the same repeated navigational mechanism and whether the change was user-initiated before treating it as a WCAG 3.2.3 issue.',
      severity: rule.severity,
      outcome: 'review',
      targets: ['page:navigation-order'],
      evidence: `Observed navigation order: ${ownOrder}. Comparison page ${comparison.otherUrl}: ${otherOrder}.`,
      references: rule.references,
    }]);
  }
  return result;
}
