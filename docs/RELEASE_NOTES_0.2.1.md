# FocusTrace 0.2.1

FocusTrace 0.2.1 is a reliability-focused update that expands WCAG 2.2 review coverage while strengthening the extension's release and code-quality safeguards.

The release preserves FocusTrace's evidence boundary: deterministic normative evidence may be reported as `FAIL`, while criteria that still depend on context, exceptions or user intent remain explicit `REVIEW` findings.

## Highlights

### Target Size (Minimum) — WCAG 2.5.8 AA

`FT-WCAG-012` adds conservative target-size analysis for interactive controls.

FocusTrace can measure observable target geometry and spacing evidence, but it does not automatically promote a small target to `FAIL`. WCAG 2.5.8 includes exceptions for spacing, equivalent targets, inline targets, user-agent-controlled targets and essential presentation, so the rule remains `REVIEW` when the available DOM/geometry evidence cannot resolve those exceptions deterministically.

The rule is available in English and Spanish and includes the same explanatory/remediation model used by the rest of the product.

### Status Messages — WCAG 4.1.3 AA

Trace adds `FT-RUNTIME-007` for interaction-correlated status messages that may not be programmatically exposed.

The runtime detector intentionally stays conservative. It looks for likely status-message updates after a real user interaction and suppresses the review when FocusTrace observes relevant programmatic exposure such as:

- `role="status"`, `role="alert"` or `role="log"`;
- `role="progressbar"` or native `<progress>`;
- an active `aria-live` region;
- an active `aria-errormessage` relationship.

`aria-busy` alone is not treated as proof that a status message is exposed. Dialog/context changes, focus movement and modeled widget-state containers are also excluded so ordinary UI updates do not become status-message noise.

The result remains `REVIEW`, because FocusTrace cannot infer every authoring intention or assistive-technology announcement from DOM evidence alone.

### Native browser localization

The extension manifest now uses the WebExtension i18n mechanism for browser-owned metadata:

- extension name;
- extension description;
- toolbar action title.

English is the manifest fallback and an equivalent Spanish catalog is packaged for Chrome, Edge and Firefox. This native layer is intentionally separate from FocusTrace's in-product EN/ES selector, so users can still choose the FocusTrace interface language independently of the browser UI language.

### Stronger quality and release guards

0.2.1 adds CI checks designed to stop residual code and release drift before merge:

- Knip dead-code detection for unused files, exports and dependencies;
- rule-contract validation for FocusTrace rule IDs, references and severity metadata;
- EN/ES parity checks for product copy and runtime presentation contracts;
- per-file critical coverage thresholds for accessibility/runtime engines;
- actionlint validation for GitHub Actions workflows;
- browser manifest/build validation across Chrome, Edge and Firefox;
- bundle-size budgets that detect unexpected growth in monitored extension surfaces.

Enabling these checks also removed residual exports/helpers and added missing regression coverage rather than suppressing the findings.

### One release-version source

Browser manifests now read the extension version from `package.json` instead of duplicating a hard-coded version in `wxt.config.ts`.

The release contract also verifies that the package, lockfile, generated browser manifests and operational release documentation describe the same candidate version, including release notes, changelog, release checklist and store-submission guidance.

## Test and reliability coverage

The 0.2.1 regression suite adds or strengthens coverage for:

- WCAG 2.5.8 target-size geometry and exception-aware review behavior;
- WCAG 4.1.3 status-message candidate detection and semantic exposure;
- Spanish status-message evidence preservation;
- dialog, focus and navigation context-change suppression;
- isolated-world mutation/click ordering in the runtime detector;
- conservative dragging-target classification;
- native EN/ES manifest locale catalogs;
- dead-code, rule, i18n, workflow, manifest and bundle contracts;
- operational release-document version alignment.

## Privacy and permissions

0.2.1 adds no FocusTrace backend, analytics pipeline or new production permission.

Production page access remains optional and user initiated. The local-first processing/storage model is unchanged.

## Browser targets

Release targets remain:

- Google Chrome 114+;
- Chromium-based Microsoft Edge;
- Firefox 115+ as an experimental release target pending the packaged-build smoke checklist.

## EN 301 549 context

FocusTrace continues to use WCAG 2.2 as its web-conformance source. Relevant implemented WCAG criteria may support evaluation against corresponding EN 301 549 web requirements, but FocusTrace does **not** claim complete EN 301 549 coverage, certification or conformance.

## Validation before publishing

Run the complete release gate on the exact candidate commit:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

CI must be green on the exact commit intended for `v0.2.1`, and the manual checks in `docs/RELEASE_CHECKLIST.md` must be completed before the tag and production packages are published.
