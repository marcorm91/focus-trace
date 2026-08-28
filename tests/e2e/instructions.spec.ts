import type { BrowserContext, Worker } from '@playwright/test';
import { expect, test } from './support/extension';

async function openSidepanel(context: BrowserContext, extensionWorker: Worker) {
  const extensionId = new URL(extensionWorker.url()).hostname;
  if (!extensionId) throw new Error('Could not resolve the FocusTrace extension ID from its service worker.');
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByRole('heading', { level: 1, name: 'FocusTrace' })).toBeVisible();
  return panel;
}

test('instructions is a focused bilingual guide and Back restores the previous workspace tab', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);

  await panel.getByRole('button', { name: 'Trace', exact: true }).click();
  await expect(panel.getByRole('button', { name: /Start trace|Iniciar traza/ })).toBeVisible();

  await panel.getByRole('button', { name: /Open instructions|Abrir instrucciones/ }).click();

  await expect(panel.getByRole('heading', { level: 2, name: /How to use FocusTrace|Cómo usar FocusTrace/ })).toBeVisible();
  await expect(panel.getByRole('heading', { level: 3, name: /Start here|Empieza aquí/ })).toBeVisible();

  const review = panel.locator('.instructions-card > summary').filter({ hasText: /Review|Revisión/ });
  const siteAudit = panel.locator('.instructions-card > summary').filter({ hasText: /Site Audit|Análisis de sitio/ });
  const trace = panel.locator('.instructions-card > summary').filter({ hasText: /^Trace$/ });
  const memory = panel.locator('.instructions-card > summary').filter({ hasText: /^FocusTrace Memory$/ });
  await expect(review).toBeVisible();
  await expect(siteAudit).toBeVisible();
  await expect(trace).toBeVisible();
  await expect(memory).toBeVisible();

  const reviewCard = review.locator('..');
  await expect(reviewCard).not.toHaveAttribute('open', '');
  await review.click();
  await expect(reviewCard).toHaveAttribute('open', '');
  await expect(reviewCard.getByText(/Failures are findings|Los fallos son hallazgos/)).toBeVisible();

  await expect(panel.getByRole('navigation', { name: /FocusTrace sections|Secciones de FocusTrace/ })).not.toBeVisible();
  await expect(panel.getByRole('region', { name: /Page tools|Herramientas de página/ })).not.toBeVisible();
  await expect(panel.getByRole('button', { name: /Open settings|Abrir ajustes/ })).not.toBeVisible();

  const back = panel.getByRole('button', { name: /Back|Volver/ });
  await expect(back).toBeVisible();
  await back.click();

  await expect(panel.getByRole('navigation', { name: /FocusTrace sections|Secciones de FocusTrace/ })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Trace', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(panel.getByRole('button', { name: /Start trace|Iniciar traza/ })).toBeVisible();
});
