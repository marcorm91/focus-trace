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

test('scans form values, placeholders, generated text and non-DOM graphics', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/contrast-coverage.html`);
  await expect(page.getByRole('heading', { name: 'Contrast coverage' })).toBeVisible();

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

  const textContrast = scan.issues.filter((issue) => issue.ruleId === 'FT-WCAG-010');
  expect(textContrast.map((issue) => issue.targets[0])).toEqual(expect.arrayContaining([
    '#query',
    '#filter',
    '#notes',
    '#province',
    '#generated',
  ]));
  expect(textContrast.map((issue) => issue.contrast?.subject)).toEqual(expect.arrayContaining([
    'input value',
    'placeholder',
    'textarea value',
    'selected option',
    'generated text',
  ]));

  const unresolvedGraphicReviews = scan.review.filter((issue) =>
    issue.ruleId === 'FT-WCAG-011'
    && issue.targets.some((target) => target === '#css-icon' || target === '#chart'),
  );
  expect(unresolvedGraphicReviews).toEqual([]);

  const inactiveStateFindings = [...scan.issues, ...scan.review].filter((issue) =>
    issue.evidence?.includes('.state-target:hover'),
  );
  expect(inactiveStateFindings).toEqual([]);
  expect(scan.review.some((issue) => issue.evidence?.includes('.dropdown-toggle:active'))).toBe(false);
});
