import { buildAuditEvidenceBundle, renderAuditEvidenceJson, renderAuditEvidenceMarkdown } from '../../lib/runtime/audit-evidence';
import { groupRuntimeInteractions } from '../../lib/runtime/causality';
import { buildFocusGraph } from '../../lib/runtime/focus-graph';
import type { FixtureServer } from './support/fixture-server';
import { startFixtureServer } from './support/fixture-server';
import {
  expect,
  readSession,
  sessionHasCause,
  startRecording,
  test,
  waitForSession,
} from './support/extension';

let fixtures: FixtureServer;

test.beforeAll(async () => {
  fixtures = await startFixtureServer();
});

test.afterAll(async () => {
  await fixtures.close();
});

async function openFixture(page: Parameters<typeof startRecording>[1], name: string) {
  await page.goto(`${fixtures.origin}/${name}`);
  await expect(page.locator('main')).toBeVisible();
}

test('captures focused-node removal, breakpoint pause, graph evidence and exports', async ({ page, extensionWorker }) => {
  await openFixture(page, 'focus-removed.html');
  const tabId = await startRecording(extensionWorker, page);

  const control = page.getByRole('button', { name: 'Remove focused control' });
  await control.focus();
  await page.keyboard.press('Enter');

  const session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => sessionHasCause(state, 'FOCUSED_NODE_REMOVED'),
  );

  expect(session.recording).toBe(false);
  expect(session.pausedByBreakpoint?.causeType).toBe('FOCUSED_NODE_REMOVED');
  expect(session.events.some((event) => event.kind === 'dom-mutation' && event.mutation?.kind === 'node-removed')).toBe(true);

  const graph = buildFocusGraph(session.events);
  expect(graph.nodes.some((node) => node.label === 'Remove focused control')).toBe(true);
  expect(graph.observations.some((observation) => observation.causeType === 'FOCUSED_NODE_REMOVED')).toBe(true);

  const interactions = groupRuntimeInteractions(session.events);
  const bundle = buildAuditEvidenceBundle({
    graph,
    interactions,
    page: { url: page.url(), title: 'Focus removed fixture' },
    generatedAt: '2026-08-24T00:00:00.000Z',
  });

  expect(JSON.parse(renderAuditEvidenceJson(bundle))).toMatchObject({
    schemaVersion: 1,
    product: 'FocusTrace',
    scope: 'recorded-journey',
  });
  expect(renderAuditEvidenceMarkdown(bundle)).toContain('Focus was lost after an element disappeared');
});

test('detects a dialog that opens without moving focus inside', async ({ page, extensionWorker }) => {
  await openFixture(page, 'dialog-broken.html');
  const tabId = await startRecording(extensionWorker, page);

  const trigger = page.getByRole('button', { name: 'Open broken dialog' });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => sessionHasCause(state, 'DIALOG_OPENED_WITHOUT_FOCUS'),
  );

  expect(session.pausedByBreakpoint?.causeType).toBe('DIALOG_OPENED_WITHOUT_FOCUS');
  expect(session.events.some((event) => event.ruleId === 'FT-APG-001')).toBe(true);
});

test('accepts correct initial modal focus and detects a later modal escape', async ({ page, extensionWorker }) => {
  await openFixture(page, 'dialog-good.html');
  const tabId = await startRecording(extensionWorker, page);

  const trigger = page.getByRole('button', { name: 'Open managed dialog' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#inside')).toBeFocused();

  await page.waitForTimeout(100);
  let session = await readSession(extensionWorker, tabId);
  expect(sessionHasCause(session, 'DIALOG_OPENED_WITHOUT_FOCUS')).toBe(false);

  await page.evaluate(() => (document.querySelector('#outside') as HTMLElement).focus());
  session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => sessionHasCause(state, 'MODAL_FOCUS_ESCAPE'),
  );

  expect(session.pausedByBreakpoint?.causeType).toBe('MODAL_FOCUS_ESCAPE');
  expect(session.events.some((event) => event.ruleId === 'FT-APG-002')).toBe(true);
});

test('detects when the focused element becomes programmatically hidden', async ({ page, extensionWorker }) => {
  await openFixture(page, 'focus-hidden.html');
  const tabId = await startRecording(extensionWorker, page);

  const control = page.getByRole('button', { name: 'Hide focused control from accessibility' });
  await control.focus();
  await page.keyboard.press('Enter');

  const session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => sessionHasCause(state, 'FOCUSED_ELEMENT_BECAME_HIDDEN'),
  );

  expect(session.pausedByBreakpoint?.causeType).toBe('FOCUSED_ELEMENT_BECAME_HIDDEN');
  expect(session.events.some((event) => event.mutation?.attribute === 'aria-hidden')).toBe(true);
});

test('detects an SPA route change that leaves focus in the old view', async ({ page, extensionWorker }) => {
  await openFixture(page, 'spa-broken.html');
  const tabId = await startRecording(extensionWorker, page);

  const trigger = page.getByRole('button', { name: 'Open account view' });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const session = await waitForSession(
    extensionWorker,
    tabId,
    (state) => sessionHasCause(state, 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE'),
    6_000,
  );

  expect(session.events.some((event) => event.ruleId === 'FT-RUNTIME-004')).toBe(true);
});

test('does not report unchanged SPA focus when the new view receives focus', async ({ page, extensionWorker }) => {
  await openFixture(page, 'spa-good.html');
  const tabId = await startRecording(extensionWorker, page);

  const trigger = page.getByRole('button', { name: 'Open account view' });
  await trigger.focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('#account-heading')).toBeFocused();
  await page.waitForTimeout(800);

  const session = await readSession(extensionWorker, tabId);
  expect(session.events.some((event) => event.kind === 'route')).toBe(true);
  expect(session.events.some((event) => event.kind === 'focus' && event.element?.selector === '#account-heading')).toBe(true);
  expect(sessionHasCause(session, 'ROUTE_CHANGED_WITHOUT_FOCUS_MOVE')).toBe(false);
});
