import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function functionBlock(contents: string, name: string, nextName?: string): string {
  const start = contents.indexOf(`export async function ${name}`);
  const end = nextName ? contents.indexOf(`export async function ${nextName}`, start + 1) : contents.length;
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return contents.slice(start, end);
}

describe('fresh-install page access', () => {
  it('requests web-page origins before reading privileged active-tab URL data', () => {
    const contents = source('lib/extension/page-access.ts');
    const block = functionBlock(contents, 'requestActivePageAccess', 'requestTabPageAccess');

    expect(block.indexOf('requestWebPageAccess()')).toBeGreaterThanOrEqual(0);
    expect(block.indexOf('requestWebPageAccess()')).toBeLessThan(block.indexOf('activeWebPageTab()'));
  });

  it('requests web-page origins before reading a fresh installation tab by id', () => {
    const contents = source('lib/extension/page-access.ts');
    const block = functionBlock(contents, 'requestTabPageAccess');

    expect(block.indexOf('requestWebPageAccess()')).toBeGreaterThanOrEqual(0);
    expect(block.indexOf('requestWebPageAccess()')).toBeLessThan(block.indexOf('webPageTabById(tabId)'));
  });

  it('starts Analyze and Site Audit permission requests directly from their click paths', () => {
    const hook = source('entrypoints/sidepanel/hooks/usePageRuntimeAccess.ts');
    const launcher = source('entrypoints/sidepanel/components/SiteAuditLauncher.tsx');

    expect(hook).toContain('await requestTabPageAccess(tabId)');
    expect(hook).toContain("throw new Error('FocusTrace page access permission was not granted.')");
    expect(launcher.indexOf('await requestWebPageAccess()')).toBeLessThan(
      launcher.indexOf('browser.tabs.query'),
    );
  });
});
