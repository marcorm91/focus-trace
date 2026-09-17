import { describe, expect, it } from 'vitest';
import { applyAuditScope, auditScopeForUrl, emptyMultipageAuditStore } from '../lib/audit/multipage-audit';

describe('Trace audit scope without fabricated page evidence', () => {
  it('creates a scope with no analyzed pages and accepts other pages of the same site', () => {
    const store = applyAuditScope(emptyMultipageAuditStore(), { kind: 'new', site: 'example.com' }, 'a', 1);
    expect(store.audits[0]?.pages).toEqual([]);
    expect(auditScopeForUrl(store, 'https://www.example.com/other').kind).toBe('same-site');
    expect(auditScopeForUrl(store, 'https://other.test/').kind).toBe('different-site');
  });
  it('adds a site idempotently and preserves existing evidence', () => {
    const store = applyAuditScope(emptyMultipageAuditStore(), { kind: 'new', site: 'example.com' }, 'a', 1);
    const plan = { kind: 'existing', auditId: 'a', site: 'other.test', addSite: true } as const;
    const next = applyAuditScope(applyAuditScope(store, plan, 'unused', 2), plan, 'unused', 3);
    expect(next.audits[0]?.sites).toEqual(['example.com', 'other.test']);
    expect(next.audits[0]?.pages).toBe(store.audits[0]?.pages);
    expect(auditScopeForUrl(next, 'https://other.test/page').kind).toBe('same-site');
  });
  it('starts a separate audit without deleting the previous one', () => {
    const store = applyAuditScope(emptyMultipageAuditStore(), { kind: 'new', site: 'example.com' }, 'a', 1);
    const next = applyAuditScope(store, { kind: 'new', site: 'other.test' }, 'b', 2);
    expect(next.activeAuditId).toBe('b');
    expect(next.audits).toHaveLength(2);
    expect(next.audits[0]).toBe(store.audits[0]);
  });
  it('rejects a removed audit instead of silently selecting another', () => {
    expect(() => applyAuditScope(emptyMultipageAuditStore(), {
      kind: 'existing', auditId: 'missing', site: 'example.com', addSite: true,
    }, 'a', 1)).toThrow('no longer available');
  });
});
