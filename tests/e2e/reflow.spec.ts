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

test('reviews measured overflow and clipped content at a 320 CSS px viewport', async ({ page, extensionWorker }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`${fixtures.origin}/reflow.html`);
  await expect(page.getByRole('heading', { name: 'Reflow' })).toBeVisible();

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

  const findings = scan.review.filter((issue) => issue.ruleId === 'FT-REVIEW-024');
  const overflow = findings.find((issue) => issue.reflow?.kind === 'document-overflow');
  const clipped = findings.find((issue) => issue.reflow?.kind === 'clipped-content' && issue.targets.includes('#clipped-action'));
  const rule = scan.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-024');

  expect(overflow?.reflow).toMatchObject({
    axis: 'horizontal',
    viewportWidth: 320,
  });
  expect(overflow?.reflow?.overflowPixels).toBeGreaterThan(150);
  expect(overflow?.targets).toEqual(expect.arrayContaining(['#wide-three', '#wide-four']));
  expect(clipped?.reflow).toMatchObject({
    axis: 'horizontal',
    clippedBy: '#clipping-panel',
    clipping: 'partial',
  });
  expect(rule).toMatchObject({ passed: 0, failures: 0, reviews: findings.length, warnings: 0 });
});
