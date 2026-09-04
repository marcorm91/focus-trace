import { describe, expect, it } from 'vitest';
import { buildConsistentHelpReviewByUrl } from '../lib/site-audit/consistent-help';
import type { SiteAuditPageResult, SiteHelpMechanismKind } from '../lib/site-audit/model';
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

function page(url: string, kinds: SiteHelpMechanismKind[]): SiteAuditPageResult {
  return {
    url,
    routeFamilyId: 'R01',
    scan: scan(url),
    structure: {
      fingerprint: 'F00000001',
      semanticTokens: [],
      headingLevels: [],
      interactiveCount: kinds.length,
      landmarkCount: 0,
      helpMechanisms: kinds.map((kind, index) => ({
        kind,
        selector: `#help-${index + 1}`,
        label: kind,
      })),
    },
  };
}

describe('WCAG 3.2.6 consistent help site review', () => {
  it('does not report pages when repeated help mechanisms keep their relative order', () => {
    const pages = [
      page('https://example.test/a', ['human-contact-details', 'self-help', 'automated-contact']),
      page('https://example.test/b', ['human-contact-details', 'self-help', 'automated-contact']),
    ];

    expect(buildConsistentHelpReviewByUrl(pages).size).toBe(0);
  });

  it('reports a conservative review when at least two shared help mechanisms change relative order', () => {
    const first = 'https://example.test/a';
    const second = 'https://example.test/b';
    const reviews = buildConsistentHelpReviewByUrl([
      page(first, ['human-contact-details', 'self-help', 'automated-contact']),
      page(second, ['self-help', 'human-contact-details', 'automated-contact']),
    ]);

    expect(reviews.size).toBe(2);
    for (const url of [first, second]) {
      const issue = reviews.get(url)?.[0];
      expect(issue).toMatchObject({
        ruleId: 'FT-REVIEW-011',
        outcome: 'review',
        severity: 'moderate',
        targets: ['page:help-mechanisms'],
      });
      expect(issue?.references.some((reference) => reference.type === 'WCAG' && reference.id === '3.2.6')).toBe(true);
      expect(issue?.evidence).toContain('Comparison page');
    }
  });

  it('does not infer inconsistent help from only one shared mechanism', () => {
    const reviews = buildConsistentHelpReviewByUrl([
      page('https://example.test/a', ['human-contact-details', 'self-help']),
      page('https://example.test/b', ['human-contact-details', 'automated-contact']),
    ]);

    expect(reviews.size).toBe(0);
  });
});
