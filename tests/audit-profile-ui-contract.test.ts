import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const profileSource = readFileSync('entrypoints/sidepanel/components/AuditProfileSettings.tsx', 'utf8');
const profileCss = readFileSync('entrypoints/sidepanel/components/audit-profile-settings.css', 'utf8');
const lifecycleSource = readFileSync('entrypoints/sidepanel/components/FindingLifecycleSummary.tsx', 'utf8');
const backgroundSource = readFileSync('entrypoints/background.ts', 'utf8');

describe('audit profile UI contract', () => {
  it('uses native profile controls and announces local updates', () => {
    expect(profileSource).toContain('<select value={activeProfileId}');
    expect(profileSource).toContain('type="checkbox"');
    expect(profileSource).toContain('role="status"');
    expect(profileSource).toContain('aria-live="polite"');
    expect(profileSource).toContain('Reset profiles');
  });

  it('keeps profile controls usable in narrow and forced-color layouts', () => {
    expect(profileCss).toContain('@media (max-width: 480px)');
    expect(profileCss).toContain('@media (forced-colors: active)');
    expect(profileCss).toContain('min-height: 36px');
  });

  it('surfaces all four lifecycle states and the applied profile', () => {
    expect(lifecycleSource).toContain("['new', 'persistent', 'changed', 'resolved']");
    expect(lifecycleSource).toContain('Applied audit profile');
    expect(lifecycleSource).toContain('Resolved findings remain history evidence');
  });

  it('normalizes findings before Session and Memory persistence', () => {
    expect(backgroundSource).toContain('normalizeSavedScan');
    expect(backgroundSource).toContain('applyFindingLifecycle');
    expect(backgroundSource).toContain('recordFocusMemoryScan(normalizedScan, remappedEvidence)');
    expect(backgroundSource).toContain('profileSupportsScope(activeProfile, scanScope)');
    expect(backgroundSource).toContain('auditProfileSnapshotKey(previous) === auditProfileSnapshotKey(current)');
  });
});
