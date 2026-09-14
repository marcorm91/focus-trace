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

async function scanPage(page: any, extensionWorker: any): Promise<ScanResult> {
  const url = page.url();
  const tabId = await extensionWorker.evaluate(async (targetUrl: string) => {
    const chromeApi = (globalThis as any).chrome;
    const tabs = await chromeApi.tabs.query({});
    const tab = tabs.find((candidate: any) => candidate.url === targetUrl);
    if (tab?.id == null) throw new Error(`Could not resolve browser tab for ${targetUrl}`);
    try {
      await chromeApi.tabs.sendMessage(tab.id, { type: 'FOCUSTRACE_PING' });
    } catch {
      await chromeApi.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['/content-scripts/runtime.js'],
      });
    }
    return tab.id as number;
  }, url);

  return extensionWorker.evaluate(async (id: number) => {
    const chromeApi = (globalThis as any).chrome;
    return chromeApi.tabs.sendMessage(id, { type: 'FOCUSTRACE_RUN_SCAN' });
  }, tabId) as Promise<ScanResult>;
}

test('page scan covers viewport restrictions, orientation evidence and stacked contrast conservatively', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/viewport-visual.html`);
  await expect(page.locator('#stacked')).toBeVisible();

  const first = await scanPage(page, extensionWorker);
  expect(first.issues.some((issue) => issue.ruleId === 'FT-WCAG-021')).toBe(true);
  expect(first.review.some((issue) => issue.ruleId === 'FT-REVIEW-042' && issue.targets.includes('#orientation-target'))).toBe(true);
  expect(first.issues.some((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#stacked'))).toBe(false);
  expect(first.review.some((issue) => issue.ruleId === 'FT-WCAG-010' && issue.targets.includes('#stacked'))).toBe(true);

  await page.locator('meta[name="viewport"]').evaluate((meta) => {
    meta.setAttribute('content', 'width=device-width, maximum-scale=3, user-scalable=yes');
  });
  const second = await scanPage(page, extensionWorker);
  expect(second.issues.some((issue) => issue.ruleId === 'FT-WCAG-021')).toBe(false);
  expect(second.review.some((issue) => issue.ruleId === 'FT-REVIEW-041')).toBe(true);
  expect(second.rulesRun).toBe(87);
});
