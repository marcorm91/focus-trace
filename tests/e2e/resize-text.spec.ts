import type { ScanResult, TextResizeBaseline } from '../../shared/types';
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

test('compares the same page at 100% and 200% without changing zoom itself', async ({ page, extensionWorker }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${fixtures.origin}/resize-text.html`);
  await expect(page.getByRole('heading', { name: 'Resize text' })).toBeVisible();

  const result = await extensionWorker.evaluate(async (url) => {
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
    await chromeApi.tabs.setZoom(tab.id, 1);
    const baseline = await chromeApi.tabs.sendMessage(tab.id, {
      type: 'FOCUSTRACE_CAPTURE_TEXT_RESIZE_BASELINE',
      zoomFactor: 1,
    }) as TextResizeBaseline;
    await chromeApi.tabs.setZoom(tab.id, 2);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const scan = await chromeApi.tabs.sendMessage(tab.id, {
      type: 'FOCUSTRACE_RUN_SCAN',
      textResize: { zoomFactor: 2, baseline },
    }) as ScanResult;
    return { baseline, scan, zoom: await chromeApi.tabs.getZoom(tab.id) };
  }, page.url()) as { baseline: TextResizeBaseline; scan: ScanResult; zoom: number };

  expect(result.zoom).toBe(2);
  expect(result.baseline.zoomFactor).toBe(1);
  expect(result.scan.textResize).toMatchObject({
    phase: 'comparison-complete',
    baselineZoomFactor: 1,
    currentZoomFactor: 2,
  });

  const findings = result.scan.review.filter((issue) => issue.ruleId === 'FT-REVIEW-028');
  expect(findings.find((issue) => issue.targets[0] === '#shrunk')?.textResize).toMatchObject({
    kind: 'insufficient-enlargement',
    observedScale: 1.2,
  });
  expect(findings.find((issue) => issue.targets[0] === '#clipped-action')?.textResize).toMatchObject({
    kind: 'clipped-content',
    clippedBy: '#clip',
  });
  expect(findings.find((issue) => issue.targets[0] === '#lost-at-zoom')?.textResize?.kind)
    .toBe('content-unavailable');
  expect(findings.some((issue) => issue.targets[0] === '#replacement-desktop')).toBe(false);
});
