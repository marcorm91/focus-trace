import type { FixtureServer } from './support/fixture-server';
import { startFixtureServer } from './support/fixture-server';
import { expect, test } from './support/extension';

let fixtures: FixtureServer;

test.beforeAll(async () => {
  fixtures = await startFixtureServer();
});

test.afterAll(async () => {
  await fixtures.close();
});

test('tabs in separate browser windows retain independent FocusTrace session state', async ({ context, extensionWorker }) => {
  const firstPage = await context.newPage();
  await firstPage.goto(`${fixtures.origin}/component-scan.html?window=one`);

  const secondPage = await context.newPage();
  await secondPage.goto(`${fixtures.origin}/component-scan.html?window=two`);

  const [firstTab, secondTab] = await extensionWorker.evaluate(async (urls) => {
    const chromeApi = (globalThis as any).chrome;
    const tabs = await chromeApi.tabs.query({});
    return urls.map((url: string) => {
      const tab = tabs.find((candidate: any) => candidate.url === url);
      if (tab?.id == null) throw new Error(`Could not resolve browser tab for ${url}`);
      return { id: tab.id as number, windowId: tab.windowId as number };
    });
  }, [firstPage.url(), secondPage.url()]);

  const secondWindow = await extensionWorker.evaluate(async (tabId) => {
    const chromeApi = (globalThis as any).chrome;
    const created = await chromeApi.windows.create({ tabId, focused: false });
    return created.id as number;
  }, secondTab.id);

  expect(secondWindow).not.toBe(firstTab.windowId);

  const states = await extensionWorker.evaluate(async ({ firstId, secondId }) => {
    const chromeApi = (globalThis as any).chrome;
    const getSession = (tabId: number) => chromeApi.runtime.sendMessage({ type: 'FOCUSTRACE_GET_SESSION', tabId });

    await chromeApi.runtime.sendMessage({
      type: 'FOCUSTRACE_SET_RECORDING_STATE',
      tabId: firstId,
      enabled: true,
      startedAt: 101,
    });
    await chromeApi.runtime.sendMessage({
      type: 'FOCUSTRACE_SET_RECORDING_STATE',
      tabId: secondId,
      enabled: false,
    });

    return {
      first: await getSession(firstId),
      second: await getSession(secondId),
    };
  }, { firstId: firstTab.id, secondId: secondTab.id });

  expect(states.first.tabId).toBe(firstTab.id);
  expect(states.first.recording).toBe(true);
  expect(states.first.startedAt).toBe(101);
  expect(states.second.tabId).toBe(secondTab.id);
  expect(states.second.recording).toBe(false);
  expect(states.second.startedAt).toBeUndefined();

  await extensionWorker.evaluate(async (windowId) => {
    const chromeApi = (globalThis as any).chrome;
    await chromeApi.windows.remove(windowId);
  }, secondWindow);
});
