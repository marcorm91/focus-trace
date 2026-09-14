import type { BrowserContext, Worker } from '@playwright/test';
import { APG_WIDGET_FIXTURES } from './fixtures/guided-apg-widget-fixtures';
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

async function saveScan(panel: Awaited<ReturnType<typeof openSidepanel>>) {
  await panel.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('Could not resolve the sidepanel test tab.');
    await chrome.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId: tab.id,
      scan: {
        engine: 'FocusTrace Rules',
        standard: 'WCAG 2.2',
        url: 'https://example.test/apg-guided',
        title: 'APG guided sample',
        scannedAt: 100,
        scope: { type: 'page' },
        issues: [],
        review: [],
        warnings: [],
        passes: 1,
        rulesRun: 1,
      },
    });
  });
}

test('every guided APG pattern ships accessible, failure and review browser fixtures', async ({ page }) => {
  expect(APG_WIDGET_FIXTURES).toHaveLength(8);

  for (const fixtureSet of APG_WIDGET_FIXTURES) {
    for (const state of ['accessible', 'failure', 'review'] as const) {
      const fixture = fixtureSet.variants[state];
      await page.setContent(`<main><h1>${fixtureSet.pattern} ${state}</h1>${fixture.html}</main>`);
      await expect(page.locator(`[data-fixture-root="${fixtureSet.pattern}"]`)).toHaveCount(1);
      expect(fixture.description.trim()).not.toBe('');
    }
  }
});

test('APG guided report labels guidance as informative and retains the implementation variation', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await saveScan(panel);

  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  await panel.getByLabel(/Guided workflow|Flujo guiado/).selectOption('FT-GUIDED-009');

  await expect(panel.getByRole('heading', { level: 2, name: /Tabs pattern review|Revisión del patrón de pestañas/ })).toBeVisible();
  await expect(panel.getByText(/Informative APG guidance|Guía APG informativa/)).toBeVisible();
  const variation = panel.getByLabel(/Implementation variation|Variante de implementación/);
  await variation.selectOption('manual-activation');

  await panel.getByRole('button', { name: /Start guided test|Iniciar prueba guiada/ }).click();
  const selectedVariation = panel.getByText(/Implementation variation:\s*Manual activation|Variante de implementación:\s*Activación manual/);
  await expect(selectedVariation).toBeVisible();
  await expect(panel.getByText(/relevant widget-pattern observations|observaciones relevantes del patrón de widget/)).toBeVisible();

  for (let index = 0; index < 3; index += 1) {
    await panel.getByRole('radio', { name: /No issue found|No he encontrado problemas/ }).check();
    await panel.getByRole('button', { name: index === 2 ? /Save result|Guardar resultado/ : /Save and continue|Guardar y continuar/ }).click();
  }

  await expect(panel.getByText(/APG guidance remains informative|La guía APG sigue siendo informativa/)).toBeVisible();
  await expect(selectedVariation).toBeVisible();
});
