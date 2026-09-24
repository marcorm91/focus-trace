// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSidepanelSession } from '../entrypoints/sidepanel/hooks/useSidepanelSession';
import type { ExtensionMessage, SessionState } from '../shared/types';

const api = vi.hoisted(() => ({
  query: vi.fn(), sendMessage: vi.fn(),
  addActivated: vi.fn(), removeActivated: vi.fn(),
  addMessage: vi.fn(), removeMessage: vi.fn(),
}));
vi.mock('#imports', () => ({ browser: {
  tabs: { query: api.query, onActivated: { addListener: api.addActivated, removeListener: api.removeActivated } },
  runtime: { sendMessage: api.sendMessage, onMessage: { addListener: api.addMessage, removeListener: api.removeMessage } },
} }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function state(tabId: number, startedAt = 1): SessionState {
  return { tabId, startedAt, recording: false, events: [] };
}
let root: Root;
let container: HTMLDivElement;
let current: ReturnType<typeof useSidepanelSession>;
let requests: Array<ReturnType<typeof deferred<SessionState>>>;
let onError = vi.fn<(reason: unknown) => void>();
let onTabSelected = vi.fn<() => void>();
function Harness() {
  current = useSidepanelSession({ onError, onTabSelected });
  return null;
}
async function mount() { await act(async () => root.render(createElement(Harness))); }
async function activate(tabId: number, windowId = 10) {
  await act(async () => api.addActivated.mock.calls.at(-1)![0]({ tabId, windowId }));
}
async function reply(index: number, value: SessionState) {
  await act(async () => requests[index]!.resolve(value));
}
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
  onError = vi.fn(); onTabSelected = vi.fn(); requests = [];
  api.query.mockResolvedValue([{ id: 1, windowId: 10 }]);
  api.sendMessage.mockImplementation(() => {
    const request = deferred<SessionState>(); requests.push(request); return request.promise;
  });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove();
});
describe('sidepanel asynchronous session lifecycle', () => {
  it('pins a DevTools panel to its inspected tab without following active-tab changes', async () => {
    window.history.replaceState(null, '', '?focustraceTabId=42');
    await mount(); await reply(0, state(42, 20));
    expect(current.tabId).toBe(42);
    expect(current.session.startedAt).toBe(20);
    expect(api.query).not.toHaveBeenCalled();
    expect(api.addActivated).not.toHaveBeenCalled();
  });

  it('does not replace a broadcast with an older pending refresh', async () => {
    await mount();
    await act(async () => api.addMessage.mock.calls.at(-1)![0]({
      type: 'FOCUSTRACE_SESSION_UPDATED', state: state(1, 99),
    } satisfies ExtensionMessage));
    await reply(0, state(1, 1));
    expect(current.session.startedAt).toBe(99);
  });

  it('rejects the previous visit response after selecting A, B, then A', async () => {
    await mount(); await activate(2); await activate(1);
    await reply(2, state(1, 30)); await reply(0, state(1, 10)); await reply(1, state(2, 20));
    expect(current.session).toMatchObject({ tabId: 1, startedAt: 30 });
  });

  it('rejects old action setters, including functional updates, after switching tabs', async () => {
    await mount(); await reply(0, state(1));
    const oldSetter = current.setSession;
    await activate(2); await reply(1, state(2, 20));
    await act(async () => {
      oldSetter(state(1, 50));
      oldSetter((previous) => ({ ...previous, startedAt: 60 }));
    });
    expect(current.session).toMatchObject({ tabId: 2, startedAt: 20 });
    await activate(1); await reply(2, state(1, 30));
    await act(async () => oldSetter(state(1, 70)));
    expect(current.session.startedAt).toBe(30);
  });

  it('does not restart selection when presentation callbacks change', async () => {
    await mount(); await reply(0, state(1, 20));
    onError = vi.fn(); onTabSelected = vi.fn();
    await mount();
    expect(api.query).toHaveBeenCalledTimes(1);
    expect(current.session.startedAt).toBe(20);
    expect(onTabSelected).not.toHaveBeenCalled();
  });

  it('uses the latest matching-window activation while the initial query is pending', async () => {
    const query = deferred<Array<{ id: number; windowId: number }>>();
    api.query.mockReturnValue(query.promise);
    await mount(); await activate(2, 10); await activate(3, 99);
    await act(async () => query.resolve([{ id: 1, windowId: 10 }]));
    expect(current.tabId).toBe(2);
    expect(api.sendMessage).toHaveBeenCalledWith({ type: 'FOCUSTRACE_GET_SESSION', tabId: 2 });
  });

  it('ignores an initial query failure after unmount and removes listeners', async () => {
    const query = deferred<Array<{ id: number; windowId: number }>>();
    api.query.mockReturnValue(query.promise);
    await mount(); await act(async () => root.unmount());
    await act(async () => query.reject(new Error('Panel closed')));
    expect(onError).not.toHaveBeenCalled();
    expect(api.removeActivated).toHaveBeenCalledWith(api.addActivated.mock.calls[0]![0]);
    expect(api.removeMessage).toHaveBeenCalledWith(api.addMessage.mock.calls[0]![0]);
  });
});
