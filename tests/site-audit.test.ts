import { describe, expect, it } from 'vitest';
import { buildSiteAuditTemplates, normalizeTargetShape } from '../lib/site-audit/aggregate';
import { normalizeDiscoveredUrl, robotsSitemaps, sitemapLocations } from '../lib/site-audit/discovery';
import { SITE_AUDIT_MAX_SCANNED_PAGES, type SiteAuditPageResult, type SiteAuditRouteFamily } from '../lib/site-audit/model';
import { buildRouteFamilies, selectSiteAuditSamples } from '../lib/site-audit/routes';
import type { ScanResult } from '../shared/types';

function scan(url: string, selector = 'main > p:nth-of-type(2)', includeFailure = true): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url,
    title: url,
    scannedAt: 1,
    issues: includeFailure ? [{
      id: `issue-${url}`,
      ruleId: 'FT-WCAG-010',
      title: 'Text contrast is below the required minimum',
      description: 'Contrast is low.',
      severity: 'serious',
      outcome: 'fail',
      targets: [selector],
      references: [{ type: 'WCAG', id: '1.4.3', label: 'Contrast', url: 'https://www.w3.org/' }],
    }] : [],
    review: [],
    warnings: [],
    headings: [],
    passes: 1,
    rulesRun: 17,
  };
}

describe('Site Audit discovery', () => {
  it('parses robots sitemap declarations and sitemap XML', () => {
    expect(robotsSitemaps('User-agent: *\nSitemap: https://example.test/sitemap.xml\n')).toEqual([
      'https://example.test/sitemap.xml',
    ]);
    expect(sitemapLocations('<?xml version="1.0"?><sitemapindex><sitemap><loc>https://example.test/products.xml</loc></sitemap></sitemapindex>')).toEqual({
      kind: 'index',
      locations: ['https://example.test/products.xml'],
    });
    expect(sitemapLocations('<urlset><url><loc>https://example.test/a&amp;b</loc></url></urlset>')).toEqual({
      kind: 'urls',
      locations: ['https://example.test/a&b'],
    });
  });

  it('keeps discovery on the current origin and removes tracking noise', () => {
    expect(normalizeDiscoveredUrl('https://example.test/product/a?utm_source=x&size=m#reviews', 'https://example.test'))
      .toBe('https://example.test/product/a?size=m');
    expect(normalizeDiscoveredUrl('https://other.test/product/a', 'https://example.test')).toBeUndefined();
  });
});

describe('Site Audit route sampling', () => {
  it('groups repeated product URLs into a representative route family', () => {
    const families = buildRouteFamilies([
      'https://shop.test/product/red-shirt',
      'https://shop.test/product/blue-shirt',
      'https://shop.test/product/black-jeans',
      'https://shop.test/product/green-dress',
      'https://shop.test/contact',
    ]);
    const products = families.find((family) => family.pattern === '/product/:item');
    expect(products?.urls).toHaveLength(4);
    expect(products?.sampleUrls).toHaveLength(3);
    expect(families.some((family) => family.pattern === '/contact')).toBe(true);
  });

  it('never schedules more than the site scan safety limit', () => {
    const families: SiteAuditRouteFamily[] = Array.from({ length: 40 }, (_, index) => ({
      id: `R${index}`,
      pattern: `/section-${index}/:item`,
      urls: [`https://example.test/${index}/a`, `https://example.test/${index}/b`, `https://example.test/${index}/c`],
      sampleUrls: [`https://example.test/${index}/a`, `https://example.test/${index}/b`, `https://example.test/${index}/c`],
    }));
    expect(selectSiteAuditSamples(families)).toHaveLength(SITE_AUDIT_MAX_SCANNED_PAGES);
  });
});

describe('Site Audit finding aggregation', () => {
  it('marks a normalized finding as template-wide only when every sample has it', () => {
    const family: SiteAuditRouteFamily = {
      id: 'R01',
      pattern: '/product/:item',
      urls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
      sampleUrls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
    };
    const pages: SiteAuditPageResult[] = [
      { url: family.urls[0], routeFamilyId: family.id, scan: scan(family.urls[0], 'main > p:nth-of-type(2)') },
      { url: family.urls[1], routeFamilyId: family.id, scan: scan(family.urls[1], 'main > p:nth-of-type(4)') },
      { url: family.urls[2], routeFamilyId: family.id, scan: scan(family.urls[2], 'main > p:nth-of-type(8)') },
    ];
    const template = buildSiteAuditTemplates([family], pages)[0];
    expect(template.findings).toHaveLength(1);
    expect(template.findings[0].targetShape).toBe('main > p:nth-of-type(*)');
    expect(template.findings[0].commonToTemplate).toBe(true);
    expect(template.findings[0].sampleCount).toBe(3);
  });

  it('keeps page-specific findings as variations', () => {
    const family: SiteAuditRouteFamily = {
      id: 'R01',
      pattern: '/product/:item',
      urls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
      sampleUrls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
    };
    const pages: SiteAuditPageResult[] = [
      { url: family.urls[0], routeFamilyId: family.id, scan: scan(family.urls[0]) },
      { url: family.urls[1], routeFamilyId: family.id, scan: scan(family.urls[1], undefined, false) },
      { url: family.urls[2], routeFamilyId: family.id, scan: scan(family.urls[2], undefined, false) },
    ];
    const template = buildSiteAuditTemplates([family], pages)[0];
    expect(template.findings[0].commonToTemplate).toBe(false);
    expect(template.findings[0].sampleCount).toBe(1);
    expect(normalizeTargetShape('#product-173829')).toBe('#product-*');
  });
});
