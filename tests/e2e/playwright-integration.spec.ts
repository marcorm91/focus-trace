import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, expect, test, type Page } from '@playwright/test';
import {
  focusTraceCheckpoint,
  scanFocusTrace,
  writeFocusTraceArtifacts,
} from '../../integrations/playwright';

const fixturePath = resolve('tests/fixtures/cli-accessibility.html');
const fixtureUrl = pathToFileURL(fixturePath).href;

async function withInstalledChromium(run: (page: Page) => Promise<void>): Promise<void> {
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  try {
    const page = await browser.newPage();
    await run(page);
  } finally {
    await browser.close();
  }
}

test('Playwright adapter scans page and component checkpoints with the production engine', async () => {
  await withInstalledChromium(async (page) => {
    await page.goto(`${fixtureUrl}?state=broken`);

    const pageResult = await focusTraceCheckpoint(page, {
      thresholds: { maxFailures: 10 },
    });
    expect(pageResult.envelope.findings).toContainEqual(expect.objectContaining({
      ruleId: 'FT-WCAG-003',
      outcome: 'fail',
    }));

    const componentResult = await focusTraceCheckpoint(page, {
      scope: 'component',
      selector: '#unnamed-button',
      thresholds: { maxFailures: 10 },
    });
    expect(componentResult.envelope.context.scope).toEqual(expect.objectContaining({ type: 'component' }));
    expect(componentResult.envelope.findings).toContainEqual(expect.objectContaining({
      ruleId: 'FT-WCAG-003',
      outcome: 'fail',
    }));
  });
});

test('Playwright regression baseline survives same-route navigation and flags only the new FAIL', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'focustrace-playwright-'));
  const baselinePath = join(directory, 'baseline.json');
  const artifactDir = join(directory, 'artifacts');

  try {
    await withInstalledChromium(async (page) => {
      await page.goto(`${fixtureUrl}?state=clean`);
      const baseline = await focusTraceCheckpoint(page, {
        saveBaselinePath: baselinePath,
      });
      expect(baseline.envelope.summary.failures).toBe(0);

      await page.goto(`${fixtureUrl}?state=broken`);
      const regression = await scanFocusTrace(page, { baselinePath });
      expect(regression.baselineCompatible).toBe(true);
      expect(regression.envelope.findings).toContainEqual(expect.objectContaining({
        ruleId: 'FT-WCAG-003',
        outcome: 'fail',
        lifecycleState: 'new',
      }));

      const paths = await writeFocusTraceArtifacts(regression, {
        directory: artifactDir,
        generatedAt: 1_700_000_000_000,
      });
      expect(paths.map((path) => basename(path))).toEqual([
        'focustrace.sarif.json',
        'focustrace.junit.xml',
      ]);

      const sarifFirst = await readFile(join(artifactDir, 'focustrace.sarif.json'), 'utf8');
      const junitFirst = await readFile(join(artifactDir, 'focustrace.junit.xml'), 'utf8');
      await writeFocusTraceArtifacts(regression, {
        directory: artifactDir,
        generatedAt: 1_700_000_000_000,
      });
      expect(await readFile(join(artifactDir, 'focustrace.sarif.json'), 'utf8')).toBe(sarifFirst);
      expect(await readFile(join(artifactDir, 'focustrace.junit.xml'), 'utf8')).toBe(junitFirst);

      await expect(focusTraceCheckpoint(page, {
        baselinePath,
        thresholds: { maxNewFailures: 0 },
        artifacts: {
          directory: artifactDir,
          generatedAt: 1_700_000_000_000,
        },
      })).rejects.toThrow(/new FAIL 1 exceeds maxNewFailures 0/);
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
