import type { AuditProfile } from '../audit/audit-profiles';
import {
  applyAuditProfile,
  auditProfileSnapshotKey,
  scanScopeForProfile,
  type ProfiledScanResult,
} from '../audit/audit-profiles';
import {
  applyFindingLifecycle,
  deduplicateScanResult,
  type LifecycleScanResult,
} from '../audit/finding-lifecycle';
import { sanitizeRuntimeUrl } from '../runtime/url-privacy';
import type { ComponentScanScope, ScanResult } from '../../shared/types';

export interface RenderedPageAuditAdapter {
  scan(scope?: ComponentScanScope): Promise<ScanResult>;
}

export interface AuditCoreRequest {
  scope?: ComponentScanScope;
  profile?: AuditProfile;
  baseline?: ScanResult;
}

export type CoreAuditScanResult = LifecycleScanResult & Pick<ProfiledScanResult, 'auditProfile'>;

export interface AuditCoreResult {
  scan: CoreAuditScanResult;
  baselineCompatible: boolean;
}

function scopeKey(scan: ScanResult): string {
  const scope = scan.scope;
  if (!scope || scope.type === 'page') return 'page';
  return JSON.stringify({
    type: scope.type,
    selector: scope.selector,
    tag: scope.tag,
    role: scope.role ?? '',
  });
}

export function auditScansAreCompatible(previous: ScanResult, current: ScanResult): boolean {
  return sanitizeRuntimeUrl(previous.url) === sanitizeRuntimeUrl(current.url)
    && scopeKey(previous) === scopeKey(current)
    && auditProfileSnapshotKey(previous) === auditProfileSnapshotKey(current);
}

export async function runAuditCore(
  adapter: RenderedPageAuditAdapter,
  request: AuditCoreRequest = {},
): Promise<AuditCoreResult> {
  const rawScan = await adapter.scan(request.scope);
  const prepared = request.profile
    ? applyAuditProfile(rawScan, request.profile, scanScopeForProfile(rawScan))
    : deduplicateScanResult(rawScan);
  const baselineCompatible = Boolean(request.baseline && auditScansAreCompatible(request.baseline, prepared));
  const scan = applyFindingLifecycle(
    baselineCompatible ? request.baseline : undefined,
    prepared,
  ) as CoreAuditScanResult;

  return { scan, baselineCompatible };
}
