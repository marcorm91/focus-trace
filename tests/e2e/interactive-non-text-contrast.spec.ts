import type { FixtureServer } from './support/fixture-server';
import { startFixtureServer } from './support/fixture-server';
import { expect, readSession, startRecording, test, waitForSession } from './support/extension';

let fixtures: FixtureServer;

test.beforeAll(async () => {
  fixtures = await startFixtureServer();
});

test.afterAll(async () => {
  await fixtures.close();
});

test('records WCAG 1.4.11 review for a real hover state with measured low icon contrast', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/interactive-non-text-contrast.html`);
  await expect(page.getByRole('heading', { name: 'Interactive non-text contrast runtime' })).toBeVisible();
  const tabId = await startRecording(extensionWorker, page);

  await page.locator('#bad-hover').hover();

  const state = await waitForSession(
    extensionWorker,
    tabId,
    (candidate) => candidate.events.some((event) =>
      event.ruleId === 'FT-RUNTIME-016'
      && event.kind === 'contrast-state'
      && event.outcome === 'review'
      && event.element?.selector === '#bad-hover'
      && event.detail?.includes('state=hover')
      && event.detail?.includes('kind=graphic'),
    ),
  );

  const review = state.events.find((event) =>
    event.ruleId === 'FT-RUNTIME-016' && event.element?.selector === '#bad-hover');
  expect(review?.references?.some((reference) => reference.type === 'WCAG' && reference.id === '1.4.11')).toBe(true);
  expect(review?.detail).toContain('required=3:1');
});

test('keeps a real hover state silent when the measured icon contrast is sufficient', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/interactive-non-text-contrast.html`);
  const tabId = await startRecording(extensionWorker, page);

  await page.locator('#good-hover').hover();
  await page.waitForTimeout(350);

  const state = await readSession(extensionWorker, tabId);
  expect(state.events.some((event) =>
    event.ruleId === 'FT-RUNTIME-016' && event.element?.selector === '#good-hover')).toBe(false);
});

test('records a measured low focus outline only after a real keyboard focus transition', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/interactive-non-text-contrast.html`);
  const tabId = await startRecording(extensionWorker, page);

  await page.keyboard.press('Tab');
  await expect(page.locator('#bad-focus')).toBeFocused();

  const state = await waitForSession(
    extensionWorker,
    tabId,
    (candidate) => candidate.events.some((event) =>
      event.ruleId === 'FT-RUNTIME-016'
      && event.kind === 'contrast-state'
      && event.element?.selector === '#bad-focus'
      && event.detail?.includes('kind=focus-indicator')
      && (event.detail?.includes('state=focus-visible') || event.detail?.includes('state=focus')),
    ),
  );

  const review = state.events.find((event) =>
    event.ruleId === 'FT-RUNTIME-016' && event.element?.selector === '#bad-focus');
  expect(review?.detail).toContain('required=3:1');
});
