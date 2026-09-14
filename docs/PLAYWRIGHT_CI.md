# Playwright and CI/CD integration

FocusTrace can run inside an existing Playwright test without launching a second browser or maintaining a second accessibility rule engine. The adapter in `integrations/playwright.ts` injects the same browser scanner built for the local CLI and routes every checkpoint through the shared FocusTrace core, lifecycle, profile and versioned export contracts.

## Build prerequisites

Install repository dependencies, build the browser scanner and install Playwright Chromium:

```bash
npm ci
npm run build:e2e
npm run playwright:install:chromium
```

`build:e2e` builds both the browser extension and `dist/cli/browser-scanner.js`, which is the scanner injected into the Playwright `Page`.

No FocusTrace, Deque or axe account is required. FocusTrace does not send inspected-page content or findings to a hosted service.

## Page checkpoint

```ts
import { test } from '@playwright/test';
import { focusTraceCheckpoint } from './integrations/playwright';

test('checkout is accessible', async ({ page }) => {
  await page.goto('http://localhost:3000/checkout');

  await focusTraceCheckpoint(page, {
    thresholds: { maxFailures: 0 },
  });
});
```

With no `thresholds` object, FocusTrace applies the same default policy: zero deterministic FAIL findings are allowed. REVIEW and WARNING do not fail the checkpoint by default.

## Component checkpoint

```ts
await focusTraceCheckpoint(page, {
  scope: 'component',
  selector: '#checkout-dialog',
  thresholds: { maxFailures: 0 },
});
```

The component checkpoint uses the same `ComponentScanScope` and production `runFocusTraceScan` implementation used by the extension and CLI. An invalid or missing selector is an operational error; FocusTrace does not silently switch to a page scan.

## Thresholds

Thresholds remain outcome-specific:

```ts
await focusTraceCheckpoint(page, {
  thresholds: {
    maxFailures: 0,
    maxReviews: 5,
    maxWarnings: 10,
  },
});
```

`maxFailures` counts deterministic FAIL findings. `maxReviews` and `maxWarnings` can be used as separate policy gates, but exceeding them does not relabel those findings as FAIL.

When a saved compatible baseline is supplied, regression-only gates can use `maxNewFailures`:

```ts
await focusTraceCheckpoint(page, {
  baselinePath: './focustrace-baseline.json',
  thresholds: { maxNewFailures: 0 },
});
```

If a thresholds object is supplied, only the thresholds explicitly present in that object are enforced. This allows a legacy baseline to retain known deterministic failures while blocking newly introduced deterministic failures.

## Saved baselines

Create or replace a local baseline after a reviewed run:

```ts
await focusTraceCheckpoint(page, {
  saveBaselinePath: './focustrace-baseline.json',
  thresholds: { maxFailures: 0 },
});
```

Compare a later checkpoint:

```ts
await focusTraceCheckpoint(page, {
  baselinePath: './focustrace-baseline.json',
  thresholds: { maxNewFailures: 0 },
});
```

Baseline comparison reuses FocusTrace finding lifecycle semantics. A baseline is compatible only when sanitized route, scope and audit-profile snapshot match. Query strings and fragments are redacted before route comparison, so navigation from `/checkout?step=1` to `/checkout?step=2` remains the same privacy-safe route. Incompatible baselines start a fresh comparison and do not infer missing findings as resolved.

## SARIF and JUnit artifacts

Artifacts are written before threshold assertions are evaluated, so a failing CI step can still upload evidence:

```ts
await focusTraceCheckpoint(page, {
  thresholds: { maxFailures: 0 },
  artifacts: {
    directory: './artifacts/focustrace',
  },
});
```

The default files are:

- `focustrace.sarif.json`
- `focustrace.junit.xml`

Both use the versioned export contract from `docs/EXPORTS.md`. Only deterministic FAIL creates a failing JUnit testcase. REVIEW and WARNING remain non-failing cases and retain their FocusTrace outcome metadata.

For reproducible fixture or snapshot pipelines, provide a fixed `generatedAt` value:

```ts
artifacts: {
  directory: './artifacts/focustrace',
  generatedAt: 1_700_000_000_000,
}
```

Given the same FocusTrace result and `generatedAt`, SARIF and JUnit rendering is deterministic.

## Lower-level API

`integrations/playwright.ts` also exports:

- `scanFocusTrace(page, options)` — scan without applying a threshold assertion;
- `assertFocusTrace(result, thresholds)` — apply outcome-specific CI policy;
- `summarizeFocusTraceThresholds(result)` — derive FAIL/new FAIL/REVIEW/WARNING counts;
- `writeFocusTraceArtifacts(result, options)` — write SARIF/JUnit files;
- `writeFocusTraceBaseline(path, baseline)` — persist the versioned local baseline;
- `focusTraceCheckpoint(page, options)` — scan, write requested evidence and enforce thresholds in one call.

## GitHub Actions

A repository-local example is available at `.github/examples/focustrace-playwright.yml`. It uses only the repository's declared Node/Playwright dependencies for FocusTrace execution:

1. `npm ci`
2. `npm run build:e2e`
3. `npm run playwright:install:chromium`
4. `npx playwright test examples/playwright/focustrace.spec.ts`
5. upload the SARIF and JUnit files as artifacts even when the accessibility checkpoint fails

The example test defaults to the repository fixture, so it can execute without an external service. Set `FOCUSTRACE_URL` to point it at an application already started by the consuming pipeline.

## Privacy and evidence boundaries

The Playwright integration operates on the `Page` already controlled by the test. It does not create a FocusTrace cloud session, transmit inspected DOM content, or require credentials for a FocusTrace service.

The tested application can make its normal network requests. FocusTrace itself keeps the existing URL redaction, baseline minimization and versioned export policies. Authentication state belongs to the Playwright browser context created by the test suite and is not copied into the FocusTrace baseline.

The integration does not change extension browser permissions and does not introduce a runtime axe-core or Deque dependency.
