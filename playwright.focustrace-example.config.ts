import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './examples/playwright',
  testMatch: '**/*.example.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 20_000,
  reporter: process.env.CI ? 'line' : 'list',
});
