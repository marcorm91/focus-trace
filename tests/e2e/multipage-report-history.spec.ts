import type { BrowserContext, Worker } from '@playwright/test';
import { expect, test } from './support/extension';

declare const chrome: {
  tabs: {
    query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number }>>;
  };
  runtime: {
    sendMessage(message: unknown): Promise<unknown>;
  };
  storage: {
    local: {
      set(items: Record<string, unknown>): Promise<void>;
    };
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

function scan(url: string, title: string, scannedAt: number, target: string) {
  return {
    engine: 'FocusTrace Rules',
    standard: 'WCAG 2.2',
    url,
    title,
    scannedAt,
    scope: { type: 'page' as const },
    issues: [{
      id: `issue-${scannedAt}`,
      ruleId: 'FT-WCAG-003',
      title: 'Button has no accessible name',
      description: 'Provide an accessible name.',
      severity: 'serious' as const,
      outcome: 'fail' as const,
      targets: [target],
      references: [],
    }],
    review: [],
    warnings: [],
    headings: [{
      id: `heading-${scannedAt}`,
      level: 2,
      text: `${title} heading`,
      selector: 'h2',
      signals: ['level-jump' as const],
    }],
    passes: 1,
    rulesRun: 2,
  };
}

test('historical audit reports stay static, single-open and separate from live page actions', async ({ context, extensionWorker }) => {
  const panel = await openSidepanel(context, extensionWorker);
  const historyScan = scan('https://example.test/history', 'Historical page', 100, '#history-target');
  const currentScan = scan('https://example.test/current', 'Current page', 200, '#current-target');

  await panel.evaluate(async ({ historical, current }) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('Could not resolve the sidepanel test tab.');

    await chrome.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId: tab.id,
      scan: current,
    });

    await chrome.storage.local.set({
      'focustrace:multipage-audits:v1': {
        version: 1,
        activeAuditId: 'audit-e2e',
        audits: [{
          id: 'audit-e2e',
          name: 'example.test',
          createdAt: 100,
          updatedAt: 200,
          sites: ['example.test'],
          pages: [
            {
              key: 'https://example.test/history',
              url: 'https://example.test/history',
              title: 'Historical page',
              reviewedAt: 100,
              scan: historical,
            },
            {
              key: 'https://example.test/current',
              url: 'https://example.test/current',
              title: 'Current page',
              reviewedAt: 200,
              scan: current,
            },
          ],
        }],
      },
    });
  }, { historical: historyScan, current: currentScan });

  await panel.getByRole('button', { name: /Report|Informe/ }).click();
  const reports = panel.locator('.audit-page-report');
  await expect(reports).toHaveCount(2);

  const historical = reports.nth(0);
  const current = reports.nth(1);
  await historical.locator(':scope > summary').click();
  await expect(historical).toHaveAttribute('open', '');
  await expect(panel.locator('.audit-page-report[open]')).toHaveCount(1);
  await expect(historical.getByText(/Saved static review|Revisión estática guardada/)).toBeVisible();
  await expect(historical.getByRole('button', { name: /Export PDF|Exportar PDF/ })).toBeVisible();
  await expect(historical.getByRole('button', { name: /Delete saved report|Eliminar informe guardado/ })).toBeVisible();

  const historicalScanSection = historical.locator('.report-accordion-section').filter({ hasText: /Full page scan|Barrido completo de página/ });
  await historicalScanSection.locator(':scope > summary').click();
  await expect(historicalScanSection).toHaveAttribute('open', '');
  const historicalRule = historical.locator('.report-rule-group').first();
  await historicalRule.locator(':scope > summary').click();
  await expect(historical.getByRole('button', { name: /Review on page|Revisar en la página/ })).toHaveCount(0);
  await expect(historical.getByText(/Historical Trace unavailable|Trace histórico no disponible/)).toBeAttached();

  await current.locator(':scope > summary').click();
  await expect(current).toHaveAttribute('open', '');
  await expect(current).toHaveClass(/is-current/);
  await expect(historical).not.toHaveAttribute('open', '');
  await expect(panel.locator('.audit-page-report[open]')).toHaveCount(1);

  const currentScanSection = current.locator('.report-accordion-section').filter({ hasText: /Full page scan|Barrido completo de página/ });
  await currentScanSection.locator(':scope > summary').click();
  const currentRule = current.locator('.report-rule-group').first();
  await currentRule.locator(':scope > summary').click();
  await expect(current.getByRole('button', { name: /Review on page|Revisar en la página/ })).toBeVisible();

  const ids = await current.locator('.audit-page-report-body').evaluate((root) =>
    [...root.querySelectorAll('[id]')].map((element) => element.id).filter(Boolean),
  );
  expect(new Set(ids).size).toBe(ids.length);

  panel.once('dialog', (dialog) => dialog.accept());
  await current.getByRole('button', { name: /Delete saved report|Eliminar informe guardado/ }).click();
  await expect(reports).toHaveCount(1);
});
