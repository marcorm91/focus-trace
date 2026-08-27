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

test('component scope is consumed once and excludes findings outside the selected subtree', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/component-scan.html`);
  await expect(page.locator('#checkout')).toBeVisible();

  const tabId = await extensionWorker.evaluate(async (url) => {
    const chromeApi = (globalThis as any).chrome;
    const tabs = await chromeApi.tabs.query({});
    const tab = tabs.find((candidate: any) => candidate.url === url);
    if (tab?.id == null) throw new Error(`Could not resolve browser tab for ${url}`);
    return tab.id as number;
  }, page.url());

  const componentScan = await extensionWorker.evaluate(async ({ id }) => {
    const chromeApi = (globalThis as any).chrome;
    try {
      await chromeApi.tabs.sendMessage(id, { type: 'FOCUSTRACE_PING' });
    } catch {
      await chromeApi.scripting.executeScript({
        target: { tabId: id },
        files: ['/content-scripts/runtime.js'],
      });
    }

    const scope = {
      type: 'component',
      selector: '#checkout',
      tag: 'section',
      label: 'Checkout',
    };
    await chromeApi.scripting.executeScript({
      target: { tabId: id },
      func: (value: unknown) => {
        document.documentElement.setAttribute('data-focustrace-scan-component', JSON.stringify(value));
      },
      args: [scope],
    });

    return chromeApi.tabs.sendMessage(id, { type: 'FOCUSTRACE_RUN_SCAN' });
  }, { id: tabId }) as ScanResult;

  const componentTargets = componentScan.issues.flatMap((issue) => issue.targets);
  expect(componentScan.scope).toEqual({
    type: 'component',
    selector: '#checkout',
    tag: 'section',
    label: 'Checkout',
  });
  expect(componentTargets).toContain('#inside-empty');
  expect(componentTargets).not.toContain('#outside-empty');
  expect(componentScan.headings).toBeUndefined();
  expect(componentScan.rulesRun).toBeLessThan(17);

  const fullPageScan = await extensionWorker.evaluate(async (id) => {
    const chromeApi = (globalThis as any).chrome;
    return chromeApi.tabs.sendMessage(id, { type: 'FOCUSTRACE_RUN_SCAN' });
  }, tabId) as ScanResult;

  const pageTargets = fullPageScan.issues.flatMap((issue) => issue.targets);
  expect(fullPageScan.scope).toEqual({ type: 'page' });
  expect(pageTargets).toContain('#inside-empty');
  expect(pageTargets).toContain('#outside-empty');
  expect(fullPageScan.rulesRun).toBe(17);
});
