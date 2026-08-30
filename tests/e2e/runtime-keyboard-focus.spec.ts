import type { FixtureServer } from './support/fixture-server';
import { startFixtureServer } from './support/fixture-server';
import { expect, readSession, startRecording, test, waitForSession } from './support/extension';

let fixtures: FixtureServer;

const NEW_RULE_IDS = [
  'FT-APG-015',
  'FT-APG-016',
  'FT-APG-017',
  'FT-APG-018',
  'FT-APG-019',
  'FT-APG-020',
  'FT-APG-021',
] as const;

test.beforeAll(async () => {
  fixtures = await startFixtureServer();
});

test.afterAll(async () => {
  await fixtures.close();
});

test('records broken keyboard/focus pattern transitions as Review in a real browser', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/runtime-keyboard-focus.html`);
  await expect(page.getByRole('heading', { name: 'Keyboard focus runtime fixture' })).toBeVisible();
  const tabId = await startRecording(extensionWorker, page);

  await page.locator('#broken-tab-a').focus();
  await page.keyboard.press('ArrowRight');
  let session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-015'),
  );
  expect(session.events.find((event) => event.ruleId === 'FT-APG-015')).toMatchObject({
    kind: 'aria-widget',
    outcome: 'review',
  });

  await page.locator('#broken-radio-a').focus();
  await page.keyboard.press('ArrowRight');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-016'),
  );

  await page.locator('#broken-tool-a').focus();
  await page.keyboard.press('ArrowRight');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-017'),
  );

  await page.locator('#broken-menu-a').focus();
  await page.keyboard.press('ArrowDown');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-018'),
  );

  await page.locator('#broken-listbox').focus();
  await page.keyboard.press('ArrowDown');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-019'),
  );

  await page.locator('#broken-menu-trigger').focus();
  await page.keyboard.press('Enter');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-005'),
  );
  expect(session.events.find((event) => event.ruleId === 'FT-APG-005')?.detail).toContain('did not become available');

  await page.locator('#broken-disclosure').focus();
  await page.keyboard.press('Enter');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-021'),
  );

  await page.locator('#broken-tree-b').focus();
  await page.keyboard.press('Home');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-012' && event.detail?.includes('Home')),
  );

  await page.locator('#broken-grid-b').focus();
  await page.keyboard.press('Home');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-013' && event.detail?.includes('grid navigation model')),
  );

  await page.locator('#broken-row-b').focus();
  await page.keyboard.press('End');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-013' && event.detail?.includes('treegrid navigation model')),
  );

  await page.evaluate(() => (window as any).openRuntimeDialog('broken'));
  await page.keyboard.press('Escape');
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => state.events.some((event) => event.ruleId === 'FT-APG-020'),
  );

  for (const ruleId of NEW_RULE_IDS) {
    expect(session.events.some((event) => event.ruleId === ruleId && event.outcome === 'review')).toBe(true);
  }
  expect(session.recording).toBe(true);
});

test('keeps valid keyboard/focus pattern journeys quiet', async ({ page, extensionWorker }) => {
  await page.goto(`${fixtures.origin}/runtime-keyboard-focus.html`);
  const tabId = await startRecording(extensionWorker, page);

  await page.locator('#valid-tab-a').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);

  await page.locator('#valid-radio-a').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);

  await page.locator('#valid-tool-a').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);

  await page.locator('#valid-menu-trigger').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);

  await page.locator('#valid-listbox').focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);

  await page.locator('#valid-disclosure').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  await page.locator('#valid-tree-b').focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(400);

  await page.locator('#valid-grid-b').focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(400);

  await page.evaluate(() => (window as any).openRuntimeDialog('valid'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);

  const session = await readSession(extensionWorker, tabId);
  const forbidden = new Set<string>([...NEW_RULE_IDS, 'FT-APG-005', 'FT-APG-012', 'FT-APG-013']);
  const findings = session.events.filter((event) => event.ruleId && forbidden.has(event.ruleId));
  expect(findings).toEqual([]);
  expect(session.recording).toBe(true);
});
