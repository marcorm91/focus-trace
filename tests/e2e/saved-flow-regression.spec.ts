import type { BrowserContext, Worker } from '@playwright/test';
import { executeSavedFlowActionInPage } from '../../lib/runtime/saved-flow-page';
import type { SavedFlowActionStep } from '../../lib/runtime/saved-flow';
import { expect, test } from './support/extension';

async function openSidepanel(context: BrowserContext, extensionWorker: Worker) {
  const extensionId = new URL(extensionWorker.url()).hostname;
  if (!extensionId) throw new Error('Could not resolve the FocusTrace extension ID from its service worker.');
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByRole('heading', { level: 1, name: 'FocusTrace' })).toBeVisible();
  return panel;
}

test('saved replay never auto-runs a manual click action in a real browser', async ({ page }) => {
  await page.setContent(`
    <button id="danger" type="button">Delete account</button>
    <output id="result">not-clicked</output>
    <script>
      document.querySelector('#danger').addEventListener('click', () => {
        document.querySelector('#result').textContent = 'clicked';
      });
    </script>
  `);

  const step: SavedFlowActionStep = {
    id: 'manual-click',
    type: 'action',
    sourceEventKind: 'click',
    policy: 'manual-stop',
    target: { locator: '#danger', tag: 'button', id: 'danger' },
  };

  const result = await page.evaluate(executeSavedFlowActionInPage, step);
  expect(result.status).toBe('blocked');
  await expect(page.locator('#result')).toHaveText('not-clicked');
});

test('saved flows remain available in Replay with an empty current Trace and can be deleted locally', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);

  await panel.evaluate(async () => {
    const chromeApi = (globalThis as any).chrome;
    await chromeApi.storage.local.set({
      'focustrace.savedFlows.v1': {
        version: 1,
        flows: [{
          version: 1,
          id: 'flow-browser-test',
          name: 'Manual checkout regression',
          createdAt: 100,
          updatedAt: 100,
          sourceRoute: 'https://example.test/checkout?[redacted]',
          steps: [{
            id: 'manual-click',
            type: 'action',
            sourceEventKind: 'click',
            policy: 'manual-stop',
            target: { locator: '#submit', tag: 'button', id: 'submit' },
          }],
          baselineFindings: [],
        }],
      },
    });
  });

  await panel.getByRole('button', { name: 'Trace', exact: true }).click();
  await panel.getByRole('tab', { name: /Replay/ }).click();
  await expect(panel.getByRole('heading', { level: 3, name: /Saved user flows|Flujos de usuario guardados/ })).toBeVisible();
  await expect(panel.getByLabel(/Saved scenario|Escenario guardado/)).toHaveValue('flow-browser-test');
  await expect(panel.getByRole('option', { name: 'Manual checkout regression' })).toHaveAttribute('value', 'flow-browser-test');

  await panel.getByRole('button', { name: /Delete flow|Eliminar flujo/ }).click();
  await expect(panel.getByText(/No saved flows yet|Todavía no hay flujos guardados/)).toBeVisible();

  const stored = await panel.evaluate(async () => {
    const chromeApi = (globalThis as any).chrome;
    return chromeApi.storage.local.get('focustrace.savedFlows.v1');
  });
  expect(stored).not.toHaveProperty('focustrace.savedFlows.v1');
});
