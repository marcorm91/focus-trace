import type { ScanIssue, ScanResult, Severity } from '../../shared/types';
import { deduplicateScanResult, type LifecycleScanResult } from './finding-lifecycle';

export const AUDIT_PROFILE_VERSION = 1 as const;
export const DEFAULT_AUDIT_PROFILE_ID = 'default-aa';
export const MAX_CUSTOM_AUDIT_PROFILES = 20;

export type AuditProfileScope = 'page' | 'component' | 'site';
export type AuditProfileStandard = 'A' | 'AA' | 'AAA';
export type AuditRuleFamily =
  | 'semantics'
  | 'structure'
  | 'keyboard-focus'
  | 'forms'
  | 'visual'
  | 'media'
  | 'language'
  | 'other';

export interface AuditProfile {
  version: typeof AUDIT_PROFILE_VERSION;
  id: string;
  name: string;
  scopes: AuditProfileScope[];
  standard: AuditProfileStandard;
  severities: Severity[];
  ruleFamilies: AuditRuleFamily[];
  createdAt: number;
  updatedAt: number;
  builtIn?: boolean;
}

export interface AuditProfileSnapshot {
  id: string;
  name: string;
  scopes: AuditProfileScope[];
  standard: AuditProfileStandard;
  severities: Severity[];
  ruleFamilies: AuditRuleFamily[];
}

export interface AuditProfileStore {
  version: typeof AUDIT_PROFILE_VERSION;
  activeProfileId: string;
  profiles: AuditProfile[];
}

export type ProfiledScanResult = LifecycleScanResult & {
  auditProfile?: AuditProfileSnapshot;
};

export const ALL_AUDIT_PROFILE_SCOPES: AuditProfileScope[] = ['page', 'component', 'site'];
export const ALL_AUDIT_PROFILE_SEVERITIES: Severity[] = ['critical', 'serious', 'moderate', 'minor', 'info'];
export const ALL_AUDIT_RULE_FAMILIES: AuditRuleFamily[] = [
  'semantics',
  'structure',
  'keyboard-focus',
  'forms',
  'visual',
  'media',
  'language',
  'other',
];

function unique<T extends string>(values: T[], allowed: readonly T[]): T[] {
  return [...new Set(values)].filter((value) => allowed.includes(value));
}

export function defaultAuditProfile(now = 0): AuditProfile {
  return {
    version: AUDIT_PROFILE_VERSION,
    id: DEFAULT_AUDIT_PROFILE_ID,
    name: 'WCAG 2.2 AA · Complete',
    scopes: [...ALL_AUDIT_PROFILE_SCOPES],
    standard: 'AA',
    severities: [...ALL_AUDIT_PROFILE_SEVERITIES],
    ruleFamilies: [...ALL_AUDIT_RULE_FAMILIES],
    createdAt: now,
    updatedAt: now,
    builtIn: true,
  };
}

export function emptyAuditProfileStore(): AuditProfileStore {
  return {
    version: AUDIT_PROFILE_VERSION,
    activeProfileId: DEFAULT_AUDIT_PROFILE_ID,
    profiles: [defaultAuditProfile()],
  };
}

export function normalizeAuditProfile(input: Partial<AuditProfile>, now = Date.now()): AuditProfile | undefined {
  const id = input.id?.trim().slice(0, 80);
  const name = input.name?.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!id || !name) return undefined;
  const scopes = unique(input.scopes ?? [], ALL_AUDIT_PROFILE_SCOPES);
  const severities = unique(input.severities ?? [], ALL_AUDIT_PROFILE_SEVERITIES);
  const ruleFamilies = unique(input.ruleFamilies ?? [], ALL_AUDIT_RULE_FAMILIES);
  const standard = input.standard === 'A' || input.standard === 'AAA' ? input.standard : 'AA';
  if (!scopes.length || !severities.length || !ruleFamilies.length) return undefined;
  return {
    version: AUDIT_PROFILE_VERSION,
    id,
    name,
    scopes,
    standard,
    severities,
    ruleFamilies,
    createdAt: Number.isFinite(input.createdAt) ? input.createdAt! : now,
    updatedAt: Number.isFinite(input.updatedAt) ? input.updatedAt! : now,
    ...(input.builtIn ? { builtIn: true } : {}),
  };
}

export function normalizeAuditProfileStore(value: unknown): AuditProfileStore {
  if (!value || typeof value !== 'object') return emptyAuditProfileStore();
  const candidate = value as Partial<AuditProfileStore>;
  const customs = Array.isArray(candidate.profiles)
    ? candidate.profiles
      .filter((profile) => profile?.id !== DEFAULT_AUDIT_PROFILE_ID)
      .map((profile) => normalizeAuditProfile(profile))
      .filter((profile): profile is AuditProfile => Boolean(profile))
      .slice(-MAX_CUSTOM_AUDIT_PROFILES)
    : [];
  const profiles = [defaultAuditProfile(), ...customs];
  const activeProfileId = profiles.some((profile) => profile.id === candidate.activeProfileId)
    ? candidate.activeProfileId!
    : DEFAULT_AUDIT_PROFILE_ID;
  return { version: AUDIT_PROFILE_VERSION, activeProfileId, profiles };
}

export function activeAuditProfile(store: AuditProfileStore): AuditProfile {
  return store.profiles.find((profile) => profile.id === store.activeProfileId) ?? store.profiles[0]!;
}

export function upsertAuditProfile(store: AuditProfileStore, profile: AuditProfile): AuditProfileStore {
  if (profile.id === DEFAULT_AUDIT_PROFILE_ID) return store;
  const normalized = normalizeAuditProfile(profile);
  if (!normalized) return store;
  const customs = store.profiles.filter((item) => !item.builtIn && item.id !== normalized.id);
  const profiles = [defaultAuditProfile(), ...customs, normalized].slice(0, MAX_CUSTOM_AUDIT_PROFILES + 1);
  return {
    version: AUDIT_PROFILE_VERSION,
    activeProfileId: normalized.id,
    profiles,
  };
}

export function deleteAuditProfile(store: AuditProfileStore, profileId: string): AuditProfileStore {
  if (profileId === DEFAULT_AUDIT_PROFILE_ID) return normalizeAuditProfileStore(store);
  const profiles = store.profiles.filter((profile) => profile.id !== profileId);
  return normalizeAuditProfileStore({
    version: AUDIT_PROFILE_VERSION,
    activeProfileId: store.activeProfileId === profileId ? DEFAULT_AUDIT_PROFILE_ID : store.activeProfileId,
    profiles,
  });
}

export function resetAuditProfiles(): AuditProfileStore {
  return emptyAuditProfileStore();
}

export function auditRuleFamily(issue: ScanIssue): AuditRuleFamily {
  const value = `${issue.ruleId} ${issue.title}`.toLocaleLowerCase();
  if (/\b(lang|language)\b/.test(value)) return 'language';
  if (/(contrast|color|reflow|resize|spacing|viewport|orientation|visual)/.test(value)) return 'visual';
  if (/(keyboard|focus|pointer|target-size|drag|motion|pause|timing|shortcut)/.test(value)) return 'keyboard-focus';
  if (/(form|input|label|autocomplete|error|constraint|required)/.test(value)) return 'forms';
  if (/(image|img|svg|frame|iframe|video|audio|media|caption|track)/.test(value)) return 'media';
  if (/(heading|landmark|list|table|document|bypass|duplicate-id|region)/.test(value)) return 'structure';
  if (/(aria|role|name|semantic|button|link|attribute)/.test(value)) return 'semantics';
  return 'other';
}

function levelRank(level: AuditProfileStandard): number {
  if (level === 'A') return 1;
  if (level === 'AA') return 2;
  return 3;
}

export function issueMatchesAuditProfile(issue: ScanIssue, profile: AuditProfile): boolean {
  if (!profile.severities.includes(issue.severity)) return false;
  if (!profile.ruleFamilies.includes(auditRuleFamily(issue))) return false;
  const wcagLevels = issue.references
    .filter((reference) => reference.type === 'WCAG' && reference.level)
    .map((reference) => reference.level!);
  if (!wcagLevels.length) return true;
  return wcagLevels.some((level) => levelRank(level) <= levelRank(profile.standard));
}

export function scanScopeForProfile(scan: ScanResult): Exclude<AuditProfileScope, 'site'> {
  return scan.scope?.type === 'component' ? 'component' : 'page';
}

export function profileSupportsScope(profile: AuditProfile, scope: AuditProfileScope): boolean {
  return profile.scopes.includes(scope);
}

function snapshot(profile: AuditProfile): AuditProfileSnapshot {
  return {
    id: profile.id,
    name: profile.name,
    scopes: [...profile.scopes],
    standard: profile.standard,
    severities: [...profile.severities],
    ruleFamilies: [...profile.ruleFamilies],
  };
}

export function applyAuditProfile(
  scan: ScanResult,
  profile: AuditProfile,
  scope: AuditProfileScope = scanScopeForProfile(scan),
): ProfiledScanResult {
  if (!profileSupportsScope(profile, scope)) {
    throw new Error(`Audit profile "${profile.name}" does not include ${scope} scope.`);
  }
  const filter = (issues: ScanIssue[]) => issues.filter((issue) => issueMatchesAuditProfile(issue, profile));
  return {
    ...deduplicateScanResult(scan),
    issues: filter(scan.issues),
    review: filter(scan.review),
    warnings: filter(scan.warnings ?? []),
    auditProfile: snapshot(profile),
  };
}
