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

test('heading branches start expanded and can be collapsed independently', async ({ context, extensionWorker }) => {
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
        url: 'https://example.test/headings',
        title: 'Heading tree fixture',
        scannedAt: Date.now(),
        scope: { type: 'page' },
        issues: [],
        review: [],
        warnings: [],
        headings: [
          { id: 'h-main', level: 1, text: 'Main heading', selector: '#main-heading', signals: [] },
          { id: 'h-section', level: 2, text: 'First section', selector: '#first-section', signals: [] },
          { id: 'h-detail', level: 3, text: 'Long detail heading that must stay fully readable without an ellipsis', selector: '#detail-heading', signals: [] },
          { id: 'h-second', level: 2, text: 'Second section', selector: '#second-section', signals: [] },
          { id: 'h-other', level: 1, text: 'Other root', selector: '#other-root', signals: ['multiple-h1'] },
        ],
        passes: 5,
        rulesRun: 1,
      },
    });
  });

  await panel.getByRole('button', { name: /Headings|Encabezados/ }).click();

  const childHeading = panel.getByRole('button', { name: 'First section', exact: true });
  const otherRoot = panel.getByRole('button', { name: 'Other root', exact: true });
  await expect(childHeading).toBeVisible();
  await expect(otherRoot).toBeVisible();

  const mainToggle = panel.getByRole('button', { name: /Collapse heading branch: Main heading|Contraer rama de encabezado: Main heading/ });
  await expect(mainToggle).toHaveAttribute('aria-expanded', 'true');
  await mainToggle.click();

  await expect(panel.getByRole('button', { name: 'First section', exact: true })).toHaveCount(0);
  await expect(otherRoot).toBeVisible();
  await expect(panel.getByRole('button', { name: /Expand heading branch: Main heading|Expandir rama de encabezado: Main heading/ })).toHaveAttribute('aria-expanded', 'false');

  await panel.getByRole('button', { name: /Expand heading branch: Main heading|Expandir rama de encabezado: Main heading/ }).click();
  await expect(panel.getByRole('button', { name: 'First section', exact: true })).toBeVisible();
  await expect(panel.getByText('Long detail heading that must stay fully readable without an ellipsis', { exact: true })).toBeVisible();

  await panel.getByRole('button', { name: /Collapse all|Contraer todo/ }).click();
  await expect(panel.getByRole('button', { name: 'First section', exact: true })).toHaveCount(0);
  await expect(otherRoot).toBeVisible();

  await panel.getByRole('button', { name: /Expand all|Expandir todo/ }).click();
  await expect(panel.getByRole('button', { name: 'First section', exact: true })).toBeVisible();
  await expect(panel.getByText('Long detail heading that must stay fully readable without an ellipsis', { exact: true })).toBeVisible();
});
