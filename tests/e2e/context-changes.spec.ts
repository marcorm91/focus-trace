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

test('reviews an SPA route change initiated when a control receives focus', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/context-changes.html`);
  await expect(page.getByRole('heading', { name: 'Context change runtime' })).toBeVisible();
  const tabId = await startRecording(extensionWorker, page);

  await page.getByRole('button', { name: 'Before focus target' }).focus();
  await page.keyboard.press('Tab');

  const session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-RUNTIME-008'),
  );

  const finding = session.events.find((event) => event.ruleId === 'FT-RUNTIME-008');
  expect(finding).toMatchObject({
    kind: 'context-change',
    outcome: 'review',
    severity: 'moderate',
    element: { selector: '#focus-route' },
    contextChange: {
      triggerKind: 'focus',
      changeKind: 'route',
    },
  });
  expect(finding?.toUrl).toContain('#focus-context');
  expect(session.events.some((event) =>
    event.kind === 'keydown' && event.interactionId === finding?.interactionId,
  )).toBe(true);
});

test('reviews a trusted select setting change followed by SPA navigation', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/context-changes.html`);
  const tabId = await startRecording(extensionWorker, page);
  const select = page.getByLabel('Input route');

  await select.focus();
  await select.press('ArrowDown');

  const session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-RUNTIME-009'),
  );

  const finding = session.events.find((event) => event.ruleId === 'FT-RUNTIME-009');
  expect(finding).toMatchObject({
    kind: 'context-change',
    outcome: 'review',
    severity: 'moderate',
    element: { selector: '#input-route' },
    contextChange: {
      triggerKind: 'input',
      changeKind: 'route',
    },
  });
  expect(finding?.toUrl).toContain('#input-context');
  expect(session.events.some((event) =>
    event.kind === 'input-change'
      && event.element?.selector === '#input-route'
      && event.interactionId === finding?.interactionId,
  )).toBe(true);
});

test('reviews a trusted text input that programmatically moves focus without retaining typed content', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/context-changes.html`);
  const tabId = await startRecording(extensionWorker, page);
  const input = page.getByLabel('Input focus');

  await input.focus();
  await input.press('x');

  const session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-RUNTIME-009'),
  );

  const finding = session.events.find((event) => event.ruleId === 'FT-RUNTIME-009');
  expect(finding).toMatchObject({
    element: { selector: '#input-focus' },
    contextChange: {
      triggerKind: 'input',
      changeKind: 'focus-move',
      inputEventType: 'input',
      destination: { selector: '#results-heading' },
    },
  });

  const serializedEvidence = JSON.stringify(
    session.events.filter((event) =>
      event.ruleId === 'FT-RUNTIME-009' || event.kind === 'input-change',
    ),
  );
  expect(serializedEvidence).not.toContain('"x"');
});

test('does not flag explicit activation or an inline setting update as a context-change review', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/context-changes.html`);
  const tabId = await startRecording(extensionWorker, page);

  await page.getByRole('button', { name: 'Explicit navigation' }).click();
  await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) =>
      event.kind === 'route' && event.toUrl?.includes('#explicit-context'),
    ),
  );

  const safeSelect = page.getByLabel('Safe inline update');
  await safeSelect.focus();
  await safeSelect.press('ArrowDown');
  await expect(page.locator('#safe-output')).toContainText('beta selected');

  const session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) =>
      event.kind === 'input-change' && event.element?.selector === '#safe-select',
    ),
  );

  expect(session.events.filter((event) =>
    event.ruleId === 'FT-RUNTIME-008' || event.ruleId === 'FT-RUNTIME-009',
  )).toHaveLength(0);
  expect(session.recording).toBe(true);
});
