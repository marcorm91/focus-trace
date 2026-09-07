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
  await panel.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
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

async function runCycles(panel: Page, cycles: number): Promise<void> {
  await panel.evaluate(async (count) => {
    const button = (label: string) => [...document.querySelectorAll('button')]
      .find((candidate) => candidate.textContent?.trim() === label) as HTMLButtonElement | undefined;
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    for (let cycle = 0; cycle < count; cycle++) {
      button('Expand all')?.click();
      await frame();
      button('Collapse all')?.click();
      await frame();
    }
  }, cycles);
}

test('diagnoses retained resources while repeatedly expanding headings', async ({ context, extensionWorker }) => {
  test.setTimeout(120_000);
  const panel = await openSidepanel(context, extensionWorker);
  await saveSixLevelHeadingScan(panel);
  await panel.getByRole('button', { name: /Structure|Estructura/ }).click();
  await expect(panel.getByRole('tree').getByRole('treeitem')).toHaveCount(1);

  const cdp = await context.newCDPSession(panel);
  await cdp.send('Performance.enable');
  await cdp.send('HeapProfiler.enable');
  const samples: MemorySample[] = [await sampleMemory(cdp, panel, 0)];
  let completed = 0;
  for (const batch of [25, 25, 50, 100]) {
    await runCycles(panel, batch);
    completed += batch;
    expect(await panel.getByRole('tree').getByRole('treeitem').count()).toBe(1);
    samples.push(await sampleMemory(cdp, panel, completed));
  }

  console.log(`HEADING_MEMORY_DIAGNOSTIC ${JSON.stringify(samples)}`);
  const baseline = samples[0]!;
  const final = samples.at(-1)!;
  expect(final.documents).toBe(baseline.documents);
  expect(final.nodes).toBe(baseline.nodes);
  expect(final.jsEventListeners).toBe(baseline.jsEventListeners);
});
