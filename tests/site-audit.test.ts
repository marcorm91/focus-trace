import { describe, expect, it } from 'vitest';
import { buildSiteAuditTemplates, normalizeTargetShape } from '../lib/site-audit/aggregate';
import { normalizeDiscoveredUrl, robotsSitemaps, sitemapLocations } from '../lib/site-audit/discovery';
import {
  SITE_AUDIT_MAX_SCANNED_PAGES,
  type SiteAuditPageResult,
  type SiteAuditResult,
  type SiteAuditRouteFamily,
} from '../lib/site-audit/model';
import { buildRouteFamilies, selectSiteAuditSamples } from '../lib/site-audit/routes';
import { buildSiteAuditTextReport } from '../lib/site-audit/text-report';
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
  it('marks the same structural target as template-wide when every sample has it', () => {
    const family: SiteAuditRouteFamily = {
      id: 'R01',
      pattern: '/product/:item',
      urls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
      sampleUrls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
    };
    const first = family.urls[0]!;
    const second = family.urls[1]!;
    const third = family.urls[2]!;
    const selector = 'main > article > p:nth-of-type(2)';
    const pages: SiteAuditPageResult[] = [
      { url: first, routeFamilyId: family.id, scan: scan(first, selector) },
      { url: second, routeFamilyId: family.id, scan: scan(second, selector) },
      { url: third, routeFamilyId: family.id, scan: scan(third, selector) },
    ];
    const template = buildSiteAuditTemplates([family], pages)[0]!;
    const finding = template.findings[0]!;
    expect(template.findings).toHaveLength(1);
    expect(finding.targetShape).toBe(selector);
    expect(finding.commonToTemplate).toBe(true);
    expect(finding.sampleCount).toBe(3);
  });

  it('keeps exact locations and detailed evidence available to exported site reports', () => {
    const family: SiteAuditRouteFamily = {
      id: 'R01',
      pattern: '/product/:item',
      urls: ['https://shop.test/product/a', 'https://shop.test/product/b'],
      sampleUrls: ['https://shop.test/product/a', 'https://shop.test/product/b'],
    };
    const first = family.urls[0]!;
    const second = family.urls[1]!;
    const selector = 'main > article > p.price';
    const firstScan = scan(first, selector);
    firstScan.issues[0] = {
      ...firstScan.issues[0]!,
      evidence: 'Measured 2.4:1 against the rendered background.',
      contrast: {
        kind: 'text',
        subject: 'price text',
        ratio: 2.4,
        requiredRatio: 4.5,
        foreground: '#777777',
        background: '#ffffff',
        fontSizePx: 16,
        fontWeight: 400,
      },
      references: [
        { type: 'WCAG', id: '1.4.3', label: 'Contrast (Minimum)', level: 'AA', url: 'https://www.w3.org/' },
        { type: 'ACT', id: 'afw4f7', label: 'Text has minimum contrast', url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/' },
      ],
    };
    const pages: SiteAuditPageResult[] = [
      { url: first, routeFamilyId: family.id, scan: firstScan },
      { url: second, routeFamilyId: family.id, scan: scan(second, selector) },
    ];
    const template = buildSiteAuditTemplates([family], pages)[0]!;
    const finding = template.findings[0]!;
    expect(finding.exampleSelector).toBe(selector);
    expect(finding.pages).toEqual([first, second]);

    const result: SiteAuditResult = {
      origin: 'https://shop.test',
      generatedAt: 1,
      discovery: {
        origin: 'https://shop.test',
        source: 'links',
        urls: family.urls,
        sitemapUrls: [],
        truncated: false,
      },
      routeFamilies: [family],
      pages,
      templates: [template],
      scannedPages: 2,
      failedPages: 0,
    };
    const report = buildSiteAuditTextReport(result, 'es');
    expect(report).toContain(`Selector representativo: ${selector}`);
    expect(report).toContain('Páginas donde se observó:');
    expect(report).toContain(first);
    expect(report).toContain(second);
    expect(report).toContain('Contraste medido: 2.4:1');
    expect(report).toContain('WCAG 1.4.3 (AA)');
    expect(report).toContain('ACT afw4f7');
  });

  it('does not conflate the same rule on different positional targets', () => {
    const family: SiteAuditRouteFamily = {
      id: 'R01',
      pattern: '/product/:item',
      urls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
      sampleUrls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
    };
    const first = family.urls[0]!;
    const second = family.urls[1]!;
    const third = family.urls[2]!;
    const pages: SiteAuditPageResult[] = [
      { url: first, routeFamilyId: family.id, scan: scan(first, 'main > p:nth-of-type(2)') },
      { url: second, routeFamilyId: family.id, scan: scan(second, 'main > p:nth-of-type(4)') },
      { url: third, routeFamilyId: family.id, scan: scan(third, 'main > p:nth-of-type(8)') },
    ];
    const template = buildSiteAuditTemplates([family], pages)[0]!;
    expect(template.findings).toHaveLength(3);
    expect(template.findings.every((finding) => !finding.commonToTemplate)).toBe(true);
    expect(template.findings.every((finding) => finding.sampleCount === 1)).toBe(true);
  });

  it('keeps page-specific findings as variations and normalizes clearly dynamic ids', () => {
    const family: SiteAuditRouteFamily = {
      id: 'R01',
      pattern: '/product/:item',
      urls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
      sampleUrls: ['https://shop.test/product/a', 'https://shop.test/product/b', 'https://shop.test/product/c'],
    };
    const first = family.urls[0]!;
    const second = family.urls[1]!;
    const third = family.urls[2]!;
    const pages: SiteAuditPageResult[] = [
      { url: first, routeFamilyId: family.id, scan: scan(first) },
      { url: second, routeFamilyId: family.id, scan: scan(second, undefined, false) },
      { url: third, routeFamilyId: family.id, scan: scan(third, undefined, false) },
    ];
    const template = buildSiteAuditTemplates([family], pages)[0]!;
    const finding = template.findings[0]!;
    expect(finding.commonToTemplate).toBe(false);
    expect(finding.sampleCount).toBe(1);
    expect(normalizeTargetShape('#product-173829')).toBe('#product-*');
  });
});
