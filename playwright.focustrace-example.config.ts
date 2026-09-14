import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './examples/playwright',
  testMatch: '**/*.example.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 20_000,
  reporter: process.env.CI ? 'line' : 'list',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
