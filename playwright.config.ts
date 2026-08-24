import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 20_000,
  expect: {
    timeout: 5_000,
  },
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  outputDir: 'test-results',
});
