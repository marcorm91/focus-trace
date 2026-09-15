# Final release review — 2026-09-15

Reviewed source baseline: `c71abeae70180550436d5aa888da1e5f79e0cc2e` (`main`). This change adds release-hardening fixes without bumping the version, tagging, or publishing packages.

## Decision

The three reproduced contrast/lifecycle regressions are corrected in this branch. Automated evidence must be green on the final PR commit before merging. This review does **not** mark the stable 1.0 release complete: #250 requires expert/public beta, manual assistive-technology and packaged-browser evidence that cannot be inferred from source checks or green CI.

The repository contains 33 actual issues at review time (pull requests excluded): 31 closed and two open, #224 and #250. Closed issue state and unchecked acceptance boxes are tracking metadata, not independent proof of implementation. The matrix below records the implementation/test evidence inspected and the remaining boundaries.

## Corrections and regression evidence

- **#234 / #249, opaque contrast backdrops:** use the shared CSS color parser; a zero blue channel in opaque RGB is no longer mistaken for zero alpha. Tests include black, red, blue, semi-transparent and fully transparent backgrounds, plus the full scanner and browser paths.
- **#234 / #249, contrast verification limit:** keep the 100-candidate budget but route subsequent unverified candidates to REVIEW with a specific explanation, localized Spanish copy and matching aggregate counters. A 101-target scan must not invent a final FAIL.
- **#243, lifecycle pairing:** reserve exact evidence matches before pairing changed findings. `[A, B]` to `[C, A]` now retains one persistent and one changed finding; result order no longer consumes a later exact match.
- **#236, regression coverage:** directly test open roots, assigned slots without duplication, frame/shadow relocation, inaccessible frames, bridge-observed closed roots, shared budgets and page/component scan consistency.
- **#248 / #249, release gate:** `release:check:full` now includes the reusable Chromium/Firefox scanner example already executed in CI.
- **Documentation/obsolete references:** correct the E2E permissions and browser matrix, remove the stale duplicate DevTools page reference, document the persistent optional ElementInternals bridge, and label the historical axe classification inventory accurately.

## Issue evidence matrix

“Automated evidence” means source and relevant regression assertions exist and are included in the validation suite. It does not certify every real-world page, browser or assistive-technology combination.

| Issue | Reviewed implementation and executable evidence | Assessment / boundary |
| --- | --- | --- |
| #224 | `config/axe-equivalents.json`, `config/axe-parity/`, `tools/axe-validate.mjs`, `tests/axe-parity-benchmark.test.ts`; child features below | Open epic. All 105 benchmark IDs classified; historical classifications need renewed evidence review before claiming current full parity. |
| #225 | `tests/axe-parity-benchmark.test.ts`: 105 unique classifications, summary consistency, evidence paths, incomplete-data rejection | Automated classification contract supported. Counts are a snapshot, not current certification. |
| #226 | `lib/audit/specialized-accessible-names.ts`, specialized-name coverage/parity/i18n tests | Automated evidence for supported naming semantics and conservative exceptions. |
| #227 | ElementInternals semantics/main-world/registration modules and tests; `tests/e2e/element-internals.spec.ts` | Supported bridge semantics tested; unavailable browser evidence remains conservative. Manual Firefox extension validation remains separate. |
| #228 | `lib/audit/aria-role-state-relationships.ts`, `tests/aria-role-state-relationships.test.ts`, `tests/aria-role-relationship-registry.test.ts`, runtime ARIA suites | Static/relationship and runtime evidence; APG remains informative. |
| #229 | `lib/audit/document-structure.ts`, `tests/document-structure-landmarks.test.ts` | Native/ARIA, hidden, naming and component-scope cases asserted. |
| #230 | `tests/list-structure.test.ts`, content-model and ARIA relationship modules | Native/ARIA list ownership, hidden authoring and deduplication asserted. |
| #231 | `lib/audit/table-relationships.ts`, `tests/table-relationships.test.ts` | Simple, spanning, malformed, layout-like and ARIA tables covered; complex semantics remain reviewable. |
| #232 | `lib/audit/embedded-content.ts`, `tests/embedded-content.test.ts` | Frame names, unavailable content, focusable descendants, SVG/object/image-map naming evidence tested. |
| #233 | `lib/audit/form-audit.ts`, `tests/form-audit.test.ts`, form-errors and autocomplete suites | Label/instruction quality stays REVIEW; tests assert field/error-message value exclusion. |
| #234 | `tests/viewport-visual.test.ts`, new `tests/visual-contrast-policy.test.ts`, browser viewport/reflow/resize suites | Reproduced contrast regressions corrected here. Real AT/zoom validation remains a release task. |
| #235 | Keyboard/navigation/motion modules and unit/browser suites | Static and runtime evidence remain separate, with bounded timing and conservative outcomes. |
| #236 | `lib/audit/composed-tree.ts`, new `tests/composed-tree.test.ts`, `tests/finding-recheck-page.test.ts` | Six direct traversal regressions added here. Closed roots created before observation cannot be reconstructed. |
| #237 | Finding recheck and stable-node modules; finding-recheck, finding-recheck-page and runtime-finding-recheck suites | Original evidence and missing/inconclusive states tested. Actual screen-reader usability is not proven by these tests. |
| #238 | Guided framework/storage and `tests/guided-test-framework.test.ts`, browser framework suite | Pause/resume/cancel/restart, malformed recovery, bounded state and manual outcomes tested. |
| #239 | `tests/guided-keyboard-focus-dialog.test.ts`, keyboard/focus/dialog runtime suites | Guided prompts and observed events remain distinguishable; manual answers still require an auditor. |
| #240 | `tests/guided-table-form-zoom-media.test.ts` and contextual catalog | Contextual steps/evidence contract tested; media quality and equivalence remain manual judgements. |
| #241 | `tests/guided-apg-widget-patterns.test.ts`, browser APG widget fixtures/suite | Localized pattern guidance and informative APG outcomes tested. |
| #242 | Saved-flow modules; saved-flow, saved-flow-page and browser regression suites | Redacted bounded storage, safe manual stops and incomplete-flow outcomes asserted. |
| #243 | Finding lifecycle/review/profile modules and suites | Lifecycle collision fixed here. State bounds, notes, profiles and distinct remediation cases tested. |
| #244 | `lib/report/evidence-guidance.ts`, `tests/evidence-guidance.test.ts` | Every discovered public rule gets EN/ES guidance sections or manual-review explanation. Source tests do not establish third-party authorship rights. |
| #245 | Site Audit discovery/scope/baseline modules and suites | Redacted baseline, scope compatibility, sampling and bounds asserted. Authenticated route setup remains explicit user work. |
| #246 | Versioned exports and schema; versioned-export, schema and dispatch suites | JSON round-trip, escaped HTML, CSV formula protection, SARIF/JUnit outcome separation and bounded large exports tested. |
| #247 | Shared audit core/CLI modules; audit-core, cli-baseline, cli-args and browser CLI suites | Same scanner contracts consumed; no separate CLI rule engine or account requirement. |
| #248 | `integrations/playwright.ts`, unit/browser integration suites and example config | Checkpoints, baseline thresholds and separate browser artifacts tested; full local gate now runs both browser examples. |
| #249 | Rule/conformance validators, critical coverage, query budget, hardening and full CI suites | Automated gates supported and regressions strengthened here. Manual AT evidence and environment-dependent time/memory observations are not fixed CI guarantees. |
| #250 | `docs/RELEASE_CHECKLIST.md`, `docs/STORE_SUBMISSION.md`, `docs/CONFORMANCE_HARDENING.md` | Open. Expert beta, manual self-audit, packaged Chrome/Edge/Firefox validation, final version/notes/tag/store submission remain outstanding. |
| #281 | `tests/generated-content-contrast.test.ts`, contrast and non-text contrast modules, contrast documentation | PUA/icon-font versus generated-text classification retained; accessible-name checks stay on real elements. |
| #120, #134, #138, #141 | Committed standards snapshots and `standards:validate` / `axe:validate` | Historical upstream-update issues. Current snapshot integrity is validated; this review does not claim a fresh upstream synchronization. |
| #260 | Closed accidental connector-test issue | No product requirements; explicitly excluded from implementation work. |

## Obsolete-code assessment

`deadcode:validate` (Knip), TypeScript and lint are required gates. No confirmed unused production module or dependency was identified by those checks. The obsolete HTML/ARIA catalogs are intentional audit inputs; compatibility code preserving old Memory data and Firefox support is not deleted merely because it is called legacy. The old release notes and version 0.2.9 are retained until the dedicated release PR.

Documentation that incorrectly described current behavior was corrected. `docs/STORE_SUBMISSION.md` still requires the project's final public privacy/support URLs to be selected and entered before store submission; this review does not invent a published store configuration.

## Validation boundary

The baseline `main` CI run 34930967289 passed 1,178 unit tests, 63 extension E2E tests and two browser scanner examples. Those baseline results alone do not validate this branch. The PR's exact-commit CI is the final automated evidence for these changes.

Local `release:check` validates standards, rule/catalog/i18n contracts, dead code, coverage, TypeScript, lint, tests, all three production builds, permissions and bundle budgets. Local browser execution is constrained by unavailable Playwright browser downloads in the review environment; the PR CI installs the pinned browsers and runs both extension and Chromium/Firefox scanner suites.

Production artifacts must be rebuilt after an E2E run: `build:e2e` intentionally replaces the Chrome output with a test-only permission variant. Package validation runs on production builds before E2E and must not be bypassed when producing release ZIPs.
