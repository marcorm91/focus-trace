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
          { id: 'h-first', level: 2, text: 'First section', selector: '#first-section', signals: [] },
          { id: 'h-first-detail', level: 3, text: 'Long detail heading that must stay fully readable without an ellipsis', selector: '#first-detail', signals: [] },
          { id: 'h-second', level: 2, text: 'Second section', selector: '#second-section', signals: [] },
          { id: 'h-second-detail', level: 3, text: 'Second section detail', selector: '#second-detail', signals: [] },
        ],
        passes: 5,
        rulesRun: 1,
      },
    });
  });

  await panel.getByRole('button', { name: /Structure|Estructura/ }).click();
  await expect(panel.getByRole('alert')).toHaveCount(0);
  await panel.getByRole('tab', { name: /Headings|Encabezados/ }).click();

  const firstDetail = panel.getByRole('button', { name: 'Long detail heading that must stay fully readable without an ellipsis', exact: true });
  const firstSection = panel.getByRole('button', { name: 'First section', exact: true });
  const secondSection = panel.getByRole('button', { name: 'Second section', exact: true });
  const secondDetail = panel.getByRole('button', { name: 'Second section detail', exact: true });

  await expect(panel.getByRole('button', { name: 'Main heading', exact: true })).toBeVisible();
  await expect(firstSection).toBeVisible();
  await expect(secondSection).toBeVisible();
  await expect(firstDetail).toBeVisible();
  await expect(secondDetail).toBeVisible();
  await expect(panel.locator('.heading-tree-row').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(panel.getByRole('button', { name: /Collapse heading branch: Main heading|Contraer rama de encabezado: Main heading/ })).toHaveAttribute('aria-expanded', 'true');

  await panel.getByRole('button', { name: /Collapse heading branch: First section|Contraer rama de encabezado: First section/ }).click();
  await expect(firstDetail).toHaveCount(0);
  await expect(secondDetail).toBeVisible();

  await panel.getByRole('button', { name: /Expand heading branch: First section|Expandir rama de encabezado: First section/ }).click();
  await expect(firstDetail).toBeVisible();

  await panel.getByRole('button', { name: /Collapse all|Contraer todo/ }).click();
  await expect(firstSection).toHaveCount(0);
  await expect(secondSection).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Main heading', exact: true })).toBeVisible();

  await panel.getByRole('button', { name: /Expand all|Expandir todo/ }).click();
  await expect(firstSection).toBeVisible();
  await expect(secondSection).toBeVisible();
  await expect(secondDetail).toBeVisible();
  await expect(firstDetail).toBeVisible();
});

test('six-level heading outline stays responsive across repeated expansion at sidebar widths', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  await panel.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('Could not resolve the sidepanel test tab.');
    await chrome.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN', tabId: tab.id,
      scan: {
        engine: 'FocusTrace Rules', standard: 'WCAG 2.2',
        url: 'https://example.test/deep-headings', title: 'Six-level outline',
        scannedAt: Date.now(), scope: { type: 'page' },
        issues: [], review: [], warnings: [], passes: 0, rulesRun: 0,
        headings: [1, 2, 3, 4, 5, 6].map((level) => ({
          id: `h${level}`, level,
          text: `Heading ${level}: long text that must wrap inside a narrow sidebar without truncation`,
          selector: `#h${level}`, signals: [],
        })),
      },
    });
  });
  await panel.getByRole('button', { name: /Structure|Estructura/ }).click();
  const tree = panel.getByRole('tree');
  await expect(tree.getByRole('treeitem')).toHaveCount(6);

  for (const width of [320, 600]) {
    await panel.setViewportSize({ width, height: 900 });
    // Exercise the actual browser layout, not only React's DOM updates.
    for (let cycle = 0; cycle < 10; cycle++) {
      await panel.getByRole('button', { name: /Collapse all|Contraer todo/ }).click();
      await expect(tree.getByRole('treeitem')).toHaveCount(1);
      await panel.getByRole('button', { name: /Expand all|Expandir todo/ }).click();
      await expect(tree.getByRole('treeitem')).toHaveCount(6);
      const rows = await tree.locator('.heading-tree-row').evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, height: rect.height };
        }),
      );
      expect(rows.every((row) => row.height > 0 && row.left >= 0 && row.right <= width)).toBe(true);
    }
  }
  await expect(panel.getByRole('alert')).toHaveCount(0);
});
