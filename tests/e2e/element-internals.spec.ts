import type { ScanResult } from '../../shared/types';
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

test('MAIN-world ElementInternals evidence reaches the static scanner without leaking internals objects', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/element-internals.html`);
  await expect(page.locator('h1')).toHaveText('ElementInternals fixture');

  const tabId = await extensionWorker.evaluate(async (url) => {
    const chromeApi = (globalThis as any).chrome;
    const tabs = await chromeApi.tabs.query({});
    const tab = tabs.find((candidate: any) => candidate.url === url);
    if (tab?.id == null) throw new Error(`Could not resolve browser tab for ${url}`);
    return tab.id as number;
  }, page.url());

  await extensionWorker.evaluate(async (id) => {
    const chromeApi = (globalThis as any).chrome;
    await chromeApi.scripting.executeScript({
      target: { tabId: id },
      files: ['/content-scripts/element-internals-bridge.js'],
      world: 'MAIN',
    });
  }, tabId);

  await page.evaluate(() => {
    const createFixtures = (window as unknown as { createElementInternalsFixtures?: () => void }).createElementInternalsFixtures;
    if (!createFixtures) throw new Error('ElementInternals fixture initializer is unavailable');
    createFixtures();
  });

  await expect(page.locator('#named-button')).toBeAttached();
  await expect(page.locator('#unnamed-field')).toBeAttached();
  await expect(page.locator('#labelled-field')).toBeAttached();

  const scan = await extensionWorker.evaluate(async (id) => {
    const chromeApi = (globalThis as any).chrome;
    try {
      await chromeApi.tabs.sendMessage(id, { type: 'FOCUSTRACE_PING' });
    } catch {
      await chromeApi.scripting.executeScript({
        target: { tabId: id },
        files: ['/content-scripts/runtime.js'],
      });
    }
    return chromeApi.tabs.sendMessage(id, { type: 'FOCUSTRACE_RUN_SCAN' });
  }, tabId) as ScanResult;

  expect(scan.issues.some((issue) => issue.ruleId === 'FT-WCAG-003' && issue.targets.includes('#named-button'))).toBe(false);
  expect(scan.issues.some((issue) => issue.ruleId === 'FT-WCAG-004' && issue.targets.includes('#labelled-field'))).toBe(false);

  const unnamed = scan.issues.find((issue) => issue.ruleId === 'FT-WCAG-004' && issue.targets.includes('#unnamed-field'));
  expect(unnamed?.accessibleName?.role).toBe('textbox');
  expect(unnamed?.evidence).toContain('ElementInternals page-world bridge');

  const serialized = JSON.stringify(scan);
  expect(serialized).not.toContain('attachInternals');
  expect(serialized).not.toContain('ElementInternals object');
});
