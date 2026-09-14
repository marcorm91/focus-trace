import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITE_AUDIT_MAX_SCANNED_PAGES } from '../lib/site-audit/model';
import { buildRouteFamilies } from '../lib/site-audit/routes';
import {
  manualSiteAuditDiscovery,
  normalizeSiteAuditRoot,
  parseManualSiteAuditUrls,
  selectManualSiteAuditSamples,
} from '../lib/site-audit/scope';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Site Audit scope modes', () => {
  it('normalizes an entered parent domain to its root', () => {
    expect(normalizeSiteAuditRoot('www.example.test/section/page', 'https:')).toBe('https://www.example.test/');
    expect(normalizeSiteAuditRoot('http://example.test/products?q=1#top')).toBe('http://example.test/');
  });

  it('keeps manual selection on one origin, removes duplicates and caps scans', () => {
    const lines = [
      '/contact',
      'https://example.test/products',
      'https://example.test/products',
      'https://other.test/outside',
      ...Array.from({ length: SITE_AUDIT_MAX_SCANNED_PAGES + 4 }, (_, index) => `/page-${index}`),
    ].join('\n');

    const selection = parseManualSiteAuditUrls(lines, 'https://example.test');
    expect(selection.invalid).toEqual(['https://other.test/outside']);
    expect(selection.duplicateCount).toBe(1);
    expect(selection.totalValid).toBeGreaterThan(SITE_AUDIT_MAX_SCANNED_PAGES);
    expect(selection.urls).toHaveLength(SITE_AUDIT_MAX_SCANNED_PAGES);
    expect(selection.truncated).toBe(true);
  });

  it('scans every selected manual URL rather than representative samples', () => {
    const urls = [
      'https://example.test/product/a',
      'https://example.test/product/b',
      'https://example.test/product/c',
      'https://example.test/product/d',
    ];
    const families = buildRouteFamilies(urls);
    const samples = selectManualSiteAuditSamples(families, urls);
    expect(samples.map((sample) => sample.url)).toEqual(urls);
    expect(samples.every((sample) => sample.selectionReason === 'manual-selection')).toBe(true);

    const discovery = manualSiteAuditDiscovery('https://example.test', {
      urls,
      totalValid: urls.length,
      invalid: [],
      duplicateCount: 0,
      truncated: false,
    });
    expect(discovery.source).toBe('manual');
    expect(discovery.urls).toEqual(urls);
  });

  it('uses the same explicit selection boundary for current-session private routes', () => {
    const urls = ['https://example.test/account', 'https://example.test/dashboard'];
    const families = buildRouteFamilies(urls);
    const discovery = manualSiteAuditDiscovery('https://example.test', {
      urls,
      totalValid: urls.length,
      invalid: [],
      duplicateCount: 0,
      truncated: false,
    }, 'session');
    expect(discovery.source).toBe('session');
    expect(selectManualSiteAuditSamples(families, urls, 'session'))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ selectionReason: 'current-session' }),
      ]));
  });

  it('renders complete roving tabs for automatic, manual and current-session audits', () => {
    const app = source('entrypoints/site-audit/main.tsx');
    const scope = source('lib/site-audit/scope.ts');
    const css = source('entrypoints/site-audit/scope-tabs.css');

    expect(app).toContain("type SiteAuditInputMode");
    expect(app).toContain('useRovingTabs');
    expect(app).toContain("scopeTabProps('automatic')");
    expect(app).toContain("scopeTabProps('manual')");
    expect(app).toContain("scopeTabProps('session')");
    expect(app).toContain('role="tablist"');
    expect(app).toContain('aria-controls="site-scope-panel-automatic"');
    expect(app).toContain('aria-controls="site-scope-panel-manual"');
    expect(app).toContain('aria-controls="site-scope-panel-session"');
    expect(app).toContain('id="site-scope-panel-automatic"');
    expect(app).toContain('id="site-scope-panel-manual"');
    expect(app).toContain('id="site-scope-panel-session"');
    expect(app).toContain("hidden={mode !== 'automatic'}");
    expect(app).toContain("hidden={mode !== 'manual'}");
    expect(app).toContain("hidden={mode !== 'session'}");
    expect(app).toContain('selectManualSiteAuditSamples');
    expect(scope).toContain('source: mode');
    expect(css).toContain('.site-scope-tabs');
    expect(css).toContain("button[aria-selected='true']");
  });
});
