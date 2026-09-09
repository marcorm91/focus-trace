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

test('loads Trace-only observers only when Trace is requested', async ({ context, page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/focus-visible.html`);
  await expect(page.locator('main')).toBeVisible();

  const tabId = await extensionWorker.evaluate(async (url) => {
    const chromeApi = (globalThis as any).chrome;
    const tabs = await chromeApi.tabs.query({});
    const tab = tabs.find((candidate: any) => candidate.url === url);
    if (tab?.id == null) throw new Error(`Could not resolve browser tab for ${url}`);
    return tab.id as number;
  }, page.url());

  // Send the request from an extension page, matching the side panel's real
  // message path. A service worker does not dispatch a message back to its own
  // runtime.onMessage listener.
  const extensionId = new URL(extensionWorker.url()).hostname;
  if (!extensionId) throw new Error('Could not resolve the FocusTrace extension ID.');
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  const readiness = async (mode: 'scan' | 'trace') => panel.evaluate(async ({ id, requestedMode }) => {
    const chromeApi = (globalThis as any).chrome;
    await chromeApi.runtime.sendMessage({
      type: 'FOCUSTRACE_ENSURE_INJECTED',
      tabId: id,
      mode: requestedMode,
    });

    const ping = (type: string) => chromeApi.tabs.sendMessage(id, { type })
      .then((response: unknown) => response === true)
      .catch(() => false);

    return {
      scan: await ping('FOCUSTRACE_PING'),
      focusVisible: await ping('FOCUSTRACE_FOCUS_VISIBLE_PING'),
      hoverFocus: await ping('FOCUSTRACE_HOVER_FOCUS_PING'),
    };
  }, { id: tabId, requestedMode: mode });

  expect(await readiness('scan')).toEqual({
    scan: true,
    focusVisible: false,
    hoverFocus: false,
  });
  expect(await readiness('trace')).toEqual({
    scan: true,
    focusVisible: true,
    hoverFocus: true,
  });
});
