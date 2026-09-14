import { runFocusTraceScan } from '../lib/audit/scan';
import {
  buildSessionExport,
  createFocusTraceCliBaseline,
  defaultAuditProfile,
  normalizeAuditProfile,
  parseFocusTraceCliBaseline,
  renderVersionedExport,
  runAuditCore,
  type AuditProfile,
  type ComponentScanScope,
  type RenderedPageAuditAdapter,
} from '../lib/core';
import type { CliBrowserRunInput, CliBrowserRunOutput, FocusTraceCliBridge } from './protocol';

function componentScope(selector: string | undefined): ComponentScanScope {
  if (!selector) throw new Error('Component scope requires a selector.');
  let element: Element | null = null;
  try {
    element = document.querySelector(selector);
  } catch {
    throw new Error('Invalid component selector.');
  }
  if (!element) throw new Error('Component selector did not match an element.');
  const role = element.getAttribute('role')?.trim();
  return {
    type: 'component',
    selector,
    tag: element.tagName.toLowerCase(),
    ...(role ? { role } : {}),
  };
}

function resolveProfile(value: CliBrowserRunInput['profile']): AuditProfile {
  if (value == null) return defaultAuditProfile();
  const profile = normalizeAuditProfile(value);
  if (!profile) throw new Error('Invalid audit profile.');
  return profile;
}

const adapter: RenderedPageAuditAdapter = {
  scan: (scope) => Promise.resolve(runFocusTraceScan(scope)),
};

async function run(input: CliBrowserRunInput): Promise<CliBrowserRunOutput> {
  const scope = input.scope === 'component' ? componentScope(input.selector) : undefined;
  const profile = resolveProfile(input.profile);
  const baseline = input.baseline == null ? undefined : parseFocusTraceCliBaseline(input.baseline).scan;
  const core = await runAuditCore(adapter, { scope, profile, baseline });
  const envelope = buildSessionExport({ scan: core.scan });
  envelope.metadata = {
    ...envelope.metadata,
    ...(core.scan.auditProfile ? { auditProfile: core.scan.auditProfile } : {}),
    baselineCompatible: core.baselineCompatible,
  };
  return {
    rendered: renderVersionedExport(envelope, input.format),
    envelope,
    baseline: createFocusTraceCliBaseline(core.scan),
    baselineCompatible: core.baselineCompatible,
  };
}

const bridge: FocusTraceCliBridge = { run };
(globalThis as typeof globalThis & { __FOCUSTRACE_CLI__?: FocusTraceCliBridge }).__FOCUSTRACE_CLI__ = bridge;
