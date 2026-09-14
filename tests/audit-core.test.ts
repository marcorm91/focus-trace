import { describe, expect, it } from 'vitest';
import { defaultAuditProfile, type AuditProfile } from '../lib/audit/audit-profiles';
import { runAuditCore, type RenderedPageAuditAdapter } from '../lib/core/audit-core';
import type { ScanIssue, ScanResult } from '../shared/types';

function issue(severity: ScanIssue['severity'] = 'serious'): ScanIssue {
  return {
    id: 'finding-1',
    ruleId: 'FT-WCAG-003',
    title: 'Button has a non-empty accessible name',
    description: 'The button is unnamed.',
    severity,
    outcome: 'fail',
    targets: ['#save'],
    evidence: 'Computed accessible name is empty.',
    references: [{
      type: 'WCAG',
      id: '4.1.2',
      label: 'Name, Role, Value',
      level: 'A',
      status: 'normative',
      url: 'https://www.w3.org/TR/WCAG22/#name-role-value',
    }],
  };
}

function scan(url = 'https://example.test/account?token=one', finding = issue(), scannedAt = 100): ScanResult {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url,
    title: 'Account',
    scannedAt,
    scope: { type: 'page' },
    issues: [finding],
    review: [],
    warnings: [],
    passes: 2,
    rulesRun: 3,
  };
}

function adapter(result: ScanResult): RenderedPageAuditAdapter {
  return { scan: () => Promise.resolve(result) };
}

describe('reusable audit core', () => {
  it('uses the shared profile and finding lifecycle implementation', async () => {
    const profile = defaultAuditProfile();
    const first = await runAuditCore(adapter(scan()), { profile });
    const second = await runAuditCore(
      adapter(scan('https://example.test/account?token=two', issue(), 200)),
      { profile, baseline: first.scan },
    );

    expect(first.scan.auditProfile?.id).toBe('default-complete');
    expect(first.scan.findingLifecycle?.counts.new).toBe(1);
    expect(second.baselineCompatible).toBe(true);
    expect(second.scan.findingLifecycle?.counts).toEqual({ new: 0, persistent: 1, changed: 0, resolved: 0 });
    expect(second.scan.issues[0]?.lifecycleState).toBe('persistent');
  });

  it('does not infer resolved findings from an incompatible route baseline', async () => {
    const profile = defaultAuditProfile();
    const first = await runAuditCore(adapter(scan('https://example.test/account')), { profile });
    const second = await runAuditCore(
      adapter(scan('https://example.test/settings', issue(), 200)),
      { profile, baseline: first.scan },
    );

    expect(second.baselineCompatible).toBe(false);
    expect(second.scan.findingLifecycle?.counts).toEqual({ new: 1, persistent: 0, changed: 0, resolved: 0 });
  });

  it('applies the same reusable audit profile filters used by the extension', async () => {
    const profile: AuditProfile = {
      ...defaultAuditProfile(),
      id: 'critical-only',
      name: 'Critical only',
      severities: ['critical'],
      builtIn: false,
    };
    const result = await runAuditCore(adapter(scan()), { profile });

    expect(result.scan.issues).toHaveLength(0);
    expect(result.scan.auditProfile?.severities).toEqual(['critical']);
  });
});
