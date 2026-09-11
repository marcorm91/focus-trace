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

test('reviews persistent Web Animation motion and preserves browser timing evidence', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/pause-stop-hide.html`);
  await expect(page.getByRole('heading', { name: 'Pause, stop, hide' })).toBeVisible();

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

  const findings = scan.review.filter((issue) => issue.ruleId === 'FT-REVIEW-026');
  const rule = scan.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-026');

  expect(findings).toHaveLength(1);
  expect(findings[0]).toMatchObject({
    targets: ['#moving-news'],
    pauseStopHide: {
      kind: 'moving-or-blinking',
      source: 'web-animation',
      automaticStart: 'unknown',
      parallelContent: 'observed',
      durationMs: null,
      thresholdMs: 5_000,
      repeatsIndefinitely: true,
      animationNames: ['news-cycle'],
      controlMechanism: 'none-observed',
      controlSelectors: [],
    },
  });
  expect(findings[0]?.pauseStopHide?.animatedProperties).toEqual(expect.arrayContaining(['opacity', 'transform']));
  expect(rule).toMatchObject({ applicable: 1, passed: 0, failures: 0, reviews: 1, warnings: 0 });
});
