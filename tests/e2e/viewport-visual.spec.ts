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
  expect(second.rulesRun).toBe(91);
});

test('contrast backdrop verification preserves conservative outcomes for opaque RGB and budget exhaustion', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/viewport-visual.html`);
  await page.setContent(`<!doctype html><html lang="en"><head><title>Contrast regression</title></head><body>
    <main style="background:#fff;color:#000;font-size:16px"><h1>Contrast regression</h1>
      <div style="position:relative;width:300px;height:100px">
        <div style="position:absolute;left:0;top:0;width:300px;height:100px;background:rgb(0,0,0);z-index:0"></div>
        <p id="opaque-target" style="position:relative;z-index:1;color:rgb(119,119,119);font-size:16px;font-weight:400">Contrast text</p>
      </div>
    </main></body></html>`);
  const opaque = await scanPage(page, extensionWorker);
  expect(opaque.issues.some((finding) => finding.ruleId === 'FT-WCAG-010' && finding.targets.includes('#opaque-target'))).toBe(false);
  expect(opaque.review.some((finding) => finding.ruleId === 'FT-WCAG-010' && finding.targets.includes('#opaque-target'))).toBe(true);

  await page.locator('main').evaluate((main) => {
    main.innerHTML = '<h1>Contrast regression</h1>' + Array.from({ length: 101 }, (_, index) =>
      `<div style="position:relative"><div style="position:absolute;inset:0;background:#000;z-index:0"></div><p id="contrast-${index}" style="position:relative;z-index:1;color:rgb(119,119,119);font-size:16px;font-weight:400">Contrast text</p></div>`,
    ).join('');
  });
  const bounded = await scanPage(page, extensionWorker);
  expect(bounded.issues.filter((finding) => finding.ruleId === 'FT-WCAG-010')).toHaveLength(0);
  expect(bounded.review.filter((finding) => finding.ruleId === 'FT-WCAG-010')).toHaveLength(101);
  expect(bounded.review.some((finding) => finding.evidence?.includes('limit of 100'))).toBe(true);
  expect(bounded.ruleResults?.find((rule) => rule.ruleId === 'FT-WCAG-010')).toMatchObject({ failures: 0, reviews: 101 });
});
