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

  await extensionWorker.evaluate(async (id) => {
    const chromeApi = (globalThis as any).chrome;
    await chromeApi.scripting.executeScript({
      target: { tabId: id },
      func: () => {
        const chromeApiInPage = (globalThis as any).chrome;
        const owner = document.querySelector('#virtual-tree');
        if (!(owner instanceof HTMLElement)) return;

        document.addEventListener('keydown', (event) => {
          if (event.key !== 'ArrowDown' || event.target !== owner) return;
          owner.dataset.ftKeyTargetStrict = String(event.target === document.activeElement);
        }, { capture: true, once: true });

        const observer = new MutationObserver((mutations) => {
          const mutation = mutations.find((candidate) => candidate.attributeName === 'aria-activedescendant');
          if (!mutation || !(mutation.target instanceof Element)) return;
          const active = document.activeElement;
          const activeId = mutation.target.getAttribute('aria-activedescendant');
          const virtual = activeId ? document.getElementById(activeId) : null;
          owner.dataset.ftMutationTargetStrict = String(active === mutation.target);
          owner.dataset.ftMutationTargetSameNode = String(
            active instanceof Element && active.isSameNode(mutation.target),
          );
          owner.dataset.ftVirtualExists = String(virtual instanceof Element);
          owner.dataset.ftOwnerContainsVirtual = String(
            virtual instanceof Element && mutation.target.contains(virtual),
          );
          owner.dataset.ftVirtualConnected = String(virtual?.isConnected === true);
          owner.dataset.ftVirtualDisplay = virtual ? getComputedStyle(virtual).display : 'missing';
          owner.dataset.ftVirtualVisibility = virtual ? getComputedStyle(virtual).visibility : 'missing';

          void chromeApiInPage.runtime.sendMessage({
            type: 'FOCUSTRACE_EVENT',
            event: {
              id: `diagnostic-${Date.now()}`,
              timestamp: Date.now(),
              kind: 'virtual-focus',
              severity: 'info',
              title: 'Diagnostic virtual focus transport',
              element: {
                tag: 'div',
                role: 'treeitem',
                selector: '#diagnostic-virtual-focus',
                name: 'Diagnostic',
              },
            },
          });
          observer.disconnect();
        });
        observer.observe(owner, {
          attributes: true,
          attributeOldValue: true,
          attributeFilter: ['aria-activedescendant'],
        });
      },
    });
  }, tabId);

  const virtualTree = page.getByRole('tree', { name: 'Files', exact: true });
  await virtualTree.focus();
  await expect(virtualTree).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(virtualTree).toBeFocused();
  await expect(virtualTree).toHaveAttribute('aria-activedescendant', 'virtual-two');
  await expect(virtualTree).toHaveAttribute('data-ft-key-target-strict', 'true');
  await expect(virtualTree).toHaveAttribute('data-ft-mutation-target-strict', 'true');
  await expect(virtualTree).toHaveAttribute('data-ft-mutation-target-same-node', 'true');
  await expect(virtualTree).toHaveAttribute('data-ft-virtual-exists', 'true');
  await expect(virtualTree).toHaveAttribute('data-ft-owner-contains-virtual', 'true');
  await expect(virtualTree).toHaveAttribute('data-ft-virtual-connected', 'true');
  await expect(virtualTree).toHaveAttribute('data-ft-virtual-display', 'block');
  await expect(virtualTree).toHaveAttribute('data-ft-virtual-visibility', 'visible');

  await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.element?.selector === '#diagnostic-virtual-focus'),
  );

  let session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.kind === 'virtual-focus' && event.element?.selector === '#virtual-two'),
  );

  const virtualFocus = session.events.find((event) => event.kind === 'virtual-focus' && event.element?.selector === '#virtual-two');
  expect(virtualFocus).toMatchObject({
    severity: 'info',
    element: { role: 'treeitem', selector: '#virtual-two' },
  });
  expect(virtualFocus?.outcome).toBeUndefined();
  expect(virtualFocus?.ruleId).toBeUndefined();

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
