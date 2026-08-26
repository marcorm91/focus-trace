import type { BrowserContext, Page, Worker } from '@playwright/test';
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

async function openSidepanel(context: BrowserContext, extensionWorker: Worker) {
  const extensionId = new URL(extensionWorker.url()).hostname;
  if (!extensionId) throw new Error('Could not resolve the FocusTrace extension ID from its service worker.');
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByRole('heading', { level: 1, name: 'FocusTrace' })).toBeVisible();
  return panel;
}

async function tabIdForPage(worker: Worker, page: Page): Promise<number> {
  const targetUrl = page.url();
  return worker.evaluate(async (url) => {
    const chromeApi = (globalThis as any).chrome;
    const tabs = await chromeApi.tabs.query({});
    const tab = tabs.find((candidate: any) => candidate.url === url);
    if (tab?.id == null) throw new Error(`Could not resolve browser tab for ${url}`);
    return tab.id as number;
  }, targetUrl);
}

async function saveScan(panel: Page, tabId: number, url: string): Promise<void> {
  await panel.evaluate(async ({ id, pageUrl }) => {
    const chromeApi = (globalThis as any).chrome;
    const reference = {
      type: 'WCAG',
      id: '4.1.2',
      label: 'Name, Role, Value',
      level: 'A',
      url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
    };
    const issue = (idSuffix: string, selector: string, label: string) => ({
      id: `scan-target-${idSuffix}`,
      ruleId: 'FT-WCAG-003',
      title: 'Button has no accessible name',
      description: `Fixture finding for ${label}.`,
      severity: 'critical',
      outcome: 'fail',
      targets: [selector],
      evidence: `${label} is the selected fixture target.`,
      references: [reference],
    });

    await chromeApi.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId: id,
      scan: {
        engine: 'FocusTrace Rules',
        standard: 'WCAG 2.2',
        url: pageUrl,
        title: 'Scan target navigation fixture',
        scannedAt: Date.now(),
        issues: [
          issue('first', '#first-target', 'First target'),
          issue('second', '#second-target', 'Second target'),
        ],
        review: [],
        warnings: [],
        headings: [],
        passes: 4,
        rulesRun: 17,
      },
    });
  }, { id: tabId, pageUrl: url });
}

test('Inspect, occurrence navigation and Review on page track the real target', async ({ context, extensionWorker }) => {
  const inspected = await context.newPage();
  await inspected.goto(`${fixtures.origin}/scan-targets.html`);
  await expect(inspected.getByRole('button', { name: 'First target' })).toBeVisible();
  const tabId = await tabIdForPage(extensionWorker, inspected);

  const panel = await openSidepanel(context, extensionWorker);
  await inspected.bringToFront();
  await saveScan(panel, tabId, inspected.url());

  await expect.poll(async () => panel.locator('.section-heading p').first().textContent()).toContain('Scan target navigation fixture');

  const inspect = panel.getByRole('button', {
    name: /Highlight element and inspect its DOM|Destacar elemento e inspeccionar su DOM/,
  }).first();
  await inspect.click();

  const overlay = inspected.locator('[data-focustrace-scan-highlight]');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('First target');
  await expect(panel.getByText(/^(DOM fragment|Fragmento DOM)$/)).toBeVisible();

  const next = panel.getByRole('button', {
    name: /Next affected element|Siguiente elemento afectado/,
  });
  await next.click();

  await expect(panel.locator('.scan-occurrence-pager strong')).toHaveText(/2 (of|de) 2/);
  await expect(overlay).toContainText('Second target');
  await expect.poll(() => inspected.evaluate(() => window.scrollY)).toBeGreaterThan(500);

  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  await expect(panel.getByRole('heading', { level: 2, name: /Accessibility report|Informe de accesibilidad/ })).toBeVisible();

  const findingList = panel.locator('.report-finding-list');
  const findingCards = panel.locator('.report-finding');
  await expect(findingCards).toHaveCount(2);
  const cardLayout = await findingList.evaluate((list) => {
    const listStyle = getComputedStyle(list);
    const card = list.querySelector<HTMLElement>('.report-finding');
    if (!card) throw new Error('Expected a report finding card.');
    const cardStyle = getComputedStyle(card);
    return {
      gap: Number.parseFloat(listStyle.rowGap),
      padding: Number.parseFloat(cardStyle.paddingTop),
      border: Number.parseFloat(cardStyle.borderTopWidth),
    };
  });
  expect(cardLayout.gap).toBeGreaterThanOrEqual(10);
  expect(cardLayout.padding).toBeGreaterThanOrEqual(10);
  expect(cardLayout.border).toBeGreaterThanOrEqual(1);

  const reviewOnPage = panel.getByRole('button', {
    name: /Review on page|Revisar en la página/,
  });
  await expect(reviewOnPage).toHaveCount(2);
  await reviewOnPage.first().click();

  await expect(overlay).toContainText('First target');
  await expect.poll(() => inspected.evaluate(() => window.scrollY)).toBeLessThan(500);
});
