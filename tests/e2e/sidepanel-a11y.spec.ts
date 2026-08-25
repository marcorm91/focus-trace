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
  const settings = panel.getByRole('button', { name: /Open settings|Abrir ajustes/ });
  await expect(settings).toBeFocused();
  const focusStyle = await settings.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(focusStyle.width).toBeGreaterThanOrEqual(2);
  expect(focusStyle.style).not.toBe('none');

  await panel.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: /Analyze this page|Analizar esta página/ })).toBeFocused();
  await panel.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: /Walk with Tab|Recorrer con Tab/ })).toBeFocused();
  await panel.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: /Review|Revisión/ })).toBeFocused();
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
