import { RULES } from '../../shared/rule-catalog';
import type { ScanIssue } from '../../shared/types';
import type { SiteAuditPageResult, SiteFunctionalIdentification } from './model';

function stableIssueId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `site-identification-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizedName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\d+(?:[.,]\d+)*/g, '#')
    .replace(/[^\p{L}\p{N}#]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(value: string): Set<string> {
  return new Set(normalizedName(value).split(' ').filter(Boolean));
}

function namesAreCompatible(left: string, right: string): boolean {
  const leftNormalized = normalizedName(left);
  const rightNormalized = normalizedName(right);
  if (!leftNormalized || !rightNormalized) return true;
  if (leftNormalized === rightNormalized) return true;

  const leftTokens = nameTokens(left);
  const rightTokens = nameTokens(right);
  const smaller = Math.min(leftTokens.size, rightTokens.size);
  if (smaller === 0) return true;

  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }

  // A shorter label contained in a longer label ("Cart" / "View cart") and
  // labels that retain at least half of the smaller label's vocabulary are
  // treated as consistent enough for this conservative automated subset.
  return shared === smaller || shared / smaller >= 0.5;
}

function uniqueByFunction(page: SiteAuditPageResult): Map<string, SiteFunctionalIdentification> {
  const grouped = new Map<string, SiteFunctionalIdentification[]>();
  for (const identification of page.structure?.functionalIdentifications ?? []) {
    if (!identification.pageLanguage) continue;
    const key = `${identification.kind}|${identification.functionKey}`;
    const current = grouped.get(key) ?? [];
    current.push(identification);
    grouped.set(key, current);
  }

  const unique = new Map<string, SiteFunctionalIdentification>();
  for (const [key, identifications] of grouped) {
    // Multiple links to the same destination on one page may be different
    // components (for example a logo plus a footer link). Do not guess which
    // one corresponds to the component observed on another page.
    if (identifications.length === 1) unique.set(key, identifications[0]!);
  }
  return unique;
}

interface IdentificationComparison {
  otherUrl: string;
  own: SiteFunctionalIdentification;
  other: SiteFunctionalIdentification;
}

function comparable(
  left: SiteFunctionalIdentification,
  right: SiteFunctionalIdentification,
): boolean {
  if (left.pageLanguage !== right.pageLanguage) return false;
  if (left.source !== right.source) return false;
  return !namesAreCompatible(left.accessibleName, right.accessibleName);
}

function formatFunction(functionKey: string, pageUrl: string): string {
  try {
    const target = new URL(functionKey);
    const page = new URL(pageUrl);
    return target.origin === page.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : target.toString();
  } catch {
    return functionKey;
  }
}

export function buildConsistentIdentificationReviewByUrl(
  pages: SiteAuditPageResult[],
): Map<string, ScanIssue[]> {
  const eligible = pages.filter((page) => page.scan && (page.structure?.functionalIdentifications?.length ?? 0) > 0);
  const identificationsByPage = new Map(
    eligible.map((page) => [page.url, uniqueByFunction(page)]),
  );
  const comparisonByUrl = new Map<string, IdentificationComparison>();

  for (let leftIndex = 0; leftIndex < eligible.length; leftIndex += 1) {
    const leftPage = eligible[leftIndex]!;
    const leftIdentifications = identificationsByPage.get(leftPage.url)!;
    for (let rightIndex = leftIndex + 1; rightIndex < eligible.length; rightIndex += 1) {
      const rightPage = eligible[rightIndex]!;
      const rightIdentifications = identificationsByPage.get(rightPage.url)!;

      for (const [functionKey, leftIdentification] of leftIdentifications) {
        const rightIdentification = rightIdentifications.get(functionKey);
        if (!rightIdentification || !comparable(leftIdentification, rightIdentification)) continue;

        if (!comparisonByUrl.has(leftPage.url)) {
          comparisonByUrl.set(leftPage.url, {
            otherUrl: rightPage.url,
            own: leftIdentification,
            other: rightIdentification,
          });
        }
        if (!comparisonByUrl.has(rightPage.url)) {
          comparisonByUrl.set(rightPage.url, {
            otherUrl: leftPage.url,
            own: rightIdentification,
            other: leftIdentification,
          });
        }
        break;
      }
    }
  }

  const rule = RULES.consistentIdentification;
  const result = new Map<string, ScanIssue[]>();
  for (const page of eligible) {
    const comparison = comparisonByUrl.get(page.url);
    if (!comparison) continue;
    const functionLabel = formatFunction(comparison.own.functionKey, page.url);
    result.set(page.url, [{
      id: stableIssueId(`${page.url}|${comparison.otherUrl}|${comparison.own.functionKey}`),
      ruleId: rule.id,
      title: rule.title,
      description: 'A uniquely observed native link points to the same exact destination on sampled pages in the same declared page language, but its identification is substantially different. Review whether the links provide the same functionality and, if so, whether their labels or accessible names are identified consistently for WCAG 3.2.4.',
      severity: rule.severity,
      outcome: 'review',
      targets: ['page:consistent-identification'],
      evidence: `Function destination: ${functionLabel}. Observed identification: "${comparison.own.accessibleName}" (${comparison.own.source}). Comparison page ${comparison.otherUrl}: "${comparison.other.accessibleName}" (${comparison.other.source}).`,
      references: rule.references,
    }]);
  }
  return result;
}
