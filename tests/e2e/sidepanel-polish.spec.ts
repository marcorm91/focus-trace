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
  const workspace = panel.getByRole('navigation', { name: /FocusTrace sections|Secciones de FocusTrace/ });
  const workspaceButtons = workspace.getByRole('button');
  await expect(workspaceButtons).toHaveCount(4);
  const [workspaceBox, workspaceButtonBoxes] = await Promise.all([
    workspace.boundingBox(),
    workspaceButtons.evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().toJSON())),
  ]);
  if (!workspaceBox) throw new Error('Could not measure the workspace navigation.');
  expect(workspaceButtonBoxes.every((box) => Math.abs(box.width - workspaceButtonBoxes[0]!.width) < 1)).toBe(true);
  expect(workspaceButtonBoxes.at(-1)!.right).toBeGreaterThan(workspaceBox.x + workspaceBox.width - 12);

  const quickActions = panel.locator('.quick-actions > button, .quick-actions .site-audit-launch');
  expect(await quickActions.count()).toBeGreaterThanOrEqual(4);
  const restingQuickStyles = await quickActions.evaluateAll((buttons) => buttons.map((button) => {
    const style = getComputedStyle(button);
    return `${style.backgroundColor}|${style.color}|${style.borderColor}`;
  }));
  expect(new Set(restingQuickStyles).size).toBe(1);

  const firstQuickAction = quickActions.first();
  const restingBackground = await firstQuickAction.evaluate((button) => getComputedStyle(button).backgroundColor);
  const expectedHoverBackground = await panel.locator('.app-shell').evaluate((shell) => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'var(--ft-accent-soft)';
    shell.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
  await firstQuickAction.hover();
  await expect(firstQuickAction).toHaveCSS('background-color', expectedHoverBackground);
  expect(expectedHoverBackground).not.toBe(restingBackground);
  await settings.hover();
  await expect(settings).toHaveCSS('background-color', expectedHoverBackground);
  await settings.click();
  await expect(settings).toHaveAttribute('aria-pressed', 'true');
  await panel.mouse.move(0, 0);
  await expect(settings).toHaveCSS('background-color', restingBackground);
  await panel.getByRole('button', { name: /Back|Volver/ }).click();

  await workspace.getByRole('button', { name: 'Trace' }).click();
  const traceControls = panel.locator('.trace-hero-actions .trace-record, .trace-hero-actions .trace-reset');
  expect(await traceControls.count()).toBeGreaterThanOrEqual(2);
  const traceStyles = await traceControls.evaluateAll((buttons) => buttons.map((button) => {
    const style = getComputedStyle(button);
    return `${style.backgroundColor}|${style.borderColor}`;
  }));
  expect(new Set(traceStyles).size).toBe(1);

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

  await workspace.getByRole('button', { name: /Review|Revisión/ }).click();

  const scanTabs = panel.locator('.scan-filter-tabs');
  await expect(scanTabs.getByRole('tab', { name: /Failures|Fallos/ })).toBeEnabled();
  await expect(scanTabs.getByRole('tab', { name: /Review|Revisión/ })).toBeDisabled();
  await expect(scanTabs.getByRole('tab', { name: /Warnings|Avisos/ })).toBeDisabled();
  const scanFinding = panel.locator('.scan-rule-group').first();
  await expect(scanFinding).not.toHaveAttribute('open', '');
  await expect(scanFinding.locator('.severity-badge')).toBeVisible();
  await expect(scanFinding.locator('.scan-rule-outcome')).toHaveCount(0);

  await workspace.getByRole('button', { name: /Report|Informe/ }).click();

  const scorelineStyles = await panel.locator('.report-scoreline > div').evaluateAll((metrics) => metrics.map((metric) => {
    const style = getComputedStyle(metric);
    return `${style.borderTopWidth}|${style.borderRadius}|${style.backgroundColor}|${style.boxShadow}`;
  }));
  expect(scorelineStyles).toHaveLength(4);
  expect(new Set(scorelineStyles).size).toBe(1);
  expect(scorelineStyles[0]).toContain('0px|0px|rgba(0, 0, 0, 0)|none');

  const reportTabs = panel.locator('.report-compact-tabs');
  await expect(reportTabs.getByRole('tab', { name: /Failures|Fallos/ })).toBeEnabled();
  await expect(reportTabs.getByRole('tab', { name: /Review|Revisión/ })).toBeDisabled();
  await expect(reportTabs.getByRole('tab', { name: /Warnings|Avisos/ })).toBeDisabled();
  const reportFinding = panel.locator('.report-rule-group').first();
  await expect(reportFinding).not.toHaveAttribute('open', '');
  await expect(reportFinding.locator('.severity-badge')).toBeVisible();
  await expect(reportFinding.locator('.report-rule-outcome')).toHaveCount(0);

  const reportTabsBefore = await reportTabs.boundingBox();
  if (!reportTabsBefore) throw new Error('Could not measure the report content before opening export formats.');
  const moreFormats = panel.locator('.report-more-formats');
  await moreFormats.locator('summary').click();
  const formatOptions = moreFormats.locator('.report-format-options');
  await expect(formatOptions).toBeVisible();
  await expect(formatOptions).toHaveCSS('position', 'absolute');
  const reportTabsAfter = await reportTabs.boundingBox();
  if (!reportTabsAfter) throw new Error('Could not measure the report content after opening export formats.');
  expect(Math.abs(reportTabsAfter.y - reportTabsBefore.y)).toBeLessThan(1);
});
