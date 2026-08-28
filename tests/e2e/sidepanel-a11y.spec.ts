import type { BrowserContext, Worker } from '@playwright/test';
import { expect, test } from './support/extension';

declare const chrome: {
  tabs: {
    query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number }>>;
  };
  runtime: {
    sendMessage(message: unknown): Promise<unknown>;
  };
};

async function openSidepanel(context: BrowserContext, extensionWorker: Worker) {
  const extensionId = new URL(extensionWorker.url()).hostname;
  if (!extensionId) throw new Error('Could not resolve the FocusTrace extension ID from its service worker.');
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByRole('heading', { level: 1, name: 'FocusTrace' })).toBeVisible();
  return panel;
}

test('sidepanel exposes an accessible shell and keyboard order', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await expect(panel.locator('html')).toHaveAttribute('lang', /en|es/);
  await expect(panel.getByRole('main')).toBeVisible();
  await expect(panel.getByRole('navigation', { name: /FocusTrace sections|Secciones de FocusTrace/ })).toBeVisible();

  const tabOrder = await panel.locator('button, [href], input, summary, select, textarea, [tabindex]:not([tabindex="-1"])').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const node = element as HTMLElement;
        return !node.hasAttribute('disabled') && node.offsetParent !== null;
      })
      .map((element) => ({
        text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        label: element.getAttribute('aria-label') ?? element.getAttribute('title') ?? '',
      })),
  );
  expect(tabOrder.length).toBeGreaterThan(4);
});

test('default readable UI text is at least 14px', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  const candidates = await panel.locator('p, li, button, summary, label, span').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const text = (element.textContent ?? '').trim();
        return text.length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((element) => ({
        text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
        px: Number.parseFloat(getComputedStyle(element).fontSize),
      })),
  );
  const undersized = candidates.filter((item) => item.px > 0 && item.px < 14);
  expect(undersized).toEqual([]);
});

test('sidepanel stays inside a narrow viewport and uses the product logo', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await panel.setViewportSize({ width: 320, height: 720 });
  await expect(panel.locator('.brand-logo')).toBeVisible();
  const fits = await panel.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
});

test('settings becomes a focused sub-view and Back restores the workspace', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await panel.getByRole('button', { name: 'Trace', exact: true }).click();
  await panel.getByRole('button', { name: /Open settings|Abrir ajustes/ }).click();
  await expect(panel.getByRole('heading', { name: /Settings|Ajustes/ })).toBeVisible();
  await expect(panel.getByRole('navigation', { name: /FocusTrace sections|Secciones de FocusTrace/ })).not.toBeVisible();
  await panel.getByRole('button', { name: /Back|Volver/ }).click();
  await expect(panel.getByRole('button', { name: 'Trace', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('text and interface size reaches 130 percent, persists and does not overflow', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await panel.getByRole('button', { name: /Open settings|Abrir ajustes/ }).click();
  const scale = panel.locator('input[type="range"]');
  await scale.fill('130');
  await expect(panel.locator('html')).toHaveAttribute('data-ft-ui-scale', '130');
  await expect.poll(() => panel.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('report opens a formatted PDF preview without exposing CSS selectors', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  const longHeading = 'This is a deliberately long heading label used to verify that the complete heading remains readable in a narrow sidepanel viewport';
  const unbrokenHeading = 'VeryLongHeadingWithoutBreaksVeryLongHeadingWithoutBreaksVeryLongHeadingWithoutBreaksVeryLongHeadingWithoutBreaks';

  await panel.evaluate(async ({ longHeadingText, unbrokenHeadingText }) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('Could not resolve the sidepanel test tab.');
    await chrome.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId: tab.id,
      scan: {
        engine: 'FocusTrace Rules',
        standard: 'WCAG 2.2',
        url: 'https://example.test/a11y-report',
        title: 'Accessibility report fixture',
        scannedAt: Date.now(),
        issues: [],
        review: [],
        warnings: [],
        headings: [
          { id: 'heading-1', level: 1, text: 'Checkout', selector: 'h1', signals: [] },
          {
            id: 'heading-2',
            level: 2,
            text: longHeadingText,
            selector: 'h2',
            signals: [],
          },
          {
            id: 'heading-3',
            level: 3,
            text: unbrokenHeadingText,
            selector: 'h3',
            signals: [],
          },
        ],
        passes: 3,
        rulesRun: 17,
      },
    });
  }, { longHeadingText: longHeading, unbrokenHeadingText: unbrokenHeading });

  await panel.setViewportSize({ width: 360, height: 800 });
  await panel.getByRole('button', { name: /Headings|Encabezados/ }).click();

  const shortHeadingLabel = panel.getByRole('button', { name: 'Checkout' }).locator('span').first();
  await expect(shortHeadingLabel).not.toHaveAttribute('title', /.+/);

  const longHeadingLabel = panel.getByRole('button', { name: longHeading }).locator('span').first();
  await expect(longHeadingLabel).not.toHaveAttribute('title', /.+/);
  await expect(longHeadingLabel).toHaveText(longHeading);
  await expect.poll(() => longHeadingLabel.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await expect.poll(() => longHeadingLabel.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.textOverflow !== 'ellipsis' && style.whiteSpace === 'normal';
  })).toBe(true);

  const unbrokenHeadingLabel = panel.getByRole('button', { name: unbrokenHeading }).locator('span').first();
  await expect(unbrokenHeadingLabel).toHaveText(unbrokenHeading);
  await expect.poll(() => unbrokenHeadingLabel.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

  const headingsFit = await panel.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(headingsFit).toBe(true);

  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  const reportFits = await panel.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(reportFits).toBe(true);

  const pagePromise = context.waitForEvent('page');
  await panel.getByRole('button', { name: /Export PDF|Exportar PDF/ }).click();
  const reportPage = await pagePromise;
  await reportPage.waitForLoadState('domcontentloaded');
  await expect(reportPage.getByRole('heading', { name: /Accessibility report|Informe de accesibilidad/ })).toBeVisible();
  await expect(reportPage.locator('body')).not.toContainText('#');
});
