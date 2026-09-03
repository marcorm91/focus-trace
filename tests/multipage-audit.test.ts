import { describe, expect, it } from 'vitest';
import {
  applyAuditAnalysis,
  auditPageKey,
  auditScopeForUrl,
  auditSiteKey,
  auditSummary,
  emptyMultipageAuditStore,
} from '../lib/audit/multipage-audit';
import type { ScanResult } from '../shared/types';

function scan(url: string, scannedAt: number, failures = 1): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url,
    title: new URL(url).pathname === '/' ? 'Home' : 'News',
    scannedAt,
    scope: { type: 'page' },
    issues: Array.from({ length: failures }, (_, index) => ({
      id: `issue-${scannedAt}-${index}`,
      ruleId: 'FT-WCAG-003',
      title: 'Button has no accessible name',
      description: 'Provide a name.',
      severity: 'serious' as const,
      outcome: 'fail' as const,
      targets: ['button'],
      references: [],
    })),
    review: [],
    warnings: [],
    headings: [],
    passes: 1,
    rulesRun: 2,
  };
}

describe('multipage audit model', () => {
  it('normalizes ordinary fragments without discarding queries or SPA routes', () => {
    expect(auditPageKey('https://www.example.com/news?page=2#article')).toBe('https://www.example.com/news?page=2');
    expect(auditPageKey('https://www.example.com/app#/news')).toBe('https://www.example.com/app#/news');
  });

  it('treats www and the bare hostname as the same audit site', () => {
    expect(auditSiteKey('https://www.bidafarma.es/')).toBe('bidafarma.es');
    expect(auditSiteKey('https://bidafarma.es/noticias/')).toBe('bidafarma.es');
  });

  it('updates the same page instead of duplicating repeated analyses', () => {
    const firstPlan = auditScopeForUrl(emptyMultipageAuditStore(), 'https://www.bidafarma.es/');
    if (firstPlan.kind !== 'new') throw new Error('Expected a new audit plan.');
    const first = applyAuditAnalysis(
      emptyMultipageAuditStore(),
      scan('https://www.bidafarma.es/#top', 100, 3),
      firstPlan.plan,
      'audit-1',
    );
    const secondScope = auditScopeForUrl(first, 'https://bidafarma.es/');
    if (secondScope.kind !== 'same-site') throw new Error('Expected the same audit site.');
    const second = applyAuditAnalysis(
      first,
      scan('https://www.bidafarma.es/#footer', 200, 1),
      secondScope.plan,
      'unused',
    );

    expect(second.audits).toHaveLength(1);
    expect(second.audits[0]?.pages).toHaveLength(1);
    expect(second.audits[0]?.pages[0]?.reviewedAt).toBe(200);
    expect(second.audits[0]?.pages[0]?.scan.issues).toHaveLength(1);
  });

  it('asks for a decision on another site and can add it to the current audit', () => {
    const first = applyAuditAnalysis(
      emptyMultipageAuditStore(),
      scan('https://bidafarma.es/', 100),
      { kind: 'new', site: 'bidafarma.es' },
      'audit-1',
    );
    const scope = auditScopeForUrl(first, 'https://www.antena3.com/noticias/');
    expect(scope.kind).toBe('different-site');
    if (scope.kind !== 'different-site') return;

    const next = applyAuditAnalysis(
      first,
      scan('https://www.antena3.com/noticias/', 300, 2),
      { kind: 'existing', auditId: scope.audit.id, site: scope.site, addSite: true },
      'unused',
    );

    expect(next.audits).toHaveLength(1);
    expect(next.audits[0]?.sites).toEqual(['bidafarma.es', 'antena3.com']);
    expect(next.audits[0]?.pages).toHaveLength(2);
  });

  it('aggregates the latest page results for the audit cover', () => {
    let store = applyAuditAnalysis(
      emptyMultipageAuditStore(),
      scan('https://bidafarma.es/', 100, 2),
      { kind: 'new', site: 'bidafarma.es' },
      'audit-1',
    );
    store = applyAuditAnalysis(
      store,
      scan('https://bidafarma.es/noticias/', 200, 4),
      { kind: 'existing', auditId: 'audit-1', site: 'bidafarma.es', addSite: false },
      'unused',
    );
    const summary = auditSummary(store.audits[0]!);
    expect(summary).toMatchObject({ pages: 2, failures: 6, reviews: 0, warnings: 0 });
  });
});
