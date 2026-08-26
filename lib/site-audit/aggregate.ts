import type { ReportComponentIdentity } from '../report/component-identity';
import type { ScanIssue } from '../../shared/types';
import type {
  SiteAuditFindingAggregate,
  SiteAuditPageResult,
  SiteAuditRouteFamily,
  SiteAuditTemplate,
} from './model';

export function normalizeTargetShape(selector: string): string {
  return selector
    // Keep positional selectors intact. Two pages only share a template-wide
    // finding when the rule lands on the same observed structural target; a
    // low-contrast paragraph in different positions must not be conflated.
    .replace(/#([A-Za-z_-]*)(?:\d{3,}|[0-9a-f]{12,})[A-Za-z0-9_-]*/gi, '#$1*')
    .replace(/\s+/g, ' ')
    .trim();
}

function allIssues(page: SiteAuditPageResult): ScanIssue[] {
  if (!page.scan) return [];
  return [...page.scan.issues, ...page.scan.review, ...(page.scan.warnings ?? [])];
}

function componentForSelector(page: SiteAuditPageResult, selector: string): ReportComponentIdentity | undefined {
  return page.components?.find((component) => component.selector === selector);
}

function aggregateFindings(pages: SiteAuditPageResult[]): SiteAuditFindingAggregate[] {
  const successful = pages.filter((page) => page.scan);
  const totalSamples = successful.length;
  const groups = new Map<string, {
    issue: ScanIssue;
    targetShape: string;
    exampleUrl: string;
    exampleSelector: string;
    component?: ReportComponentIdentity;
    pages: Set<string>;
  }>();

  for (const page of successful) {
    const seenOnPage = new Set<string>();
    for (const issue of allIssues(page)) {
      const exampleSelector = issue.targets[0] ?? 'page';
      const targetShape = normalizeTargetShape(exampleSelector);
      const key = `${issue.ruleId}|${issue.outcome}|${targetShape}`;
      if (seenOnPage.has(key)) continue;
      seenOnPage.add(key);
      const current = groups.get(key) ?? {
        issue,
        targetShape,
        exampleUrl: page.url,
        exampleSelector,
        component: componentForSelector(page, exampleSelector),
        pages: new Set<string>(),
      };
      current.pages.add(page.url);
      groups.set(key, current);
    }
  }

  const componentIds = new Map<string, string>();
  const nextComponentId = (targetShape: string) => {
    const existing = componentIds.get(targetShape);
    if (existing) return existing;
    const id = `E${String(componentIds.size + 1).padStart(2, '0')}`;
    componentIds.set(targetShape, id);
    return id;
  };

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
      commonToTemplate: totalSamples > 1 && value.pages.size === totalSamples,
      references: value.issue.references,
      exampleUrl: value.exampleUrl,
      exampleSelector: value.exampleSelector,
      exampleIssue: value.issue,
      ...(value.component
        ? { component: { ...value.component, componentId: nextComponentId(value.targetShape) } }
        : {}),
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
