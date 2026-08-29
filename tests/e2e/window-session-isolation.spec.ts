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

  const resolvedTabs = await extensionWorker.evaluate(async (urls) => {
    const chromeApi = (globalThis as any).chrome;
    const tabs = await chromeApi.tabs.query({});
    return urls.map((url: string) => {
      const tab = tabs.find((candidate: any) => candidate.url === url);
      if (tab?.id == null) throw new Error(`Could not resolve browser tab for ${url}`);
      return { id: tab.id as number, windowId: tab.windowId as number };
    });
  }, [firstPage.url(), secondPage.url()]);

  const firstTab = resolvedTabs[0];
  const secondTab = resolvedTabs[1];
  if (!firstTab || !secondTab) throw new Error('Expected two browser tabs for multi-window isolation test.');

  const secondWindow = await extensionWorker.evaluate(async (tabId) => {
    const chromeApi = (globalThis as any).chrome;
    const created = await chromeApi.windows.create({ tabId, focused: false });
    return created.id as number;
  }, secondTab.id);

  expect(secondWindow).not.toBe(firstTab.windowId);

  const sessions = await extensionWorker.evaluate(async ({ firstId, secondId }) => {
    const chromeApi = (globalThis as any).chrome;
    const sendEventFromTab = (tabId: number, eventId: string, title: string) => chromeApi.scripting.executeScript({
      target: { tabId },
      func: async (id: string, eventTitle: string) => {
        const runtime = (globalThis as any).chrome.runtime;
        await runtime.sendMessage({
          type: 'FOCUSTRACE_EVENT',
          event: {
            id,
            timestamp: Date.now(),
            kind: 'click',
            severity: 'info',
            title: eventTitle,
          },
        });
      },
      args: [eventId, title],
    });

    await sendEventFromTab(firstId, 'window-one-event', 'Window one event');
    await sendEventFromTab(secondId, 'window-two-event', 'Window two event');

    const firstKey = `session:${firstId}`;
    const secondKey = `session:${secondId}`;
    const stored = await chromeApi.storage.session.get([firstKey, secondKey]);
    return {
      first: stored[firstKey],
      second: stored[secondKey],
    };
  }, { firstId: firstTab.id, secondId: secondTab.id });

  expect(sessions.first.tabId).toBe(firstTab.id);
  expect(sessions.first.events.map((event: { id: string }) => event.id)).toEqual(['window-one-event']);
  expect(sessions.second.tabId).toBe(secondTab.id);
  expect(sessions.second.events.map((event: { id: string }) => event.id)).toEqual(['window-two-event']);

  await extensionWorker.evaluate(async (windowId) => {
    const chromeApi = (globalThis as any).chrome;
    await chromeApi.windows.remove(windowId);
  }, secondWindow);
});
