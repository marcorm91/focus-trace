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

test('page scan exposes bounded keyboard, refresh and autoplay-audio evidence', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/keyboard-navigation-motion.html`);
  await expect(page.locator('#unreachable-scroll')).toBeVisible();

  const result = await scanPage(page, extensionWorker);

  expect(result.warnings.filter((issue) => issue.ruleId === 'FT-WARN-028')).toHaveLength(2);
  expect(result.issues.some((issue) => issue.ruleId === 'FT-WCAG-022')).toBe(true);
  expect(result.review.some((issue) => issue.ruleId === 'FT-REVIEW-043' && issue.targets.includes('#unreachable-scroll'))).toBe(true);
  expect(result.review.some((issue) => issue.ruleId === 'FT-REVIEW-043' && issue.targets.includes('#reachable-scroll'))).toBe(false);
  expect(result.review.some((issue) => issue.ruleId === 'FT-REVIEW-044' && issue.targets.includes('#autoplay-audio'))).toBe(true);
  expect(result.rulesRun).toBe(91);
});
