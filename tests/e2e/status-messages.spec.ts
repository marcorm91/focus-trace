import type { FixtureServer } from './support/fixture-server';
import { startFixtureServer } from './support/fixture-server';
import { expect, startRecording, test, waitForSession } from './support/extension';

let fixtures: FixtureServer;

test.beforeAll(async () => {
  fixtures = await startFixtureServer();
});

test.afterAll(async () => {
  await fixtures.close();
});

test('reviews a status-like message without semantics and stays quiet for exposed status/context changes', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/status-messages.html`);
  await expect(page.getByRole('heading', { name: 'Status message runtime' })).toBeVisible();
  const tabId = await startRecording(extensionWorker, page);

  await page.getByRole('button', { name: 'Save without status semantics' }).click();
  let session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-RUNTIME-007'),
  );

  const finding = session.events.find((event) => event.ruleId === 'FT-RUNTIME-007');
  const trigger = session.events.find((event) =>
    event.kind === 'click' && event.element?.selector === '#save-bad',
  );
  expect(finding).toMatchObject({
    kind: 'status-message',
    outcome: 'review',
    severity: 'moderate',
    element: { selector: '#plain-toast' },
  });
  expect(finding?.detail).toContain('“Saved”');
  expect(finding?.interactionId).toBe(trigger?.interactionId);

  const initialFindingCount = session.events.filter((event) => event.ruleId === 'FT-RUNTIME-007').length;

  await page.getByRole('button', { name: 'Save with status semantics' }).click();
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.kind === 'live-region' && event.detail === 'Saved with live status'),
  );
  expect(session.events.filter((event) => event.ruleId === 'FT-RUNTIME-007')).toHaveLength(initialFindingCount);

  await page.getByRole('button', { name: 'Open confirmation dialog' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.kind === 'dialog-open'),
  );
  expect(session.events.filter((event) => event.ruleId === 'FT-RUNTIME-007')).toHaveLength(initialFindingCount);
  expect(session.recording).toBe(true);
});
