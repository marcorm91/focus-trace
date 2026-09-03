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

test('Inspect, localized impact matrix, occurrence navigation and compact report track the real target', async ({ context, extensionWorker }) => {
  const inspected = await context.newPage();
  await inspected.goto(`${fixtures.origin}/scan-targets.html`);
  await expect(inspected.getByRole('button', { name: 'First target' })).toBeVisible();
  const tabId = await tabIdForPage(extensionWorker, inspected);

  const panel = await openSidepanel(context, extensionWorker);
  await panel.bringToFront();
  await panel.getByRole('button', { name: /Open settings|Abrir ajustes/ }).click();
  await panel.getByRole('radio', { name: /Español/ }).check();
  await expect(panel.locator('html')).toHaveAttribute('lang', 'es');
  await panel.getByRole('button', { name: 'Volver' }).click();

  await inspected.bringToFront();
  await saveScan(panel, tabId, inspected.url());

  await expect.poll(async () => panel.locator('.section-heading p').first().textContent()).toContain('Scan target navigation fixture');
  const impactMatrix = panel.getByRole('region', { name: 'Impacto por resultado' });
  await expect(impactMatrix).toBeVisible();
  await expect(impactMatrix.getByRole('row', { name: /Fallos 2/ })).toBeVisible();
  await expect(impactMatrix.getByRole('columnheader', { name: 'crítico' })).toBeVisible();

  const scanRule = panel.locator('.scan-rule-group').first();
  await expect(scanRule).not.toHaveAttribute('open', '');
  await scanRule.locator(':scope > summary').click();
  await expect(scanRule).toHaveAttribute('open', '');

  const inspect = panel.getByRole('button', {
    name: /Highlight element on page|Destacar elemento en la página/,
  }).first();
  await inspect.click();

  const overlay = inspected.locator('[data-focustrace-scan-highlight]');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('First target');
  await expect(panel.locator('.finding-dom')).not.toBeVisible();
  await expect(panel.getByText('Referencia de impacto comparable', { exact: true })).toHaveCount(0);

  const next = panel.getByRole('button', {
    name: /Next affected element|Siguiente elemento afectado/,
  }).first();
  await next.click();

  await expect(panel.locator('.scan-occurrence-pager strong')).toHaveText(/2 (of|de) 2/);
  await expect(overlay).toContainText('Second target');
  await expect.poll(() => inspected.evaluate(() => window.scrollY)).toBeGreaterThan(500);

  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  await expect(panel.getByRole('heading', { level: 2, name: /Accessibility report|Informe de accesibilidad/ })).toBeVisible();
  await expect(panel.locator('.report-priority-list > li > span').first()).toHaveText('Análisis');

  const reportSection = panel.locator('details.report-accordion-section').filter({
    hasText: /Full page scan|Barrido completo de página/,
  }).first();
  await expect(reportSection).not.toHaveAttribute('open', '');
  await reportSection.locator(':scope > summary').click();
  await expect(reportSection).toHaveAttribute('open', '');

  await expect(panel.locator('.report-compact-tabs')).toBeVisible();
  await expect(panel.locator('.report-rule-group')).toHaveCount(1);
  await expect(panel.locator('.report-rule-count')).toHaveText('2');
  await expect(panel.locator('.report-group').first()).not.toBeVisible();

  const reportRule = panel.locator('.report-rule-group').first();
  const inset = await Promise.all([reportSection.boundingBox(), reportRule.boundingBox()]);
  expect(inset[0]).not.toBeNull();
  expect(inset[1]).not.toBeNull();
  expect(inset[1]!.x).toBeGreaterThan(inset[0]!.x);
  expect(inset[1]!.x + inset[1]!.width).toBeLessThan(inset[0]!.x + inset[0]!.width);

  await expect(reportRule).not.toHaveAttribute('open', '');
  await reportRule.locator(':scope > summary').click();
  await expect(reportRule).toHaveAttribute('open', '');

  const reportNext = panel.getByRole('button', {
    name: /Next affected element|Siguiente elemento afectado/,
  }).last();
  await reportNext.click();
  await expect(panel.locator('.report-rule-pager strong')).toHaveText(/2 (of|de) 2/);
  await expect(overlay).toContainText('Second target');

  const reportPrevious = panel.getByRole('button', {
    name: /Previous affected element|Elemento afectado anterior/,
  }).last();
  await reportPrevious.click();
  await expect(panel.locator('.report-rule-pager strong')).toHaveText(/1 (of|de) 2/);
  await expect(overlay).toContainText('First target');

  const reviewOnPage = panel.getByRole('button', {
    name: /Review on page|Revisar en la página/,
  });
  await expect(reviewOnPage).toHaveCount(1);
  await reviewOnPage.click();

  await expect(overlay).toContainText('First target');
  await expect.poll(() => inspected.evaluate(() => window.scrollY)).toBeLessThan(500);
});
