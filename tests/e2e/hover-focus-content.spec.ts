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

test('records a WCAG 1.4.13 hoverable review when revealed content disappears under the real pointer path', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/hover-focus-content.html`);
  await expect(page.getByRole('heading', { name: 'Hover focus content runtime' })).toBeVisible();
  const tabId = await startRecording(extensionWorker, page);

  const trigger = page.locator('#bad-trigger');
  const tooltip = page.locator('#bad-tooltip');
  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await page.waitForTimeout(260);

  const box = await tooltip.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(tooltip).toBeHidden();

  const state = await waitForSession(
    extensionWorker,
    tabId,
    (candidate) => candidate.events.some((event) =>
      event.ruleId === 'FT-RUNTIME-015'
      && event.kind === 'hover-focus-content'
      && event.outcome === 'review'
      && event.detail?.includes('requirement=hoverable'),
    ),
  );

  const review = state.events.find((event) => event.ruleId === 'FT-RUNTIME-015');
  expect(review?.references?.some((reference) => reference.type === 'WCAG' && reference.id === '1.4.13')).toBe(true);
  expect(review?.detail).toContain('mode=hover');
  expect(review?.detail).toContain('additional=#bad-tooltip');
});

test('keeps a hoverable additional-content interaction silent when the pointer can enter the revealed content', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/hover-focus-content.html`);
  const tabId = await startRecording(extensionWorker, page);

  const trigger = page.locator('#good-trigger');
  const tooltip = page.locator('#good-tooltip');
  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await page.waitForTimeout(260);

  const box = await tooltip.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(tooltip).toBeVisible();
  await page.waitForTimeout(500);

  const state = await readSession(extensionWorker, tabId);
  expect(state.events.some((event) => event.ruleId === 'FT-RUNTIME-015')).toBe(false);
});
