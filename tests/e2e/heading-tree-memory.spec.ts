import type { BrowserContext, CDPSession, Page, Worker } from '@playwright/test';
import { expect, test } from './support/extension';

declare const chrome: {
  tabs: {
    query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number }>>;
  };
  runtime: {
    sendMessage(message: unknown): Promise<unknown>;
  };
};

type RetainedResources = {
  documents: number;
  nodes: number;
  jsEventListeners: number;
  embedderHeapUsedSize: number;
};

const MAX_HEADING_TREE_EMBEDDER_HEAP = 64 * 1024 * 1024;

async function openSidepanel(context: BrowserContext, extensionWorker: Worker) {
  const extensionId = new URL(extensionWorker.url()).hostname;
  if (!extensionId) throw new Error('Could not resolve the FocusTrace extension ID.');
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByRole('heading', { level: 1, name: 'FocusTrace' })).toBeVisible();
  return panel;
}

async function saveDeepHeadingScan(panel: Page): Promise<void> {
  await panel.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error('Could not resolve the sidepanel test tab.');
    await chrome.runtime.sendMessage({
      type: 'FOCUSTRACE_SAVE_SCAN',
      tabId: tab.id,
      scan: {
        engine: 'FocusTrace Rules',
        standard: 'WCAG 2.2',
        url: 'https://example.test/heading-memory',
        title: 'Heading memory regression',
        scannedAt: Date.now(),
        scope: { type: 'page' },
        issues: [],
        review: [],
        warnings: [],
        passes: 0,
        rulesRun: 0,
        headings: [1, 2, 3, 4, 5, 6].map((level) => ({
          id: `heading-${level}`,
          level,
          text: `Heading ${level} with representative wrapping text`,
          selector: `#heading-${level}`,
          signals: [],
        })),
      },
    });
  });
}

async function retainedResources(cdp: CDPSession): Promise<RetainedResources> {
  await cdp.send('HeapProfiler.collectGarbage');
  const [dom, heap] = await Promise.all([
    cdp.send('Memory.getDOMCounters'),
    cdp.send('Runtime.getHeapUsage'),
  ]);
  return {
    documents: dom.documents,
    nodes: dom.nodes,
    jsEventListeners: dom.jsEventListeners,
    embedderHeapUsedSize: heap.embedderHeapUsedSize ?? 0,
  };
}

test('deep heading expansion keeps browser resources bounded and releases collapsed nodes', async ({ context, extensionWorker }) => {
  test.setTimeout(30_000);
  const panel = await openSidepanel(context, extensionWorker);
  await saveDeepHeadingScan(panel);
  await panel.getByRole('button', { name: /Structure|Estructura/ }).click();
  await expect(panel.getByRole('tree').getByRole('treeitem')).toHaveCount(1);

  const cdp = await context.newCDPSession(panel);
  await cdp.send('HeapProfiler.enable');
  const baseline = await retainedResources(cdp);

  for (let level = 1; level < 6; level++) {
    await panel.getByRole('button', { name: `Expand heading branch: Heading ${level} with representative wrapping text` }).click();
    await expect(panel.getByRole('button', { name: `Heading ${level + 1} with representative wrapping text`, exact: true })).toBeVisible();
    const expanded = await retainedResources(cdp);
    expect(expanded.embedderHeapUsedSize).toBeLessThan(MAX_HEADING_TREE_EMBEDDER_HEAP);
  }

  await panel.getByRole('button', { name: 'Collapse all' }).click();
  await expect(panel.getByRole('tree').getByRole('treeitem')).toHaveCount(1);
  const collapsed = await retainedResources(cdp);
  expect(collapsed.documents).toBe(baseline.documents);
  expect(collapsed.nodes).toBe(baseline.nodes);
  expect(collapsed.jsEventListeners).toBe(baseline.jsEventListeners);
});
