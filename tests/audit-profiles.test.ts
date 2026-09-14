import { describe, expect, it } from 'vitest';
import {
  ALL_AUDIT_PROFILE_SEVERITIES,
  ALL_AUDIT_RULE_FAMILIES,
  activeAuditProfile,
  applyAuditProfile,
  auditProfileSnapshotKey,
  auditRuleFamily,
  defaultAuditProfile,
  deleteAuditProfile,
  emptyAuditProfileStore,
  normalizeAuditProfile,
  resetAuditProfiles,
  upsertAuditProfile,
  type AuditProfile,
} from '../lib/audit/audit-profiles';
import type { ScanIssue, ScanResult } from '../shared/types';

function issue(id: string, overrides: Partial<ScanIssue> = {}): ScanIssue {
  return {
    id,
    ruleId: 'FT-COLOR-001',
    title: 'Text contrast',
    description: 'Contrast finding',
    severity: 'serious',
    outcome: 'fail',
    targets: ['#target'],
    evidence: 'ratio 2:1',
    references: [{ type: 'WCAG', id: '1.4.3', label: 'Contrast', url: 'https://www.w3.org/', level: 'AA' }],
    ...overrides,
  };
}

function scan(findings: ScanIssue[]): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url: 'https://example.test/',
    title: 'Example',
    scannedAt: 10,
    issues: findings.filter((item) => item.outcome === 'fail'),
    review: findings.filter((item) => item.outcome === 'review'),
    warnings: findings.filter((item) => item.outcome === 'warning'),
    passes: 0,
    rulesRun: 3,
  };
}

function custom(overrides: Partial<AuditProfile> = {}): AuditProfile {
  return {
    ...defaultAuditProfile(1),
    id: 'custom',
    name: 'Custom',
    builtIn: false,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

describe('audit profiles', () => {
  it('ships a complete local profile that preserves all supported findings', () => {
    const profile = activeAuditProfile(emptyAuditProfileStore());
    expect(profile.standard).toBe('all');
    expect(profile.scopes).toEqual(['page', 'component', 'site']);
    expect(profile.severities).toEqual(ALL_AUDIT_PROFILE_SEVERITIES);
    expect(profile.ruleFamilies).toEqual(ALL_AUDIT_RULE_FAMILIES);
  });

  it('filters by severity, WCAG target and rule family', () => {
    const profile = custom({
      standard: 'AA',
      severities: ['serious'],
      ruleFamilies: ['visual'],
      scopes: ['page'],
    });
    const filtered = applyAuditProfile(scan([
      issue('keep'),
      issue('aaa', { references: [{ type: 'WCAG', id: '1.4.6', label: 'Enhanced contrast', url: 'https://www.w3.org/', level: 'AAA' }] }),
      issue('minor', { severity: 'minor' }),
      issue('keyboard', { ruleId: 'FT-KEYBOARD-001', title: 'Keyboard access' }),
    ]), profile, 'page');
    expect(filtered.issues.map((item) => item.id)).toEqual(['keep']);
    expect(filtered.auditProfile?.id).toBe('custom');
  });

  it('classifies representative rule families without third-party metadata', () => {
    expect(auditRuleFamily(issue('visual'))).toBe('visual');
    expect(auditRuleFamily(issue('form', { ruleId: 'FT-FORM-001', title: 'Form error' }))).toBe('forms');
    expect(auditRuleFamily(issue('focus', { ruleId: 'FT-FOCUS-001', title: 'Focus order' }))).toBe('keyboard-focus');
    expect(auditRuleFamily(issue('aria', { ruleId: 'FT-ARIA-001', title: 'ARIA role' }))).toBe('semantics');
  });

  it('rejects invalid empty profile dimensions', () => {
    expect(normalizeAuditProfile({ ...custom(), scopes: [] })).toBeUndefined();
    expect(normalizeAuditProfile({ ...custom(), severities: [] })).toBeUndefined();
    expect(normalizeAuditProfile({ ...custom(), ruleFamilies: [] })).toBeUndefined();
  });

  it('upserts, activates through the returned store, deletes and resets locally', () => {
    const saved = upsertAuditProfile(emptyAuditProfileStore(), custom());
    expect(saved.activeProfileId).toBe('custom');
    expect(saved.profiles).toHaveLength(2);
    const removed = deleteAuditProfile(saved, 'custom');
    expect(removed.activeProfileId).toBe('default-complete');
    expect(removed.profiles).toHaveLength(1);
    expect(resetAuditProfiles()).toEqual(emptyAuditProfileStore());
  });

  it('changes the profile snapshot identity when an existing profile configuration changes', () => {
    const first = applyAuditProfile(scan([issue('one')]), custom({ scopes: ['page'], severities: ['serious'] }), 'page');
    const second = applyAuditProfile(scan([issue('one')]), custom({ scopes: ['page'], severities: ['minor'] }), 'page');
    expect(auditProfileSnapshotKey(first)).not.toBe(auditProfileSnapshotKey(second));
  });

  it('does not apply a profile outside its declared scope', () => {
    expect(() => applyAuditProfile(scan([issue('one')]), custom({ scopes: ['component'] }), 'page'))
      .toThrow(/does not include page scope/);
  });
});
