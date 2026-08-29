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

test('records runtime ARIA findings from real widget interactions', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/runtime-aria.html`);
  await expect(page.getByRole('heading', { name: 'Runtime ARIA widgets' })).toBeVisible();
  const tabId = await startRecording(extensionWorker, page);

  await page.getByRole('button', { name: 'Filters' }).click();
  let session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-RUNTIME-ARIA-001'),
  );
  expect(session.events.some((event) => event.kind === 'aria-widget' && event.outcome === 'warning')).toBe(true);

  await page.getByRole('tab', { name: 'Account' }).click();
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-004'),
  );
  expect(session.events.some((event) => event.ruleId === 'FT-APG-004' && event.outcome === 'review')).toBe(true);

  const menuTrigger = page.getByRole('button', { name: 'Actions' });
  await menuTrigger.focus();
  await page.keyboard.press('ArrowDown');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-005'),
  );

  const menuFinding = session.events.find((event) => event.ruleId === 'FT-APG-005');
  expect(menuFinding).toMatchObject({
    kind: 'aria-widget',
    outcome: 'review',
    element: { selector: '#menu-trigger' },
  });

  const combobox = page.getByRole('combobox', { name: 'City' });
  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) =>
      state.events.some((event) => event.ruleId === 'FT-RUNTIME-ARIA-004')
      && state.events.some((event) => event.ruleId === 'FT-RUNTIME-ARIA-005'),
  );

  const popupRoleFinding = session.events.find((event) => event.ruleId === 'FT-RUNTIME-ARIA-004');
  const activeDescendantFinding = session.events.find((event) => event.ruleId === 'FT-RUNTIME-ARIA-005');
  expect(popupRoleFinding).toMatchObject({
    kind: 'aria-widget',
    outcome: 'warning',
    element: { selector: '#city-combobox' },
  });
  expect(activeDescendantFinding).toMatchObject({
    kind: 'aria-widget',
    outcome: 'warning',
    element: { selector: '#city-combobox' },
  });
  expect(activeDescendantFinding?.interactionId).toBe(popupRoleFinding?.interactionId);

  await page.keyboard.press('Escape');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-009'),
  );
  expect(session.events.some((event) => event.ruleId === 'FT-APG-008')).toBe(false);

  const listbox = page.getByRole('listbox', { name: 'Priority' });
  await listbox.focus();
  await page.keyboard.press('ArrowDown');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-010'),
  );
  expect(session.events.find((event) => event.ruleId === 'FT-APG-010')).toMatchObject({
    kind: 'aria-widget',
    outcome: 'review',
    element: { selector: '#priority-listbox' },
  });

  expect(session.recording).toBe(true);
});
