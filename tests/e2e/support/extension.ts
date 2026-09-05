import { chromium, expect, test as base, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { resolve } from 'node:path';
import type { RuntimeBreakpointSettings, RuntimeCauseType, SessionState } from '../../../shared/types';

const EXTENSION_PATH = resolve(process.cwd(), '.output/chrome-mv3');

const E2E_BREAKPOINTS: RuntimeBreakpointSettings = {
  'focused-node-removed': true,
  'focus-fell-back-to-body': true,
  'dialog-opened-without-focus': true,
  'modal-focus-escape': true,
  'route-changed-without-focus-move': false,
  'focused-element-became-hidden': true,
};

export const test = base.extend<{
  context: BrowserContext;
  extensionWorker: Worker;
}>({
  context: async ({ browserName: _browserName }, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: process.env.FOCUSTRACE_E2E_HEADFUL !== '1',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    await use(context);
    await context.close();
  },

  extensionWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    await use(worker);
  },
});

export { expect };

async function tabIdForPage(worker: Worker, page: Page): Promise<number> {
  const targetUrl = page.url();
  return worker.evaluate(async (url) => {
    const chromeApi = (globalThis as any).chrome;
    const tabs = await chromeApi.tabs.query({});
    const tab = tabs.find((candidate: any) => candidate.url === url);
    if (tab?.id == null) throw new Error(`Could not resolve browser tab for ${url}`);
    return tab.id as number;
  }, targetUrl);
}

export async function startRecording(worker: Worker, page: Page): Promise<number> {
  const tabId = await tabIdForPage(worker, page);
  await worker.evaluate(async ({ id, breakpoints }) => {
    const chromeApi = (globalThis as any).chrome;
    const key = `session:${id}`;

    await chromeApi.storage.session.set({
      [key]: {
        tabId: id,
        recording: true,
        startedAt: Date.now(),
        events: [],
        breakpoints,
      },
    });

    try {
      await chromeApi.tabs.sendMessage(id, { type: 'FOCUSTRACE_PING' });
    } catch {
      await chromeApi.scripting.executeScript({
        target: { tabId: id },
        files: ['/content-scripts/runtime.js'],
      });
    }

    let statusReady = false;
    try {
      statusReady = await chromeApi.tabs.sendMessage(id, {
        type: 'FOCUSTRACE_STATUS_MESSAGES_PING',
      }) === 'FOCUSTRACE_STATUS_MESSAGES_READY';
    } catch {
      statusReady = false;
    }
    if (!statusReady) {
      await chromeApi.scripting.executeScript({
        target: { tabId: id },
        files: ['/content-scripts/status-messages.js'],
      });
    }

    await chromeApi.tabs.sendMessage(id, {
      type: 'FOCUSTRACE_SET_RECORDING',
      enabled: true,
      breakpoints,
    });
  }, { id: tabId, breakpoints: E2E_BREAKPOINTS });

  return tabId;
}

export async function readSession(worker: Worker, tabId: number): Promise<SessionState> {
  return worker.evaluate(async (id) => {
    const chromeApi = (globalThis as any).chrome;
    const key = `session:${id}`;
    const stored = await chromeApi.storage.session.get(key);
    const state = stored[key];
    if (!state) throw new Error(`No FocusTrace session exists for tab ${id}`);
    return state;
  }, tabId) as Promise<SessionState>;
}

export function sessionHasCause(state: SessionState, type: RuntimeCauseType): boolean {
  return state.events.some((event) => event.causes?.some((cause) => cause.type === type));
}

export async function waitForSession(
  worker: Worker,
  tabId: number,
  predicate: (state: SessionState) => boolean,
  timeout = 5_000,
): Promise<SessionState> {
  let latest: SessionState | undefined;
  await expect.poll(
    async () => {
      latest = await readSession(worker, tabId);
      return predicate(latest);
    },
    { timeout },
  ).toBe(true);

  return latest!;
}
