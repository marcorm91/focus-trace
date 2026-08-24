# Browser E2E runtime validation

FocusTrace uses Playwright to validate the runtime debugger inside a real Chromium browser with the built MV3 extension loaded.

These tests complement Vitest/jsdom. They are intended to catch browser behavior that unit tests cannot faithfully reproduce, including real `document.activeElement`, keyboard activation, `MutationObserver`, dialog focus, extension messaging, session storage and SPA URL changes.

## Run locally

Install the Playwright Chromium build once:

```bash
npx playwright install chromium
```

Then run:

```bash
npm run e2e
```

Set `FOCUSTRACE_E2E_HEADFUL=1` to see Chromium while debugging locally.

## Test-only permission

The production manifest is unchanged. `npm run build:e2e` sets `FOCUSTRACE_E2E=1`, which adds only this host permission to the test build:

```text
http://127.0.0.1/*
```

The permission lets Playwright inject the runtime content script into deterministic local fixture pages without relying on a physical click on the browser toolbar to grant `activeTab`.

Normal `npm run build` does not include this host permission.

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
3. installs Playwright Chromium and required Linux dependencies;
4. runs the browser suite with one worker for deterministic extension/session behavior;
5. uploads Playwright failure artifacts only when the job fails.

The suite uses the Playwright `chromium` channel so MV3 extensions can run in modern headless Chromium.

## Evidence boundary

An E2E pass proves that the documented FocusTrace behavior occurred for the controlled fixture. It is not a browser-wide accessibility conformance claim and does not replace manual accessibility testing.
