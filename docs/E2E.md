# Browser E2E runtime validation

FocusTrace uses Playwright to validate the runtime debugger inside a real Chromium browser with the built MV3 extension loaded.

These tests complement Vitest/jsdom. They are intended to catch browser behavior that unit tests cannot faithfully reproduce, including real `document.activeElement`, keyboard activation, `MutationObserver`, dialog focus, extension messaging, session storage and SPA URL changes.

## Run locally

Install the pinned Playwright Chromium and Firefox builds once:

```bash
npm run playwright:install:validation
```

Then run:

```bash
npm run e2e
```

The complete `npm run release:check:full` command also executes `npm run test:e2e -- --config=playwright.focustrace-example.config.ts` after the extension suite.

Set `FOCUSTRACE_E2E_HEADFUL=1` to see Chromium while debugging locally.

## Test-only permission

The production manifest is unchanged. `npm run build:e2e` sets `FOCUSTRACE_E2E=1`, which adds the following required host permissions only to the test build:

```text
http://*/*
https://*/*
<all_urls>
```

These test permissions model an already-granted page/capture context. They let Playwright inject runtime instrumentation and exercise visual capture on deterministic local fixtures without a physical toolbar click granting `activeTab`.

Normal `npm run build` does not include required host permissions. Do not distribute the E2E variant as a production package.

## Covered runtime scenarios

The initial suite validates:

- focused node removal and focus loss;
- breakpoint-driven recording pause;
- dialog opening without initial focus;
- correct initial modal focus without a false positive;
- focus escaping an ARIA modal;
- a focused control becoming `aria-hidden`;
- SPA route change without focus movement;
- SPA route change with an observed focus transition;
- Focus Graph generation from a browser-recorded session;
- Markdown and versioned JSON evidence generation from that same session.

Fixtures are served from a random loopback port and contain only the minimum DOM/JavaScript needed to reproduce each behavior.

## CI

The `e2e` CI job runs independently from the regular TypeScript/Vitest/build job so both can execute in parallel. It:

1. installs dependencies;
2. builds the E2E-only extension variant;
3. installs Playwright Chromium, Firefox and required Linux dependencies;
4. runs the browser suite with one worker for deterministic extension/session behavior;
5. runs the reusable scanner example in Chromium and Firefox;
6. uploads Playwright failure artifacts only when the job fails.

The suite uses the Playwright `chromium` channel so MV3 extensions can run in modern headless Chromium.

## Evidence boundary

An E2E pass proves that the documented FocusTrace behavior occurred for the controlled fixture. It is not a browser-wide accessibility conformance claim and does not replace manual accessibility testing.
