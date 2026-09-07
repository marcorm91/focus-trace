import { describe, expect, it } from 'vitest';
import { buildConsistentNavigationReviewByUrl } from '../lib/site-audit/consistent-navigation';
import type { SiteAuditPageResult } from '../lib/site-audit/model';
import type { ScanResult } from '../shared/types';

function scan(url: string): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url,
    title: url,
    scannedAt: 1,
    issues: [],
    review: [],
    warnings: [],
    headings: [],
    passes: 0,
    rulesRun: 0,
  };
}

function absolute(path: string): string {
  return new URL(path, 'https://example.test').toString();
}

function page(url: string, mechanisms: string[][]): SiteAuditPageResult {
  return {
    url,
    routeFamilyId: 'R01',
    scan: scan(url),
    structure: {
      fingerprint: 'F00000001',
      semanticTokens: ['nav'],
      headingLevels: [],
      interactiveCount: mechanisms.reduce((sum, destinations) => sum + destinations.length, 0),
      landmarkCount: mechanisms.length,
      navigationMechanisms: mechanisms.map((destinations, index) => ({
        selector: `#nav-${index + 1}`,
        destinations: destinations.map(absolute),
      })),
    },
  };
}

describe('WCAG 3.2.3 consistent navigation site review', () => {
  it('does not report the same repeated destination set when its order is stable', () => {
    const destinations = ['/home', '/products', '/support', '/account'];
    const reviews = buildConsistentNavigationReviewByUrl([
      page('https://example.test/a', [destinations]),
      page('https://example.test/b', [destinations]),
    ]);

    expect(reviews.size).toBe(0);
  });

  it('reviews only when the exact repeated destination set changes relative order', () => {
    const first = 'https://example.test/a';
    const second = 'https://example.test/b';
    const reviews = buildConsistentNavigationReviewByUrl([
      page(first, [['/home', '/products', '/support', '/account']]),
      page(second, [['/products', '/home', '/support', '/account']]),
    ]);

    expect(reviews.size).toBe(2);
    for (const url of [first, second]) {
      const issue = reviews.get(url)?.[0];
      expect(issue).toMatchObject({
        ruleId: 'FT-REVIEW-013',
        outcome: 'review',
        severity: 'moderate',
        targets: ['page:navigation-order'],
      });
      expect(issue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '3.2.3')).toBe(true);
      expect(issue?.evidence).toContain('Comparison page');
    }
  });

  it('does not compare navigation blocks with fewer than three unique destinations', () => {
    const reviews = buildConsistentNavigationReviewByUrl([
      page('https://example.test/a', [['/home', '/support']]),
      page('https://example.test/b', [['/support', '/home']]),
    ]);

    expect(reviews.size).toBe(0);
  });

  it('does not treat partially overlapping navigation blocks as the same mechanism', () => {
    const reviews = buildConsistentNavigationReviewByUrl([
      page('https://example.test/a', [['/home', '/products', '/support', '/account']]),
      page('https://example.test/b', [['/products', '/home', '/support', '/contact']]),
    ]);

    expect(reviews.size).toBe(0);
  });

  it('does not guess when the same destination set occurs more than once on a page', () => {
    const firstOrder = ['/home', '/products', '/support', '/account'];
    const secondOrder = ['/products', '/home', '/support', '/account'];
    const reviews = buildConsistentNavigationReviewByUrl([
      page('https://example.test/a', [firstOrder, firstOrder]),
      page('https://example.test/b', [secondOrder]),
    ]);

    expect(reviews.size).toBe(0);
  });
});
