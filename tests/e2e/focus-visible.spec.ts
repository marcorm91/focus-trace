import type { FixtureServer } from './support/fixture-server';
import { startFixtureServer } from './support/fixture-server';
import { expect, startRecording, test, waitForSession } from './support/extension';

let fixtures: FixtureServer;

const BASELINE_SETTLE_MS = 2_500;

test.beforeAll(async () => {
  fixtures = await startFixtureServer();
});

test.afterAll(async () => {
  await fixtures.close();
});

test('reviews stable keyboard focus with no local visible pixel change and accepts a visible indicator', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/focus-visible.html`);
  await expect(page.getByRole('heading', { name: 'Focus visible runtime' })).toBeVisible();
  const tabId = await startRecording(extensionWorker, page);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Tab');
  await expect(page.locator('#before')).toBeFocused();
  // The first focused control has to remain in place long enough for the
  // one-second ACT stability window plus the two lossless capture/decode steps
  // that establish the adjacent target's stable non-focused baseline.
  await page.waitForTimeout(BASELINE_SETTLE_MS);

  await page.keyboard.press('Tab');
  await expect(page.locator('#no-indicator')).toBeFocused();

  const reviewed = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) =>
      event.ruleId === 'FT-RUNTIME-010' && event.element?.selector === '#no-indicator',
    ),
  );

  const finding = reviewed.events.find((event) =>
    event.ruleId === 'FT-RUNTIME-010' && event.element?.selector === '#no-indicator',
  );
  expect(finding).toMatchObject({
    kind: 'focus',
    outcome: 'review',
    severity: 'serious',
    element: { selector: '#no-indicator' },
  });
  expect(finding?.references?.map((reference) => reference.id)).toEqual(['2.4.7', 'oj04fd']);
  expect(reviewed.events.some((event) =>
    event.kind === 'keydown'
      && event.title.includes('Tab')
      && event.interactionId === finding?.interactionId,
  )).toBe(true);

  await page.waitForTimeout(300);
  await page.keyboard.press('Tab');
  await expect(page.locator('#visible')).toBeFocused();
  await page.waitForTimeout(1_600);

  const finalSession = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) =>
      event.kind === 'focus' && event.element?.selector === '#visible',
    ),
  );
  expect(finalSession.events.some((event) =>
    event.ruleId === 'FT-RUNTIME-010' && event.element?.selector === '#visible',
  )).toBe(false);
});