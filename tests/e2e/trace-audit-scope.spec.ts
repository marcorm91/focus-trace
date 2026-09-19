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
    const alignment = await dialog.evaluate((element) => {
      const copy = element.querySelector('.trace-reset-dialog-copy')!.getBoundingClientRect();
      const context = element.querySelector('.audit-scope-context')!.getBoundingClientRect();
      const term = element.querySelector('.audit-scope-context dt')!.getBoundingClientRect();
      const description = element.querySelector('.audit-scope-context dd')!.getBoundingClientRect();
      return {
        copyLeft: copy.left + Number.parseFloat(getComputedStyle(element.querySelector('.trace-reset-dialog-copy')!).paddingLeft),
        contextLeft: context.left,
        fieldGap: description.left - term.right,
      };
    });
    expect(Math.abs(alignment.copyLeft - alignment.contextLeft)).toBeLessThan(1);
    expect(alignment.fieldGap).toBeLessThanOrEqual(14.5);
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

test('Trace pauses on document navigation, preserves evidence and revalidates the destination site', async ({ context, extensionWorker }) => {
  const inspected = await context.newPage();
  await inspected.goto(`${fixtures.origin}/scan-targets.html`);
  const tabId = await extensionWorker.evaluate(async (url) => {
    const api = (globalThis as any).chrome;
    const tabs = await api.tabs.query({});
    await api.storage.local.set({
      'focustrace:multipage-audits:v1': {
        version: 1, activeAuditId: 'current', audits: [{
          id: 'current', name: 'current audit', sites: ['127.0.0.1'],
          pages: [], createdAt: 1, updatedAt: 1,
        }],
      },
    });
    return tabs.find((tab: any) => tab.url === url).id as number;
  }, inspected.url());
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${new URL(extensionWorker.url()).hostname}/sidepanel.html?focustraceTabId=${tabId}`);
  await panel.getByRole('button', { name: 'Trace', exact: true }).click();
  await panel.locator('.trace-record.start').click();
  await expect(panel.locator('.trace-record.stop')).toBeVisible();

  await inspected.keyboard.press('Tab');
  await inspected.goto(`${fixtures.origin}/component-scan.html`);

  const pause = panel.locator('.trace-navigation-pause');
  await expect(pause).toBeVisible();
  await expect(pause).toContainText(/preserved|conservado/);
  const resume = panel.locator('.trace-record.start');
  await expect(resume).toContainText(/Resume|Reanudar/);
  const pausedSession = await extensionWorker.evaluate(async (id) => {
    const api = (globalThis as any).chrome;
    return (await api.storage.session.get(`session:${id}`))[`session:${id}`];
  }, tabId);
  expect(pausedSession.recording).toBe(false);
  expect(pausedSession.events.some((event: any) => event.kind === 'route'
    && event.fromUrl.includes('/scan-targets.html')
    && event.toUrl.includes('/component-scan.html'))).toBe(true);

  await resume.click();
  await expect(panel.locator('.trace-record.stop')).toBeVisible();
  await expect(panel.locator('.audit-scope-dialog')).not.toBeVisible();

  const otherSiteUrl = `${fixtures.origin.replace('127.0.0.1', 'localhost')}/scan-targets.html`;
  await inspected.goto(otherSiteUrl);
  await expect(pause).toBeVisible();
  await resume.click();
  const dialog = panel.locator('.audit-scope-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.audit-scope-context dd').last()).toContainText('localhost');
  await dialog.getByRole('button', { name: /Add to current audit|Añadir a la auditoría actual/ }).click();
  await expect(panel.locator('.trace-record.stop')).toBeVisible();

  const resumedSession = await extensionWorker.evaluate(async (id) => {
    const api = (globalThis as any).chrome;
    return (await api.storage.session.get(`session:${id}`))[`session:${id}`];
  }, tabId);
  expect(resumedSession.pausedByNavigation).toBeUndefined();
  expect(resumedSession.events.length).toBeGreaterThanOrEqual(pausedSession.events.length + 1);
  expect(resumedSession.tracePageUrl).toContain('localhost');
});
