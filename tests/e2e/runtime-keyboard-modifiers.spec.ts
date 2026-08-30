import type { FixtureServer } from './support/fixture-server';
import { startFixtureServer } from './support/fixture-server';
import { expect, readSession, startRecording, test } from './support/extension';

let fixtures: FixtureServer;

test.beforeAll(async () => {
  fixtures = await startFixtureServer();
});

test.afterAll(async () => {
  await fixtures.close();
});

test('preserves Control+Home evidence without treating it as plain Grid Home', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/runtime-keyboard-modifiers.html`);
  await expect(page.getByRole('heading', { name: 'Modified keyboard shortcuts' })).toBeVisible();
  const tabId = await startRecording(extensionWorker, page);

  await page.locator('#b2').focus();
  await page.keyboard.press('Control+Home');
  await expect(page.locator('#a1')).toBeFocused();
  await page.waitForTimeout(450);

  const session = await readSession(extensionWorker, tabId);
  expect(session.events.some((event) => event.ruleId === 'FT-APG-013')).toBe(false);
  expect(session.events.some((event) => event.kind === 'keydown' && event.title === 'Key: Control+Home')).toBe(true);
  expect(session.recording).toBe(true);
});
