import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), 'entrypoints');

function cssFiles(): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.css'))
    .map((path) => join(root, path));
}

function sidepanelCssFiles(): string[] {
  return cssFiles().filter((path) => path.includes('/sidepanel/'));
}

describe('CSS architecture', () => {
  it('keeps authored styles free of important declarations', () => {
    const offenders = cssFiles().filter((path) => readFileSync(path, 'utf8').includes('!important'));
    expect(offenders).toEqual([]);
  });

  it('loads each application surface through one explicit cascade entry', () => {
    for (const surface of ['sidepanel', 'site-audit', 'report-print']) {
      const entry = readFileSync(join(root, surface, 'index.css'), 'utf8');
      expect(entry).toContain('@layer');
      expect(entry).toContain('layer(accessibility)');
    }
  });

  it('does not reintroduce sidepanel copy below the 14px readability floor', () => {
    const tooSmall = sidepanelCssFiles().flatMap((path) => {
      const matches = [...readFileSync(path, 'utf8').matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)];
      return matches
        .map((match) => Number(match[1]))
        .filter((size) => size > 0 && size < 14)
        .map((size) => ({ path, size }));
    });
    expect(tooSmall).toEqual([]);
  });

  it('keeps sidepanel selectors compatible with the Firefox 115 minimum', () => {
    const offenders = sidepanelCssFiles().filter((path) => readFileSync(path, 'utf8').includes(':has('));
    expect(offenders).toEqual([]);
  });

  it('uses canonical theme tokens across sidepanel styles', () => {
    const legacyToken = /var\(--(?:border|panel|surface|muted|focus|text-secondary)(?=\s*[,)]|\s)/;
    const offenders = sidepanelCssFiles().filter((path) => legacyToken.test(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
