// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMultipageAudit } from '../entrypoints/sidepanel/hooks/useMultipageAudit';
import type { MultipageAuditStore } from '../lib/audit/multipage-audit';
const api = vi.hoisted(() => ({ load: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), clear: vi.fn() }));
vi.mock('#imports', () => ({ browser: { storage: { onChanged: { addListener: api.addListener, removeListener: api.removeListener } } } }));
vi.mock('../lib/audit/multipage-audit-storage', () => ({ loadMultipageAuditStore: api.load, MULTIPAGE_AUDIT_STORAGE_KEY: 'audit' }));
vi.mock('../lib/audit/multipage-audit-client', () => ({ clearMultipageAudits: api.clear }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const store: MultipageAuditStore = { version: 1, activeAuditId: 'old', audits: [{
  id: 'old', name: 'Old audit', sites: ['https://old.test'], pages: [], createdAt: 1, updatedAt: 1,
}] };
let root: Root;
let current: ReturnType<typeof useMultipageAudit>;
function Harness({ tabId }: { tabId: number }) { current = useMultipageAudit(tabId); return null; }
beforeEach(() => {
  vi.clearAllMocks();
  api.load.mockResolvedValue({ version: 1, audits: [] });
  api.clear.mockResolvedValue({ version: 1, audits: [] });
  root = createRoot(document.createElement('div'));
});
afterEach(async () => { await act(async () => root.unmount()); });
describe('multipage audit asynchronous lifecycle', () => {
  it('does not restore an old UI snapshot when the initial read finishes after a clear', async () => {
    const initial = deferred<MultipageAuditStore>();
    api.load.mockReturnValueOnce(initial.promise);
    await act(async () => root.render(createElement(Harness, { tabId: 1 })));
    await act(async () => current.clearAuditHistory());
    await act(async () => initial.resolve(store));
    expect(current.activeAudit).toBeUndefined();
  });

  it('does not open a scope decision for the previous tab after a delayed read', async () => {
    await act(async () => root.render(createElement(Harness, { tabId: 1 })));
    const pending = deferred<MultipageAuditStore>();
    api.load.mockReturnValueOnce(pending.promise);
    let preparation!: ReturnType<typeof current.preparePageAnalysis>;
    await act(async () => { preparation = current.preparePageAnalysis('https://different.test/'); });
    await act(async () => root.render(createElement(Harness, { tabId: 2 })));
    await act(async () => pending.resolve(store));
    expect(current.pendingScope).toBeUndefined();
    await expect(preparation).resolves.toBeNull();
  });

  it('removes storage listeners when the panel unmounts', async () => {
    await act(async () => root.render(createElement(Harness, { tabId: 1 })));
    await act(async () => root.unmount());
    expect(api.removeListener).toHaveBeenCalledWith(api.addListener.mock.calls[0]![0]);
  });
});
