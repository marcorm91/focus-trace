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

test('reviews only the color-only inline link and preserves measured evidence', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/use-of-color.html`);
  await expect(page.getByRole('heading', { name: 'Use of color' })).toBeVisible();

  const scan = await extensionWorker.evaluate(async (url) => {
    const chromeApi = (globalThis as any).chrome;
    const tabs = await chromeApi.tabs.query({});
    const tab = tabs.find((candidate: any) => candidate.url === url);
    if (tab?.id == null) throw new Error(`Could not resolve browser tab for ${url}`);
    try {
      await chromeApi.tabs.sendMessage(tab.id, { type: 'FOCUSTRACE_PING' });
    } catch {
      await chromeApi.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['/content-scripts/runtime.js'],
      });
    }
    return chromeApi.tabs.sendMessage(tab.id, { type: 'FOCUSTRACE_RUN_SCAN' });
  }, page.url()) as ScanResult;

  const findings = scan.review.filter((issue) => issue.ruleId === 'FT-REVIEW-025');
  const rule = scan.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-025');

  expect(findings).toHaveLength(1);
  expect(findings[0]).toMatchObject({
    targets: ['#color-only'],
    context: { selector: '#review-context' },
    useOfColor: {
      kind: 'inline-link',
      contextSelector: '#review-context',
      surroundingTextSelector: '#review-context',
      linkColor: 'rgb(0, 0, 255)',
      surroundingTextColor: 'rgb(0, 0, 0)',
      contrastRatio: 2.44,
      requiredRatio: 3,
      persistentVisualCue: 'none-observed',
    },
  });
  expect(rule).toMatchObject({ applicable: 4, passed: 3, failures: 0, reviews: 1, warnings: 0 });
});
