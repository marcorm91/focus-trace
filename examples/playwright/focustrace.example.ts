import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from '@playwright/test';
import { focusTraceCheckpoint } from '../../integrations/playwright';

const target = process.env.FOCUSTRACE_URL
  ?? `${pathToFileURL(resolve('tests/fixtures/cli-accessibility.html')).href}?state=clean`;

test('FocusTrace page checkpoint', async ({ page }) => {
  await page.goto(target);
  await focusTraceCheckpoint(page, {
    thresholds: { maxFailures: 0 },
    artifacts: {
      directory: 'artifacts/focustrace',
    },
  });
});
