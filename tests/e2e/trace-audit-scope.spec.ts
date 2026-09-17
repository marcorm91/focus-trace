import { expect, test } from './support/extension';
import { startFixtureServer, type FixtureServer } from './support/fixture-server';

let fixtures: FixtureServer;
test.beforeAll(async () => { fixtures = await startFixtureServer(); });
test.afterAll(async () => { await fixtures.close(); });

for (const decision of ['add', 'new'] as const) {
  test(`Trace scope: cancel then ${decision}, wider dialog and no fabricated scan`, async ({ context, extensionWorker }) => {
    const inspected = await context.newPage();
    await inspected.goto(`${fixtures.origin}/scan-targets.html`);
    const tabId = await extensionWorker.evaluate(async (url) => {
      const api = (globalThis as any).chrome;
      const tabs = await api.tabs.query({});
      await api.storage.local.set({
        'focustrace:multipage-audits:v1': {
          version: 1, activeAuditId: 'previous', audits: [{
            id: 'previous', name: 'previous.test', sites: ['previous.test', 'second.test'],
            pages: [], createdAt: 1, updatedAt: 1,
          }],
        },
      });
      return tabs.find((tab: any) => tab.url === url).id as number;
    }, inspected.url());
    const panel = await context.newPage();
    await panel.setViewportSize({ width: 900, height: 800 });
    await panel.goto(`chrome-extension://${new URL(extensionWorker.url()).hostname}/sidepanel.html?focustraceTabId=${tabId}`);
    await panel.getByRole('button', { name: 'Trace', exact: true }).click();
    const start = panel.locator('.trace-record.start');
    const dialog = panel.locator('.audit-scope-dialog');
    await start.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.audit-scope-context dd').first()).toHaveText('previous.test · second.test');
    await expect(dialog).toHaveCSS('width', '720px');
    await panel.setViewportSize({ width: 464, height: 800 });
    await expect(dialog).toHaveCSS('width', '440px');
    await expect(dialog.locator('#audit-scope-description')).toContainText(/Trace/);
    await dialog.getByRole('button', { name: /Cancel|Cancelar/, exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(start).toBeEnabled();
    // A choice for an old URL must not start recording on a newly navigated page.
    await start.click();
    await expect(dialog).toBeVisible();
    await inspected.goto(`${fixtures.origin}/component-scan.html`);
    await dialog.getByRole('button', { name: /Add to current audit|Añadir a la auditoría actual/ }).click();
    await expect(start).toBeEnabled();
    await expect(panel.locator('.trace-record.stop')).toHaveCount(0);
    await start.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: decision === 'add'
      ? /Add to current audit|Añadir a la auditoría actual/
      : /Start new audit|Empezar una nueva auditoría/ }).click();
    await expect(panel.locator('.trace-record.stop')).toBeVisible();
    const store = await extensionWorker.evaluate(async () => {
      const api = (globalThis as any).chrome;
      return (await api.storage.local.get('focustrace:multipage-audits:v1'))['focustrace:multipage-audits:v1'];
    });
    const active = store.audits.find((audit: any) => audit.id === store.activeAuditId);
    expect(active.sites).toContain('127.0.0.1');
    expect(active.pages).toEqual([]);
    expect(store.audits).toHaveLength(decision === 'add' ? 1 : 2);
    await panel.locator('.trace-record.stop').click();
    await expect(start).toBeVisible();
    await start.click();
    await expect(panel.locator('.trace-record.stop')).toBeVisible();
    await expect(dialog).not.toBeVisible();
  });
}
