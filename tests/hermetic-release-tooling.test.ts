import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageManifest = {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(
  readFileSync(resolve(workspaceRoot, 'package.json'), 'utf8'),
) as PackageManifest;
const ciWorkflow = readFileSync(resolve(workspaceRoot, '.github/workflows/ci.yml'), 'utf8');

describe('hermetic release tooling', () => {
  it('runs committed quality-tool versions without dynamic package runners', () => {
    expect(packageJson.devDependencies.knip).toBe('6.34.0');
    expect(packageJson.devDependencies['@vitest/coverage-v8']).toBe('4.1.11');
    expect(packageJson.scripts['deadcode:validate']).toBe('knip --config knip.json');
    expect(packageJson.scripts['coverage:critical']).toMatch(/^vitest /);
    expect(packageJson.scripts['playwright:install:chromium']).toMatch(/^playwright /);

    for (const script of [
      packageJson.scripts['deadcode:validate'],
      packageJson.scripts['coverage:critical'],
      packageJson.scripts['playwright:install:chromium'],
    ]) {
      expect(script).not.toMatch(/\b(?:npx|pnpm\s+dlx|npm\s+exec)\b/);
    }
  });

  it('cleans production output before release builds in local and CI gates', () => {
    const releaseCheck = packageJson.scripts['release:check'] ?? '';
    const firstProductionBuild = releaseCheck.indexOf('npm run build &&');

    expect(releaseCheck.indexOf('npm run build:clean')).toBeGreaterThan(-1);
    expect(releaseCheck.indexOf('npm run build:clean')).toBeLessThan(
      firstProductionBuild,
    );
    expect(ciWorkflow).toMatch(/npm run build:clean\n\s+- run: npm run build/);
  });

  it('removes only the current workspace build directory', () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'focustrace-build-clean-'));
    const outputRoot = resolve(fixtureRoot, '.output');
    const preservedFile = resolve(fixtureRoot, 'preserved.txt');

    try {
      mkdirSync(outputRoot);
      writeFileSync(resolve(outputRoot, 'stale.js'), 'stale');
      writeFileSync(preservedFile, 'keep');

      execFileSync(process.execPath, [resolve(workspaceRoot, 'tools/clean-build-output.mjs')], {
        cwd: fixtureRoot,
      });

      expect(existsSync(outputRoot)).toBe(false);
      expect(readFileSync(preservedFile, 'utf8')).toBe('keep');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
