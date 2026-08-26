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

  await expect(panel).toHaveTitle('FocusTrace');
  await expect(panel.locator('html')).toHaveAttribute('lang', /^(en|es)$/);
  await expect(panel.getByRole('main')).toHaveCount(1);
  await expect(panel.getByRole('navigation', { name: /FocusTrace sections|Secciones de FocusTrace/ })).toBeVisible();
  await expect(panel.getByRole('region', { name: /Page tools|Herramientas de página/ })).toBeVisible();

  const visibleButtons = panel.getByRole('button');
  const buttonCount = await visibleButtons.count();
  for (let index = 0; index < buttonCount; index += 1) {
    const button = visibleButtons.nth(index);
    if (!(await button.isVisible())) continue;
    const accessibleLabel = await button.evaluate((element) =>
      element.getAttribute('aria-label')?.trim()
      || element.textContent?.replace(/\s+/g, ' ').trim()
      || '',
    );
    expect(accessibleLabel, `button ${index + 1} should have a readable label`).not.toBe('');
  }

  await panel.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await panel.keyboard.press('Tab');
  const reset = panel.getByRole('button', { name: /Start over|Empezar de cero/ });
  await expect(reset).toBeFocused();
  const focusStyle = await reset.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(focusStyle.width).toBeGreaterThanOrEqual(2);
  expect(focusStyle.style).not.toBe('none');

  await panel.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: /Open settings|Abrir ajustes/ })).toBeFocused();
  await panel.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: /Analyze this page|Analizar esta página/ })).toBeFocused();
  await panel.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: /Automate focus|Automatizar foco/ })).toBeFocused();
  await panel.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: /Review|Revisión/ })).toBeFocused();
});

test('default readable UI text is at least 14px', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  const samples = [
    panel.locator('.brand p'),
    panel.locator('.quick-start-copy p'),
    panel.getByRole('button', { name: /Analyze this page|Analizar esta página/ }),
    panel.getByRole('button', { name: /Automate focus|Automatizar foco/ }),
    panel.getByRole('button', { name: /Review|Revisión/ }),
  ];

  for (const sample of samples) {
    await expect(sample).toBeVisible();
    const fontSize = await sample.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(14);
  }
});

test('sidepanel stays inside a narrow viewport and uses the product logo', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await panel.setViewportSize({ width: 360, height: 800 });

  const brandMark = panel.locator('.brand-mark');
  await expect(brandMark).toBeVisible();
  const brandImage = await brandMark.evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(brandImage).toContain('/icon/48.png');

  const noHorizontalOverflow = await panel.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(noHorizontalOverflow).toBe(true);

  await panel.getByRole('button', { name: 'Trace' }).click();
  const startTrace = panel.getByRole('button', { name: /Start trace|Iniciar traza/ });
  await expect(startTrace).toBeVisible();
  await expect(startTrace).toHaveAttribute('title', /.+/);

  const traceFits = await panel.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(traceFits).toBe(true);
});

test('language setting updates the document language and visible navigation', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await panel.getByRole('button', { name: /Open settings|Abrir ajustes/ }).click();

  const spanish = panel.getByRole('radio', { name: /Español/ });
  await spanish.check();

  await expect(panel.locator('html')).toHaveAttribute('lang', 'es');
  await expect(panel.getByRole('heading', { level: 2, name: 'Ajustes' })).toBeVisible();
  await expect(panel.getByRole('navigation', { name: 'Secciones de FocusTrace' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Revisión' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Encabezados' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Informe' })).toBeVisible();
});

test('text and interface size reaches 130 percent, persists and does not overflow', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await panel.setViewportSize({ width: 360, height: 800 });
  await panel.getByRole('button', { name: /Open settings|Abrir ajustes/ }).click();

  const increase = panel.getByRole('button', { name: /Increase text and interface size|Aumentar tamaño de texto e interfaz/ });
  const current = panel.locator('.ui-scale-value');
  await expect(current).toHaveText('100%');

  await increase.click();
  await increase.click();
  await increase.click();

  await expect(current).toHaveText('130%');
  await expect(increase).toBeDisabled();
  await expect(panel.locator('html')).toHaveAttribute('data-ft-ui-scale', '130');

  const noHorizontalOverflow = await panel.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(noHorizontalOverflow).toBe(true);

  await panel.reload();
  await expect(panel.locator('html')).toHaveAttribute('data-ft-ui-scale', '130');
  await panel.getByRole('button', { name: /Open settings|Abrir ajustes/ }).click();
  await expect(panel.locator('.ui-scale-value')).toHaveText('130%');
});

test('report opens a formatted PDF preview without exposing CSS selectors', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);

  await panel.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('Could not resolve the sidepanel test tab.');
    await chrome.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId: tab.id,
      scan: {
        engine: 'FocusTrace Rules',
        standard: 'WCAG 2.2',
        url: 'https://example.test/checkout',
        title: 'Checkout accessibility fixture',
        scannedAt: Date.now(),
        issues: [{
          id: 'print-fixture-1',
          ruleId: 'FT-WCAG-003',
          title: 'Button has no accessible name',
          description: 'The button needs an accessible name.',
          severity: 'critical',
          outcome: 'fail',
          targets: ['#private-selector-must-not-print'],
          evidence: 'Accessible name is empty.',
          references: [{
            type: 'WCAG',
            id: '4.1.2',
            label: 'Name, Role, Value',
            level: 'A',
            url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
          }],
        }],
        review: [],
        warnings: [],
        headings: [{ id: 'heading-1', level: 1, text: 'Checkout', selector: 'h1', signals: [] }],
        passes: 3,
        rulesRun: 17,
      },
    });
  });

  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  const exportPdf = panel.getByRole('button', { name: /Export PDF|Exportar PDF/ });
  await expect(exportPdf).toBeVisible();

  const newPage = context.waitForEvent('page');
  await exportPdf.click();
  const printable = await newPage;
  await printable.waitForLoadState('domcontentloaded');

  await expect(printable).toHaveURL(/report-print\.html\?tabId=/);
  await expect(printable.getByRole('heading', { level: 1, name: 'Checkout accessibility fixture' })).toBeVisible();
  await expect(printable.getByRole('button', { name: /Print \/ Save as PDF|Imprimir \/ Guardar como PDF/ })).toBeVisible();
  await expect(printable.getByRole('link', { name: 'WCAG 4.1.2 (A)' })).toBeVisible();
  await expect(printable.getByText('#private-selector-must-not-print')).toHaveCount(0);
});
