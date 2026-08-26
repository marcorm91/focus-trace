import type { ScanIssue } from '../../shared/types';
import type {
  SiteAuditFindingAggregate,
  SiteAuditPageResult,
  SiteAuditRouteFamily,
  SiteAuditTemplate,
} from './model';

export function normalizeTargetShape(selector: string): string {
  return selector
    .replace(/:nth-of-type\(\d+\)/g, ':nth-of-type(*)')
    .replace(/:nth-child\(\d+\)/g, ':nth-child(*)')
    .replace(/#([A-Za-z_-]*)(?:\d{3,}|[0-9a-f]{12,})[A-Za-z0-9_-]*/gi, '#$1*')
    .replace(/\s+/g, ' ')
    .trim();
}

function allIssues(page: SiteAuditPageResult): ScanIssue[] {
  if (!page.scan) return [];
  return [...page.scan.issues, ...page.scan.review, ...(page.scan.warnings ?? [])];
}

function aggregateFindings(pages: SiteAuditPageResult[]): SiteAuditFindingAggregate[] {
  const successful = pages.filter((page) => page.scan);
  const totalSamples = successful.length;
  const groups = new Map<string, {
    issue: ScanIssue;
    targetShape: string;
    pages: Set<string>;
  }>();

  for (const page of successful) {
    const seenOnPage = new Set<string>();
    for (const issue of allIssues(page)) {
      const targetShape = normalizeTargetShape(issue.targets[0] ?? 'page');
      const key = `${issue.ruleId}|${issue.outcome}|${targetShape}`;
      if (seenOnPage.has(key)) continue;
      seenOnPage.add(key);
      const current = groups.get(key) ?? { issue, targetShape, pages: new Set<string>() };
      current.pages.add(page.url);
      groups.set(key, current);
    }
  }

  return [...groups.entries()]
    .map(([key, value]) => ({
      key,
      ruleId: value.issue.ruleId,
      outcome: value.issue.outcome,
      title: value.issue.title,
      targetShape: value.targetShape,
      pages: [...value.pages],
      sampleCount: value.pages.size,
      totalSamples,
      commonToTemplate: totalSamples > 0
        && value.pages.size === totalSamples
        && (totalSamples > 1 || pages.length === 1),
      references: value.issue.references,
    }))
    .sort((a, b) => {
      const outcomeOrder = { fail: 0, review: 1, warning: 2 } as const;
      return outcomeOrder[a.outcome] - outcomeOrder[b.outcome]
        || b.sampleCount - a.sampleCount
        || a.ruleId.localeCompare(b.ruleId);
    });
}

export function buildSiteAuditTemplates(
  families: SiteAuditRouteFamily[],
  pages: SiteAuditPageResult[],
): SiteAuditTemplate[] {
  return families.map((family, index) => {
    const sampledPages = pages.filter((page) => page.routeFamilyId === family.id);
    const successful = sampledPages.filter((page) => page.scan);
    const fingerprints = new Set(successful.flatMap((page) => page.structure?.fingerprint ? [page.structure.fingerprint] : []));
    const findings = aggregateFindings(sampledPages);
    return {
      id: `T${String(index + 1).padStart(2, '0')}`,
      label: family.pattern,
      routePatterns: [family.pattern],
      discoveredUrls: family.urls,
      sampledPages,
      ...(fingerprints.size === 1 ? { fingerprint: [...fingerprints][0] } : {}),
      findings,
      failures: findings.filter((finding) => finding.outcome === 'fail').length,
      reviews: findings.filter((finding) => finding.outcome === 'review').length,
      warnings: findings.filter((finding) => finding.outcome === 'warning').length,
    };
  });
}
