import { browser } from '#imports';
import type { ExtensionMessage, RuntimeEvent, ScanResult } from '../../shared/types';
import type { AuditAnalysisPlan, AuditPageVisualEvidence, MultipageAuditStore } from './multipage-audit';

// Panels request mutations from the one background writer. A module-local
// promise queue in each panel would not protect writes from other windows.
export async function recordMultipageAuditScope(plan: AuditAnalysisPlan): Promise<MultipageAuditStore> {
  return browser.runtime.sendMessage({ type: 'FOCUSTRACE_AUDIT_SCOPE', plan } satisfies ExtensionMessage);
}

export async function recordMultipageAuditScan(
  scan: ScanResult,
  plan: AuditAnalysisPlan,
  visualEvidence?: AuditPageVisualEvidence,
  traceEvents: RuntimeEvent[] = [],
): Promise<MultipageAuditStore> {
  return browser.runtime.sendMessage({ type: 'FOCUSTRACE_AUDIT_SCAN', scan, plan, visualEvidence, traceEvents } satisfies ExtensionMessage);
}

export async function deleteMultipageAuditPage(auditId: string, pageKey: string): Promise<MultipageAuditStore> {
  return browser.runtime.sendMessage({ type: 'FOCUSTRACE_AUDIT_DELETE_PAGE', auditId, pageKey } satisfies ExtensionMessage);
}

export async function clearMultipageAudits(): Promise<MultipageAuditStore> {
  return browser.runtime.sendMessage({ type: 'FOCUSTRACE_AUDIT_CLEAR' } satisfies ExtensionMessage);
}
