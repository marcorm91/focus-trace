// @vitest-environment jsdom

import { act, createElement, Profiler } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeadingTreeView } from '../entrypoints/sidepanel/views/HeadingTreeView';
import type { ScanResult } from '../shared/types';

const api = vi.hoisted(() => ({
  query: vi.fn(async () => [{ id: 1 }]),
  executeScript: vi.fn(async () => []),
}));
vi.mock('wxt/browser', () => ({ browser: { tabs: { query: api.query }, scripting: { executeScript: api.executeScript } } }));

const scan: ScanResult = {
  engine: 'FocusTrace Rules', standard: 'WCAG 2.2', url: 'https://example.test/',
  title: 'Six headings', scannedAt: 1, scope: { type: 'page' },
  issues: [], review: [], warnings: [], passes: 0, rulesRun: 0,
  headings: ([1, 2, 3, 4, 5, 6] as const).map((level) => ({
    id: `h${level}`, level, text: `Heading ${level}`, selector: `#h${level}`, signals: [],
  })),
};

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => vi.clearAllMocks());

describe('heading tree rendering lifecycle', () => {
  it('keeps six-level expansion bounded and does not inspect the page on branch toggles', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onLocate = vi.fn();
    let commits = 0;
    const render = (value: ScanResult) => act(async () => root.render(createElement(
      Profiler, { id: 'headings', onRender: () => { commits++; } },
      createElement(HeadingTreeView, { scan: value, language: 'en', onLocate }),
    )));
    const click = async (label: string) => {
      const button = [...container.querySelectorAll('button')].find((item) =>
        item.getAttribute('aria-label') === label || item.textContent === label,
      );
      expect(button, label).toBeDefined();
      await act(async () => button!.click());
    };
    try {
      await render(scan);
      const collapsedNodes = container.querySelectorAll('*').length;
      expect(container.querySelectorAll('[role="treeitem"]')).toHaveLength(1);
      const startCommits = commits;
      for (let cycle = 0; cycle < 50; cycle++) {
        for (let level = 1; level < 6; level++) {
          await click(`Expand heading branch: Heading ${level}`);
          expect(container.querySelectorAll('[role="treeitem"]')).toHaveLength(level + 1);
        }
        await click('Collapse all');
        expect(container.querySelectorAll('*')).toHaveLength(collapsedNodes);
        await click('Expand all');
        expect(container.querySelectorAll('[role="treeitem"]')).toHaveLength(6);
        await click('Collapse all');
      }
      expect(commits - startCommits).toBe(50 * 8);
      expect(api.query).not.toHaveBeenCalled();
      expect(api.executeScript).not.toHaveBeenCalled();
      expect(onLocate).not.toHaveBeenCalled();
      await click('Expand all');
      await click('Heading 6');
      expect(onLocate).toHaveBeenCalledExactlyOnceWith('#h6');
      await render({ ...scan, scannedAt: 2 });
      expect(container.querySelectorAll('[role="treeitem"]')).toHaveLength(1);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
