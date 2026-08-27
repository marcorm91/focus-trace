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

test('sidepanel controls and finding surfaces expose their intended behavior', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);

  const settings = panel.locator('.settings-trigger');
  await expect(settings).toHaveAttribute('title', /Settings|Ajustes/);
  await expect(settings).toHaveAttribute('aria-label', /Open settings|Abrir ajustes/);

  await panel.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('Could not resolve the sidepanel test tab.');
    await chrome.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId: tab.id,
      scan: {
        engine: 'FocusTrace Rules',
        standard: 'WCAG 2.2',
        url: 'https://example.test/polish',
        title: 'Sidepanel polish fixture',
        scannedAt: Date.now(),
        issues: [{
          id: 'polish-fixture-1',
          ruleId: 'FT-WCAG-003',
          title: 'Button has no accessible name',
          description: 'The button needs an accessible name.',
          severity: 'critical',
          outcome: 'fail',
          targets: ['#missing-name'],
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
        headings: [],
        passes: 1,
        rulesRun: 1,
      },
    });
  });

  const workspace = panel.getByRole('navigation', { name: /FocusTrace sections|Secciones de FocusTrace/ });
  await workspace.getByRole('button', { name: /Review|Revisión/ }).click();

  const scanTabs = panel.locator('.scan-filter-tabs');
  await expect(scanTabs.getByRole('tab', { name: /Failures|Fallos/ })).toBeEnabled();
  await expect(scanTabs.getByRole('tab', { name: /Review|Revisión/ })).toBeDisabled();
  await expect(scanTabs.getByRole('tab', { name: /Warnings|Avisos/ })).toBeDisabled();
  await expect(panel.locator('.scan-rule-group').first()).not.toHaveAttribute('open', '');

  await workspace.getByRole('button', { name: /Report|Informe/ }).click();

  const reportTabs = panel.locator('.report-compact-tabs');
  await expect(reportTabs.getByRole('tab', { name: /Failures|Fallos/ })).toBeEnabled();
  await expect(reportTabs.getByRole('tab', { name: /Review|Revisión/ })).toBeDisabled();
  await expect(reportTabs.getByRole('tab', { name: /Warnings|Avisos/ })).toBeDisabled();
  await expect(panel.locator('.report-rule-group').first()).not.toHaveAttribute('open', '');
});
