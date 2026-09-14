import { describe, expect, it } from 'vitest';
import {
  appendSiteAuditBaseline,
  compareSiteAuditBaselines,
  latestSiteAuditBaseline,
  normalizeSiteAuditBaselineStore,
  siteAuditBaselineFromResult,
} from '../lib/site-audit/baseline';
import {
  SITE_AUDIT_MAX_BASELINES,
  type SiteAuditFindingAggregate,
  type SiteAuditResult,
} from '../lib/site-audit/model';
import type { ScanIssue } from '../shared/types';

function finding(ruleId = 'FT-WCAG-010', outcome: ScanIssue['outcome'] = 'fail', severity: ScanIssue['severity'] = 'serious'): SiteAuditFindingAggregate {
  const issue: ScanIssue = {
    id: `${ruleId}-issue`,
    ruleId,
    title: 'Example finding',
    description: 'Example evidence.',
    severity,
    outcome,
    targets: ['main > p'],
    references: [],
  };
  return {
    key: `${ruleId}::main > p`,
    ruleId,
    outcome,
    title: issue.title,
    targetShape: 'main > p',
    pages: ['https://example.test/private?session=secret'],
    sampleCount: 1,
    totalSamples: 1,
    commonToTemplate: false,
    references: [],
    exampleUrl: 'https://example.test/private?session=secret',
    exampleSelector: 'main > p',
    exampleIssue: issue,
  };
}

function result(generatedAt: number, findings = [finding()], mode: 'automatic' | 'manual' | 'session' = 'automatic'): SiteAuditResult {
  const url = 'https://example.test/private?session=secret';
  return {
    origin: 'https://example.test',
    generatedAt,
    discovery: {
      origin: 'https://example.test',
      source: mode === 'automatic' ? 'links' : mode,
      urls: [url],
      sitemapUrls: [],
      truncated: false,
      scope: {
        mode,
        maxDiscoveredUrls: 100,
        maxScannedPages: 10,
        samplesPerFamily: 2,
        exclusionPrefixes: ['/logout'],
      },
    },
    routeFamilies: [{ id: 'R01', pattern: '/private', urls: [url], sampleUrls: [url] }],
    pages: [],
    templates: [{
      id: 'T01',
      label: '/private',
      routePatterns: ['/private'],
      discoveredUrls: [url],
      sampledPages: [],
      findings,
      failures: findings.filter((item) => item.outcome === 'fail').length,
      reviews: findings.filter((item) => item.outcome === 'review').length,
      warnings: findings.filter((item) => item.outcome === 'warning').length,
    }],
    scannedPages: 1,
    failedPages: 0,
  };
}

describe('Site Audit baselines', () => {
  it('stores only redacted aggregate identity rather than page URLs or session values', () => {
    const baseline = siteAuditBaselineFromResult(result(1, undefined, 'session'));
    const serialized = JSON.stringify(baseline);
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('?session=');
    expect(serialized).not.toContain('example.test/private?');
    expect(baseline.findings[0]).toMatchObject({ routePattern: '/private', ruleId: 'FT-WCAG-010' });
  });

  it('compares compatible baselines as new, persistent, changed and resolved', () => {
    const previous = siteAuditBaselineFromResult(result(1, [
      finding('FT-WCAG-010', 'fail', 'serious'),
      finding('FT-WCAG-002', 'fail', 'critical'),
      finding('FT-REVIEW-001', 'review', 'moderate'),
    ]));
    const current = siteAuditBaselineFromResult(result(2, [
      finding('FT-WCAG-010', 'fail', 'serious'),
      finding('FT-WCAG-002', 'fail', 'moderate'),
      finding('FT-WCAG-003', 'fail', 'serious'),
    ]));
    const comparison = compareSiteAuditBaselines(current, previous)!;
    expect(comparison.compatible).toBe(true);
    expect(comparison).toMatchObject({ newCount: 1, persistentCount: 1, changedCount: 1, resolvedCount: 1 });
  });

  it('does not claim resolutions after the audit scope changes', () => {
    const previous = siteAuditBaselineFromResult(result(1, [finding()], 'automatic'));
    const current = siteAuditBaselineFromResult(result(2, [], 'manual'));
    expect(compareSiteAuditBaselines(current, previous)).toMatchObject({
      compatible: false,
      reason: 'scope-changed',
      resolvedCount: 0,
    });
  });

  it('keeps baseline history bounded and returns the latest baseline for an origin', () => {
    let store = normalizeSiteAuditBaselineStore(undefined);
    for (let index = 0; index < SITE_AUDIT_MAX_BASELINES + 4; index += 1) {
      store = appendSiteAuditBaseline(store, siteAuditBaselineFromResult(result(index + 1)));
    }
    expect(store.baselines).toHaveLength(SITE_AUDIT_MAX_BASELINES);
    expect(latestSiteAuditBaseline(store, 'https://example.test')?.generatedAt).toBe(SITE_AUDIT_MAX_BASELINES + 4);
  });
});
