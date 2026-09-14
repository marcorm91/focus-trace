import { describe, expect, it } from 'vitest';
import { normalizeDiscoveredUrl, siteAuditDecisionUrl } from '../lib/site-audit/discovery';
import { buildRouteFamilies, selectSiteAuditSamples } from '../lib/site-audit/routes';
import {
  manualSiteAuditDiscovery,
  normalizeSiteAuditExclusionPrefixes,
  parseManualSiteAuditUrls,
  selectManualSiteAuditSamples,
} from '../lib/site-audit/scope';

describe('Site Audit explainable discovery configuration', () => {
  it('removes credentials, tracking and common session-token parameters from normalized URLs', () => {
    expect(normalizeDiscoveredUrl(
      'https://user:password@example.test/private?utm_source=x&session=secret&view=compact#top',
      'https://example.test',
    )).toBe('https://example.test/private?view=compact');
    expect(siteAuditDecisionUrl(
      'https://example.test/private?token=secret&view=compact',
      'https://example.test',
    )).toBe('https://example.test/private?view=%E2%80%A6');
  });

  it('normalizes deterministic path-prefix exclusions', () => {
    expect(normalizeSiteAuditExclusionPrefixes('account/settings/\n/logout\n/logout\nhttps://example.test/internal/'))
      .toEqual(['/account/settings', '/internal', '/logout']);
  });

  it('keeps grouping and representative sampling stable for deterministic input', () => {
    const urls = [
      'https://example.test/product/c',
      'https://example.test/product/a',
      'https://example.test/product/d',
      'https://example.test/product/b',
      'https://example.test/contact',
    ];
    const first = buildRouteFamilies(urls, 2);
    const second = buildRouteFamilies([...urls].reverse(), 2);
    expect(first).toEqual(second);
    const product = first.find((family) => family.pattern === '/product/:item');
    expect(product?.sampleUrls).toEqual([
      'https://example.test/product/a',
      'https://example.test/product/d',
    ]);
    expect(selectSiteAuditSamples(first, 2)).toHaveLength(2);
    expect(selectSiteAuditSamples(first, 2).every((sample) => sample.selectionReason === 'family-first')).toBe(true);
  });

  it('represents authenticated routes as current-session selections without credential storage', () => {
    const selection = parseManualSiteAuditUrls('/account?session=secret\n/dashboard', 'https://example.test');
    expect(selection.urls[0]).toBe('https://example.test/account');
    const discovery = manualSiteAuditDiscovery('https://example.test', selection, 'session');
    expect(discovery.source).toBe('session');
    expect(discovery.decisions?.every((decision) => decision.reason === 'current-session')).toBe(true);
    expect(JSON.stringify(discovery)).not.toContain('secret');

    const families = buildRouteFamilies(discovery.urls);
    expect(selectManualSiteAuditSamples(families, discovery.urls, 'session')
      .every((sample) => sample.selectionReason === 'current-session')).toBe(true);
  });
});
