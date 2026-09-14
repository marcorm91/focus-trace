# FocusTrace local CLI

The FocusTrace CLI runs the same independent accessibility scanner used by the browser extension inside a local Chromium page. It does not contain a second rule engine and does not require a FocusTrace, Deque or axe account or service.

## Architecture

The extension and CLI both execute `runFocusTraceScan` from `lib/audit/scan.ts`. The CLI changes only the rendered-page adapter: Playwright opens the requested page locally and the browser bridge invokes the production scanner in that document.

DOM-independent contracts are exposed through `lib/core/index.ts`:

- result, severity, standards and scope types;
- the shared FocusTrace rule catalog;
- audit-profile normalization/filtering;
- finding deduplication and lifecycle comparison;
- the rendered-page adapter boundary;
- local CLI baseline helpers;
- the versioned JSON/HTML/CSV/SARIF/JUnit serialization layer.

React and extension UI code are not required by the reusable core facade.

## Build and browser setup

Install the repository dependencies normally, then install the local Chromium runtime used by Playwright if it is not already present:

```bash
npm ci
npm run playwright:install:chromium
npm run cli:build
```

`npm run cli -- ...` builds the CLI before executing it, so a separate `cli:build` is optional for ordinary use.

## Basic usage

Audit an HTTP(S) page:

```bash
npm run cli -- https://example.com
```

Audit a local HTML file:

```bash
npm run cli -- ./fixtures/page.html
```

The default output is the versioned FocusTrace JSON envelope on stdout. A short outcome summary is written to stderr so JSON, CSV, SARIF and JUnit stdout remain machine-readable.

## Scope

The default scope is the complete page. To audit one rendered component, provide an explicit CSS selector:

```bash
npm run cli -- https://example.com --scope component --selector '#checkout-dialog'
```

Component scope uses the same `ComponentScanScope` and the same production scanner as the extension. An invalid selector or a selector that does not resolve to an element is an operational error; FocusTrace does not silently fall back to a page scan.

## Audit profiles

The built-in Complete profile is used by default. A custom profile can be supplied as JSON:

```bash
npm run cli -- https://example.com --profile ./audit-profile.json
```

The profile is normalized by the same audit-profile implementation used by the extension. Invalid profile input stops the CLI instead of silently changing the requested audit configuration.

## Output formats

Use `--format` with one of the shared versioned exporters:

```bash
npm run cli -- https://example.com --format json
npm run cli -- https://example.com --format html --output ./audit.html
npm run cli -- https://example.com --format csv --output ./audit.csv
npm run cli -- https://example.com --format sarif --output ./audit.sarif.json
npm run cli -- https://example.com --format junit --output ./audit.junit.xml
```

The mapping is the same one documented in [`EXPORTS.md`](./EXPORTS.md): deterministic `FAIL` can fail automation, while contextual `REVIEW` and authoring `WARNING` remain non-failing in SARIF/JUnit.

## Exit codes

- `0`: the audit completed and there are no deterministic FAIL findings, or `--exit-zero` was requested.
- `1`: the audit completed and at least one deterministic FAIL finding exists.
- `2`: usage, configuration, browser/navigation or file I/O failed.

`--exit-zero` is useful when a CI job should always publish an artifact and enforce policy in a later step.

## Local baselines

Save the current comparison baseline:

```bash
npm run cli -- https://example.com --save-baseline ./baseline.json --exit-zero
```

Compare a later run against it:

```bash
npm run cli -- https://example.com --baseline ./baseline.json --save-baseline ./baseline-next.json --exit-zero
```

Baseline comparison reuses FocusTrace's existing finding lifecycle implementation. Compatible results use `new`, `persistent`, `changed` and `resolved`. A baseline is compatible only when the sanitized route, scope and audit-profile snapshot match; incompatible baselines start a fresh comparison and do not infer missing findings as resolved.

CLI baselines are versioned separately from the export schema. They retain the bounded finding evidence needed for comparison, but remove the page title, heading snapshot, element/context snapshots and auditor notes. Query-string and fragment content in the scan URL is replaced by the same redaction markers used by runtime/export privacy handling.

Baselines and exports are files the user explicitly asks FocusTrace to write. They remain local unless the user chooses to upload or share them.

## Privacy and network boundary

The CLI launches a local Playwright Chromium process and navigates to the target supplied by the user. The target page may naturally make its own network requests, just as it would in a browser.

FocusTrace itself does not upload inspected page content, DOM data, findings, baselines or reports to a FocusTrace, Deque, axe or AI service. No authentication account is required. Navigation errors are reported without echoing the raw target URL, and exported URLs use the shared query/fragment redaction policy.

The CLI accepts only `http:`, `https:` and `file:` targets.

## Other options

```text
--profile <file>         Audit profile JSON; defaults to the complete profile
--scope <page|component> Audit a page or one component
--selector <css>         CSS selector required for component scope
--format <format>        json, html, csv, sarif or junit
--output <file>          Write the export to a file instead of stdout
--baseline <file>        Compare against a local FocusTrace CLI baseline
--save-baseline <file>   Save the current local baseline
--timeout <ms>           Navigation timeout, 1000 to 300000 ms
--headed                 Show the local Chromium window
--exit-zero              Do not return code 1 for deterministic FAIL
-h, --help               Show CLI help
```

## CI and parity guardrails

The browser E2E build also builds the CLI. Browser tests execute the generated CLI against a local HTML fixture and verify that a production rule such as `FT-WCAG-003` is produced through the versioned export contract. Source-contract tests additionally assert that the extension and CLI import the same `runFocusTraceScan` implementation and the same `RULES` object.

This is intentionally stricter than maintaining two implementations that merely happen to have the same rule IDs.
