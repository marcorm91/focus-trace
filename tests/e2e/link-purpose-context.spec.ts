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

test('reviews generic link names and preserves programmatic context evidence', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/link-purpose-context.html`);
  await expect(page.getByRole('heading', { name: 'Link purpose in context' })).toBeVisible();

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

  const findings = scan.review.filter((issue) => issue.ruleId === 'FT-REVIEW-027');
  const rule = scan.ruleResults?.find((candidate) => candidate.ruleId === 'FT-REVIEW-027');

  expect(findings).toHaveLength(2);
  expect(findings.find((issue) => issue.targets[0] === '#product-more')).toMatchObject({
    linkPurposeContext: {
      accessibleName: 'Read more',
      matchedPhrase: 'read more',
      contextTextObserved: true,
      contexts: expect.arrayContaining([
        expect.objectContaining({
          source: 'sentence',
          selector: '#product-context',
          text: 'Read more about the TrailPro backpack.',
        }),
      ]),
    },
  });
  expect(findings.find((issue) => issue.targets[0] === '#invoice-here')).toMatchObject({
    linkPurposeContext: {
      accessibleName: 'Here',
      contexts: expect.arrayContaining([
        {
          source: 'aria-describedby',
          selector: '#invoice-context',
          text: 'Download the April invoice as PDF',
        },
      ]),
    },
  });
  expect(rule).toMatchObject({
    applicable: 2,
    passed: 0,
    failures: 0,
    reviews: 2,
    warnings: 0,
    coverage: 'findings-only',
  });
});
