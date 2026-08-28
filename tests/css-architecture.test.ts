import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), 'entrypoints');

function cssFiles(): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.css'))
    .map((path) => join(root, path));
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
    const sidepanelFiles = cssFiles().filter((path) => path.includes('/sidepanel/'));
    const tooSmall = sidepanelFiles.flatMap((path) => {
      const matches = [...readFileSync(path, 'utf8').matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)];
      return matches
        .map((match) => Number(match[1]))
        .filter((size) => size > 0 && size < 14)
        .map((size) => ({ path, size }));
    });
    expect(tooSmall).toEqual([]);
  });
});
