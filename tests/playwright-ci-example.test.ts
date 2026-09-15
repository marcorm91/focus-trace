import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Playwright CI example contract', () => {
  it('runs FocusTrace from repository dependencies and preserves per-browser SARIF/JUnit artifacts', () => {
    const workflow = readFileSync(new URL('../.github/examples/focustrace-playwright.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('npm ci --no-audit --no-fund');
    expect(workflow).toContain('npm run build:e2e');
    expect(workflow).toContain('npm run playwright:install:validation');
    expect(workflow).toContain('npm run test:e2e -- --config=playwright.focustrace-example.config.ts');
    expect(workflow).not.toContain('npx playwright');
    expect(workflow).toContain('artifacts/focustrace/focustrace-chromium.sarif.json');
    expect(workflow).toContain('artifacts/focustrace/focustrace-chromium.junit.xml');
    expect(workflow).toContain('artifacts/focustrace/focustrace-firefox.sarif.json');
    expect(workflow).toContain('artifacts/focustrace/focustrace-firefox.junit.xml');
  });

  it('keeps the example on the shared Playwright integration and validates Chromium plus Firefox', () => {
    const example = readFileSync(new URL('../examples/playwright/focustrace.example.ts', import.meta.url), 'utf8');
    const config = readFileSync(new URL('../playwright.focustrace-example.config.ts', import.meta.url), 'utf8');
    expect(example).toContain("from '../../integrations/playwright'");
    expect(example).toContain('focusTraceCheckpoint');
    expect(example).toContain('basename: `focustrace-${testInfo.project.name}`');
    expect(example).not.toMatch(/runFocusTraceScan\s*\(/);
    expect(config).toContain("testDir: './examples/playwright'");
    expect(config).toContain("testMatch: '**/*.example.ts'");
    expect(config).toContain("name: 'chromium'");
    expect(config).toContain("devices['Desktop Chrome']");
    expect(config).toContain("name: 'firefox'");
    expect(config).toContain("devices['Desktop Firefox']");
  });
});
