import type { AuditProfileSnapshot } from '../audit/audit-profiles';
import { sanitizeRuntimeUrl } from '../runtime/url-privacy';
import type { ScanIssue, ScanResult } from '../../shared/types';

export const FOCUSTRACE_CLI_BASELINE_VERSION = 1 as const;

export type FocusTraceBaselineScan = ScanResult & {
  auditProfile?: AuditProfileSnapshot;
};

export interface FocusTraceCliBaseline {
  version: typeof FOCUSTRACE_CLI_BASELINE_VERSION;
  savedAt: number;
  scan: FocusTraceBaselineScan;
}

function baselineIssue(issue: ScanIssue): ScanIssue {
  const copy = { ...issue };
  delete copy.element;
  delete copy.context;
  delete copy.auditorNote;
  delete copy.reviewStateUpdatedAt;
  return copy;
}

function profileSnapshot(profile: AuditProfileSnapshot | undefined): AuditProfileSnapshot | undefined {
  if (!profile) return undefined;
  return {
    ...profile,
    scopes: [...profile.scopes],
    referenceTypes: [...profile.referenceTypes],
    ruleIds: [...profile.ruleIds],
    severities: [...profile.severities],
    ruleFamilies: [...profile.ruleFamilies],
  };
}

export function createFocusTraceCliBaseline(
  scan: FocusTraceBaselineScan,
  savedAt = Date.now(),
): FocusTraceCliBaseline {
  const auditProfile = profileSnapshot(scan.auditProfile);
  const baselineScan: FocusTraceBaselineScan = {
    engine: scan.engine,
    standard: scan.standard,
    url: sanitizeRuntimeUrl(scan.url),
    title: '',
    scannedAt: scan.scannedAt,
    ...(scan.scope ? { scope: { ...scan.scope } } : {}),
    issues: scan.issues.map(baselineIssue),
    review: scan.review.map(baselineIssue),
    warnings: (scan.warnings ?? []).map(baselineIssue),
    ...(scan.ruleResults ? { ruleResults: scan.ruleResults.map((result) => ({ ...result })) } : {}),
    passes: scan.passes,
    rulesRun: scan.rulesRun,
    ...(auditProfile ? { auditProfile } : {}),
  };
  return { version: FOCUSTRACE_CLI_BASELINE_VERSION, savedAt, scan: baselineScan };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseFocusTraceCliBaseline(value: unknown): FocusTraceCliBaseline {
  const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (!isRecord(parsed)
    || parsed.version !== FOCUSTRACE_CLI_BASELINE_VERSION
    || typeof parsed.savedAt !== 'number'
    || !Number.isFinite(parsed.savedAt)
    || !isRecord(parsed.scan)
    || parsed.scan.engine !== 'FocusTrace Rules'
    || parsed.scan.standard !== 'WCAG 2.2'
    || typeof parsed.scan.url !== 'string'
    || !Array.isArray(parsed.scan.issues)
    || !Array.isArray(parsed.scan.review)
    || !Array.isArray(parsed.scan.warnings)
    || typeof parsed.scan.passes !== 'number'
    || typeof parsed.scan.rulesRun !== 'number') {
    throw new Error('Unsupported or invalid FocusTrace CLI baseline.');
  }
  return parsed as unknown as FocusTraceCliBaseline;
}

export function renderFocusTraceCliBaseline(baseline: FocusTraceCliBaseline): string {
  return `${JSON.stringify(baseline, null, 2)}\n`;
}
