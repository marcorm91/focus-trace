import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionMessage, ScanResult } from '../shared/types';

const api = vi.hoisted(() => ({
  local: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
  session: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
  onMessage: vi.fn(), onRemoved: vi.fn(), sendMessage: vi.fn(),
}));
vi.mock('#imports', () => ({
  defineBackground: (run: () => void) => run,
  browser: {
    storage: { local: api.local, session: api.session },
    runtime: { onMessage: { addListener: api.onMessage }, sendMessage: api.sendMessage },
    tabs: { onRemoved: { addListener: api.onRemoved }, onUpdated: { addListener: vi.fn() } },
    sidePanel: { setPanelBehavior: vi.fn(async () => undefined) },
  },
}));
import startBackground from '../entrypoints/background';
import {
  clearMultipageAudits,
  loadMultipageAuditStore,
  MULTIPAGE_AUDIT_STORAGE_KEY,
  recordMultipageAuditScan,
  recordMultipageAuditScope,
} from '../lib/audit/multipage-audit-storage';
import * as client from '../lib/audit/multipage-audit-client';

let local: Record<string, unknown>;
let session: Record<string, unknown>;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
const scan = (path: string): ScanResult => ({
  engine: 'FocusTrace Rules', standard: 'WCAG 2.2', url: `https://example.test/${path}`,
  title: path, scannedAt: 10, issues: [], review: [], warnings: [], passes: 0, rulesRun: 0,
});
beforeEach(() => {
  vi.clearAllMocks();
  local = {}; session = {};
  for (const [mocks, data] of [[api.local, local], [api.session, session]] as const) {
    mocks.get.mockImplementation(async (keys: string | string[]) => structuredClone(Object.fromEntries(
      (Array.isArray(keys) ? keys : [keys]).map((key) => [key, data[key]]),
    )));
    mocks.set.mockImplementation(async (values) => { Object.assign(data, structuredClone(values)); });
    mocks.remove.mockImplementation(async (key: string) => { delete data[key]; });
  }
  api.sendMessage.mockResolvedValue(undefined);
});

describe('audit and session write ordering', () => {
  it('preserves both concurrently recorded pages in the same audit', async () => {
    const store = await recordMultipageAuditScan(scan('first'), { kind: 'new', site: 'example.test' });
    const plan = { kind: 'existing' as const, auditId: store.activeAuditId!, site: 'example.test', addSite: false };
    await Promise.all([
      recordMultipageAuditScan(scan('second'), plan),
      recordMultipageAuditScan(scan('third'), plan),
    ]);
    expect((await loadMultipageAuditStore()).audits[0]?.pages.map((page) => page.title)).toEqual(['first', 'second', 'third']);
  });

  it('does not restore cleared audits when an earlier write finishes late', async () => {
    const entered = deferred(); const release = deferred();
    api.local.set.mockImplementationOnce(async (values) => {
      entered.resolve(); await release.promise; Object.assign(local, structuredClone(values));
    });
    const write = recordMultipageAuditScope({ kind: 'new', site: 'example.test' });
    await entered.promise;
    const clear = clearMultipageAudits();
    await Promise.resolve();
    release.resolve();
    await Promise.all([write, clear]);
    expect(local[MULTIPAGE_AUDIT_STORAGE_KEY]).toBeUndefined();
  });

  it('allows later writes after a storage failure', async () => {
    api.local.set.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(recordMultipageAuditScope({ kind: 'new', site: 'failed.test' })).rejects.toThrow('Storage unavailable');
    const result = await recordMultipageAuditScope({ kind: 'new', site: 'saved.test' });
    expect(result.audits.map((audit) => audit.sites)).toEqual([['saved.test']]);
  });

  it('routes panel mutations through the same background writer', async () => {
    (startBackground as unknown as () => void)();
    const handle = api.onMessage.mock.calls[0]![0] as (message: ExtensionMessage, sender: object) => unknown;
    api.sendMessage.mockImplementation((message: ExtensionMessage) => handle(message, {}));
    await Promise.all([
      client.recordMultipageAuditScope({ kind: 'new', site: 'one.test' }),
      client.recordMultipageAuditScope({ kind: 'new', site: 'two.test' }),
    ]);
    expect((await loadMultipageAuditStore()).audits).toHaveLength(2);
    const store = await client.recordMultipageAuditScan(scan('page'), { kind: 'new', site: 'example.test' });
    const audit = store.audits.at(-1)!;
    await client.deleteMultipageAuditPage(audit.id, audit.pages[0]!.key);
    expect((await loadMultipageAuditStore()).audits.flatMap((item) => item.pages)).toHaveLength(0);
    await client.clearMultipageAudits();
    expect((await loadMultipageAuditStore()).audits).toEqual([]);
  });

  it('removes a closed tab session after its accepted pending writes drain', async () => {
    (startBackground as unknown as () => void)();
    const handle = api.onMessage.mock.calls[0]![0] as (message: ExtensionMessage, sender: object) => Promise<unknown>;
    const close = api.onRemoved.mock.calls[0]![0] as (tabId: number) => void;
    const entered = deferred(); const release = deferred();
    api.session.set.mockImplementationOnce(async (values) => {
      entered.resolve(); await release.promise; Object.assign(session, structuredClone(values));
    });
    const write = handle({ type: 'FOCUSTRACE_CLEAR_SESSION', tabId: 7 }, {});
    await entered.promise;
    close(7);
    release.resolve();
    await write;
    await vi.waitFor(() => expect(session['session:7']).toBeUndefined());
  });
});
