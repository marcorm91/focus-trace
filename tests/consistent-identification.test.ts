import { describe, expect, it } from 'vitest';
import { buildConsistentIdentificationReviewByUrl } from '../lib/site-audit/consistent-identification';
import type { SiteAuditPageResult, SiteFunctionalIdentification } from '../lib/site-audit/model';
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

function identification(
  accessibleName: string,
  functionKey = 'https://example.test/search',
  options: Partial<SiteFunctionalIdentification> = {},
): SiteFunctionalIdentification {
  return {
    selector: '#action',
    kind: 'link',
    functionKey,
    accessibleName,
    source: 'aria-label',
    pageLanguage: 'en',
    ...options,
  };
}

function page(url: string, identifications: SiteFunctionalIdentification[]): SiteAuditPageResult {
  return {
    url,
    routeFamilyId: 'R01',
    scan: scan(url),
    structure: {
      fingerprint: 'F00000001',
      semanticTokens: ['a'],
      headingLevels: [],
      interactiveCount: identifications.length,
      landmarkCount: 0,
      functionalIdentifications: identifications,
    },
  };
}

describe('WCAG 3.2.4 consistent identification site review', () => {
  it('stays quiet when the repeated function keeps the same identification', () => {
    const reviews = buildConsistentIdentificationReviewByUrl([
      page('https://example.test/a', [identification('Search')]),
      page('https://example.test/b', [identification('Search')]),
    ]);

    expect(reviews.size).toBe(0);
  });

  it('reviews a unique exact destination whose identification diverges substantially', () => {
    const first = 'https://example.test/a';
    const second = 'https://example.test/b';
    const reviews = buildConsistentIdentificationReviewByUrl([
      page(first, [identification('Search')]),
      page(second, [identification('Find products')]),
    ]);

    expect(reviews.size).toBe(2);
    for (const url of [first, second]) {
      const issue = reviews.get(url)?.[0];
      expect(issue).toMatchObject({
        ruleId: 'FT-REVIEW-015',
        outcome: 'review',
        severity: 'moderate',
        targets: ['page:consistent-identification'],
      });
      expect(issue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '3.2.4')).toBe(true);
      expect(issue?.evidence).toContain('Function destination: /search');
      expect(issue?.evidence).toContain('Comparison page');
    }
  });

  it('does not equate different exact destinations even when labels differ', () => {
    const reviews = buildConsistentIdentificationReviewByUrl([
      page('https://example.test/a', [identification('Search', 'https://example.test/search')]),
      page('https://example.test/b', [identification('Find products', 'https://example.test/products')]),
    ]);

    expect(reviews.size).toBe(0);
  });

  it('does not compare pages with different declared primary languages', () => {
    const reviews = buildConsistentIdentificationReviewByUrl([
      page('https://example.test/en', [identification('Search', undefined, { pageLanguage: 'en' })]),
      page('https://example.test/es', [identification('Buscar', undefined, { pageLanguage: 'es' })]),
    ]);

    expect(reviews.size).toBe(0);
  });

  it('does not compare different identification sources', () => {
    const reviews = buildConsistentIdentificationReviewByUrl([
      page('https://example.test/a', [identification('Search', undefined, { source: 'aria-label' })]),
      page('https://example.test/b', [identification('Find products', undefined, { source: 'text' })]),
    ]);

    expect(reviews.size).toBe(0);
  });

  it('does not guess which component matches when one page repeats the same destination', () => {
    const reviews = buildConsistentIdentificationReviewByUrl([
      page('https://example.test/a', [
        identification('Search', undefined, { selector: '#header-search' }),
        identification('Product search', undefined, { selector: '#footer-search' }),
      ]),
      page('https://example.test/b', [identification('Find products')]),
    ]);

    expect(reviews.size).toBe(0);
  });

  it('accepts labels that retain the functional vocabulary or vary only by a number', () => {
    const sharedVocabulary = buildConsistentIdentificationReviewByUrl([
      page('https://example.test/a', [identification('Cart', 'https://example.test/cart', { source: 'text' })]),
      page('https://example.test/b', [identification('View cart', 'https://example.test/cart', { source: 'text' })]),
    ]);
    const numbered = buildConsistentIdentificationReviewByUrl([
      page('https://example.test/a', [identification('Go to page 4', 'https://example.test/next')]),
      page('https://example.test/b', [identification('Go to page 5', 'https://example.test/next')]),
    ]);

    expect(sharedVocabulary.size).toBe(0);
    expect(numbered.size).toBe(0);
  });

  it('requires a declared primary page language before comparing', () => {
    const reviews = buildConsistentIdentificationReviewByUrl([
      page('https://example.test/a', [identification('Search', undefined, { pageLanguage: '' })]),
      page('https://example.test/b', [identification('Find products', undefined, { pageLanguage: '' })]),
    ]);

    expect(reviews.size).toBe(0);
  });
});
