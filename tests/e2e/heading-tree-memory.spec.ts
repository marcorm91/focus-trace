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

type MemorySample = {
  cycle: number;
  documents: number;
  nodes: number;
  jsEventListeners: number;
  usedSize: number;
  totalSize: number;
  embedderHeapUsedSize: number;
  backingStorageSize: number;
  layoutCount: number;
  recalcStyleCount: number;
  jsHeapUsedSize: number;
  jsHeapTotalSize: number;
};

async function openSidepanel(context: BrowserContext, extensionWorker: Worker) {
  const extensionId = new URL(extensionWorker.url()).hostname;
  if (!extensionId) throw new Error('Could not resolve the FocusTrace extension ID.');
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByRole('heading', { level: 1, name: 'FocusTrace' })).toBeVisible();
  return panel;
}

async function saveSixLevelHeadingScan(panel: Page): Promise<void> {
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
        title: 'Heading memory diagnostic',
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

async function settle(panel: Page): Promise<void> {
  await panel.evaluate(() => Promise.resolve());
}

async function sampleMemory(cdp: CDPSession, panel: Page, cycle: number): Promise<MemorySample> {
  await cdp.send('HeapProfiler.collectGarbage');
  await settle(panel);
  const [dom, heap, performance] = await Promise.all([
    cdp.send('Memory.getDOMCounters'),
    cdp.send('Runtime.getHeapUsage'),
    cdp.send('Performance.getMetrics'),
  ]);
  const metric = (name: string) => performance.metrics.find((item) => item.name === name)?.value ?? 0;
  return {
    cycle,
    documents: dom.documents,
    nodes: dom.nodes,
    jsEventListeners: dom.jsEventListeners,
    usedSize: heap.usedSize,
    totalSize: heap.totalSize,
    embedderHeapUsedSize: heap.embedderHeapUsedSize ?? 0,
    backingStorageSize: heap.backingStorageSize ?? 0,
    layoutCount: metric('LayoutCount'),
    recalcStyleCount: metric('RecalcStyleCount'),
    jsHeapUsedSize: metric('JSHeapUsedSize'),
    jsHeapTotalSize: metric('JSHeapTotalSize'),
  };
}

for (const layout of ['grid', 'block'] as const) {
  test(`profiles one manual H1-H6 expansion using ${layout} branch layout`, async ({ context, extensionWorker }) => {
    test.setTimeout(60_000);
    const panel = await openSidepanel(context, extensionWorker);
    await saveSixLevelHeadingScan(panel);
    await panel.getByRole('button', { name: /Structure|Estructura/ }).click();
    await expect(panel.getByRole('tree').getByRole('treeitem')).toHaveCount(1);

    if (layout === 'block') {
      await panel.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `
          .heading-tree, .heading-tree-branch, .heading-tree-children { display: block !important; }
          .heading-tree-branch + .heading-tree-branch, .heading-tree-children { margin-top: 7px; }
        `;
        document.head.append(style);
      });
    }

    const cdp = await context.newCDPSession(panel);
    await cdp.send('Performance.enable');
    await cdp.send('HeapProfiler.enable');
    const samples: MemorySample[] = [await sampleMemory(cdp, panel, 0)];

    const maximumLevel = layout === 'grid' ? 3 : 5;
    for (let level = 1; level <= maximumLevel; level++) {
      const clickStartedAt = Date.now();
      await panel.getByRole('button', { name: `Expand heading branch: Heading ${level} with representative wrapping text` }).click();
      await expect(panel.getByRole('button', { name: `Heading ${level + 1} with representative wrapping text`, exact: true })).toBeVisible();
      const clickElapsedMs = Date.now() - clickStartedAt;
      const sampleStartedAt = Date.now();
      const sample = await sampleMemory(cdp, panel, level);
      samples.push(sample);
      console.log(`HEADING_MEMORY_LEVEL ${JSON.stringify({
        layout,
        level,
        clickElapsedMs,
        sampleElapsedMs: Date.now() - sampleStartedAt,
        sample,
      })}`);
    }

    await panel.getByRole('button', { name: 'Collapse all' }).click();
    await expect(panel.getByRole('tree').getByRole('treeitem')).toHaveCount(1);
    samples.push(await sampleMemory(cdp, panel, maximumLevel + 1));
    console.log(`HEADING_MEMORY_DIAGNOSTIC ${JSON.stringify({ layout, samples })}`);

    const baseline = samples[0]!;
    const collapsed = samples.at(-1)!;
    expect(collapsed.documents).toBe(baseline.documents);
    expect(collapsed.nodes).toBe(baseline.nodes);
    expect(collapsed.jsEventListeners).toBe(baseline.jsEventListeners);
  });
}
