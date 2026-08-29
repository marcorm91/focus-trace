import { expect, startRecording, test, waitForSession } from './support/extension';
import { startFixtureServer, type FixtureServer } from './support/fixture-server';

let fixtures: FixtureServer;

test.beforeAll(async () => {
  fixtures = await startFixtureServer();
});

test.afterAll(async () => {
  await fixtures.close();
});

test('removes one manual interaction and all correlated evidence while preserving the rest of Trace', async ({ page, context, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/runtime-aria.html`);
  const tabId = await startRecording(extensionWorker, page);

  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('tab', { name: 'Account' }).click();

  let session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => new Set(state.events.map((event) => event.interactionId).filter(Boolean)).size >= 2,
  );

  const interactionIds = [...new Set(session.events.map((event) => event.interactionId).filter((id): id is string => Boolean(id)))];
  const removedId = interactionIds[0];
  const keptId = interactionIds[1];
  expect(removedId).toBeTruthy();
  expect(keptId).toBeTruthy();

  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.interactionId === removedId && event.outcome != null),
  );
  expect(session.events.some((event) => event.interactionId === removedId && event.outcome != null)).toBe(true);

  const extensionId = new URL(extensionWorker.url()).hostname;
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await panel.evaluate(async ({ id, interactionId }) => {
    const chromeApi = (globalThis as any).chrome;
    await chromeApi.tabs.sendMessage(id, { type: 'FOCUSTRACE_SET_RECORDING', enabled: false });
    await chromeApi.runtime.sendMessage({
      type: 'FOCUSTRACE_SET_RECORDING_STATE',
      tabId: id,
      enabled: false,
    });
    await chromeApi.runtime.sendMessage({
      type: 'FOCUSTRACE_DELETE_INTERACTION',
      tabId: id,
      interactionId,
    });
  }, { id: tabId, interactionId: removedId });

  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => !state.recording && !state.events.some((event) => event.interactionId === removedId),
  );

  expect(session.events.some((event) => event.interactionId === removedId)).toBe(false);
  expect(session.events.some((event) => event.interactionId === keptId)).toBe(true);
  expect(session.events.length).toBeGreaterThan(0);
  expect(session.recording).toBe(false);
});
