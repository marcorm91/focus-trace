import type { FixtureServer } from './support/fixture-server';
import { startFixtureServer } from './support/fixture-server';
import { expect, startRecording, test, waitForSession } from './support/extension';

let fixtures: FixtureServer;

test.beforeAll(async () => {
  fixtures = await startFixtureServer();
});

test.afterAll(async () => {
  await fixtures.close();
});

test('records composite widget reviews and virtual focus without inflating findings', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/runtime-composite.html`);
  await expect(page.getByRole('heading', { name: 'Runtime composite widgets' })).toBeVisible();
  const tabId = await startRecording(extensionWorker, page);

  const virtualTree = page.getByRole('tree', { name: 'Files', exact: true });
  await virtualTree.focus();
  await page.keyboard.press('ArrowDown');

  let session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.kind === 'virtual-focus' && event.element?.selector === '#virtual-two'),
  );

  const virtualFocus = session.events.find((event) => event.kind === 'virtual-focus' && event.element?.selector === '#virtual-two');
  const virtualKey = session.events.find((event) =>
    event.kind === 'keydown'
    && event.title === 'Key: ArrowDown'
    && event.element?.selector === '#virtual-tree');
  expect(virtualFocus).toMatchObject({
    severity: 'info',
    element: { role: 'treeitem', selector: '#virtual-two' },
  });
  expect(virtualFocus?.outcome).toBeUndefined();
  expect(virtualFocus?.ruleId).toBeUndefined();
  expect(virtualKey).toBeDefined();
  expect(virtualFocus?.interactionId).toBe(virtualKey?.interactionId);

  const dynamicVirtualTree = page.getByRole('tree', { name: 'Dynamic files' });
  await dynamicVirtualTree.focus();
  await page.keyboard.press('ArrowDown');

  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.kind === 'virtual-focus' && event.element?.selector === '#dynamic-two'),
  );

  const dynamicVirtualFocus = session.events.find((event) =>
    event.kind === 'virtual-focus' && event.element?.selector === '#dynamic-two');
  const dynamicVirtualKey = session.events.find((event) =>
    event.kind === 'keydown'
    && event.title === 'Key: ArrowDown'
    && event.element?.selector === '#dynamic-virtual-tree');
  expect(dynamicVirtualFocus).toMatchObject({
    severity: 'info',
    element: { role: 'treeitem', selector: '#dynamic-two' },
  });
  expect(dynamicVirtualKey).toBeDefined();
  expect(dynamicVirtualFocus?.interactionId).toBe(dynamicVirtualKey?.interactionId);

  const brokenParent = page.getByRole('treeitem', { name: /Parent/ });
  await brokenParent.focus();
  await page.keyboard.press('ArrowRight');

  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) =>
      state.events.some((event) => event.ruleId === 'FT-RUNTIME-ARIA-006')
      && state.events.some((event) => event.ruleId === 'FT-APG-011')
      && state.events.some((event) => event.ruleId === 'FT-APG-012'),
  );

  const treeState = session.events.find((event) => event.ruleId === 'FT-RUNTIME-ARIA-006');
  const roving = session.events.find((event) => event.ruleId === 'FT-APG-011');
  const treeNavigation = session.events.find((event) => event.ruleId === 'FT-APG-012');
  expect(treeState).toMatchObject({ kind: 'aria-widget', outcome: 'warning' });
  expect(roving).toMatchObject({ kind: 'aria-widget', outcome: 'review' });
  expect(treeNavigation).toMatchObject({ kind: 'aria-widget', outcome: 'review' });
  expect(treeState?.interactionId).toBe(roving?.interactionId);
  expect(treeNavigation?.interactionId).toBe(roving?.interactionId);

  const firstCell = page.getByRole('gridcell', { name: 'A1' });
  await firstCell.focus();
  await page.keyboard.press('ArrowRight');

  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-013'),
  );
  expect(session.events.find((event) => event.ruleId === 'FT-APG-013')).toMatchObject({
    kind: 'aria-widget',
    outcome: 'review',
    element: { selector: '#broken-grid' },
  });

  expect(session.recording).toBe(true);
});
