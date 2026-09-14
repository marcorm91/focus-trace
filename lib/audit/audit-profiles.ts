import type { ScanIssue, ScanResult, Severity, StandardReference } from '../../shared/types';
import { deduplicateScanResult, type LifecycleScanResult } from './finding-lifecycle';

export const AUDIT_PROFILE_VERSION = 1 as const;
export const DEFAULT_AUDIT_PROFILE_ID = 'default-complete';
export const MAX_CUSTOM_AUDIT_PROFILES = 20;
export const MAX_AUDIT_PROFILE_RULE_IDS = 200;

export type AuditProfileScope = 'page' | 'component' | 'site';
export type AuditProfileStandard = 'all' | 'A' | 'AA' | 'AAA';
export type AuditProfileReferenceType = StandardReference['type'];
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
  referenceTypes: AuditProfileReferenceType[];
  ruleIds: string[];
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
  referenceTypes: AuditProfileReferenceType[];
  ruleIds: string[];
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
export const ALL_AUDIT_PROFILE_REFERENCE_TYPES: AuditProfileReferenceType[] = [
  'WCAG',
  'ACT',
  'WAI-ARIA',
  'WAI-ARIA APG',
  'HTML',
];
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

function normalizeRuleIds(values: string[]): string[] {
  return [...new Set(values
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^FT-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(value)))]
    .slice(0, MAX_AUDIT_PROFILE_RULE_IDS);
}

export function defaultAuditProfile(now = 0): AuditProfile {
  return {
    version: AUDIT_PROFILE_VERSION,
    id: DEFAULT_AUDIT_PROFILE_ID,
    name: 'Complete · all supported rules',
    scopes: [...ALL_AUDIT_PROFILE_SCOPES],
    standard: 'all',
    referenceTypes: [...ALL_AUDIT_PROFILE_REFERENCE_TYPES],
    ruleIds: [],
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
  const referenceTypes = input.referenceTypes == null
    ? [...ALL_AUDIT_PROFILE_REFERENCE_TYPES]
    : unique(input.referenceTypes, ALL_AUDIT_PROFILE_REFERENCE_TYPES);
  const ruleIds = normalizeRuleIds(input.ruleIds ?? []);
  const standard: AuditProfileStandard = input.standard === 'all'
    || input.standard === 'A'
    || input.standard === 'AAA'
    ? input.standard
    : 'AA';
  if (!scopes.length || !severities.length || !ruleFamilies.length || !referenceTypes.length) return undefined;
  return {
    version: AUDIT_PROFILE_VERSION,
    id,
    name,
    scopes,
    standard,
    referenceTypes,
    ruleIds,
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

function levelRank(level: Exclude<AuditProfileStandard, 'all'>): number {
  if (level === 'A') return 1;
  if (level === 'AA') return 2;
  return 3;
}

function referenceTypesAreRestricted(profile: AuditProfile): boolean {
  return profile.referenceTypes.length !== ALL_AUDIT_PROFILE_REFERENCE_TYPES.length
    || ALL_AUDIT_PROFILE_REFERENCE_TYPES.some((type) => !profile.referenceTypes.includes(type));
}

export function issueMatchesAuditProfile(issue: ScanIssue, profile: AuditProfile): boolean {
  if (!profile.severities.includes(issue.severity)) return false;
  if (!profile.ruleFamilies.includes(auditRuleFamily(issue))) return false;
  if (profile.ruleIds.length && !profile.ruleIds.includes(issue.ruleId.toUpperCase())) return false;
  if (referenceTypesAreRestricted(profile)
    && !issue.references.some((reference) => profile.referenceTypes.includes(reference.type))) return false;
  if (profile.standard === 'all') return true;
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
    referenceTypes: [...profile.referenceTypes],
    ruleIds: [...profile.ruleIds],
    severities: [...profile.severities],
    ruleFamilies: [...profile.ruleFamilies],
  };
}

function sorted(values: string[]): string[] {
  return [...values].sort();
}

export function auditProfileSnapshotKey(scan: ScanResult | undefined): string {
  const profile = (scan as ProfiledScanResult | undefined)?.auditProfile;
  if (!profile) return 'unprofiled';
  return JSON.stringify({
    id: profile.id,
    standard: profile.standard,
    scopes: sorted(profile.scopes),
    referenceTypes: sorted(profile.referenceTypes),
    ruleIds: sorted(profile.ruleIds),
    severities: sorted(profile.severities),
    ruleFamilies: sorted(profile.ruleFamilies),
  });
}

export function applyAuditProfile(
  scan: ScanResult,
  profile: AuditProfile,
  scope: AuditProfileScope = scanScopeForProfile(scan),
): ProfiledScanResult {
  if (!profileSupportsScope(profile, scope)) {
    throw new Error(`Audit profile "${profile.name}" does not include ${scope} scope.`);
  }
  const deduped = deduplicateScanResult(scan);
  const filter = (issues: ScanIssue[]) => issues.filter((issue) => issueMatchesAuditProfile(issue, profile));
  return {
    ...deduped,
    issues: filter(deduped.issues),
    review: filter(deduped.review),
    warnings: filter(deduped.warnings ?? []),
    auditProfile: snapshot(profile),
  };
}
