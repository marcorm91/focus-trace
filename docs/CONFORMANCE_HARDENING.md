# Conformance and cross-browser hardening

This document describes the release-hardening model used for FocusTrace's independent accessibility engine. It is a validation contract, not a claim of complete WCAG, EN 301 549, or assistive-technology certification.

## Source of truth

Normative and standards-derived behavior comes from WCAG 2.2, WAI-ARIA, Accessible Name and Description Computation, HTML, and applicable ACT Rules. ARIA Authoring Practices are used as informative implementation guidance where appropriate.

Axe-derived data is benchmark-only. It is not a normative source, is not required at runtime, and must not decide whether a FocusTrace rule is conformant.

## Deterministic rule coverage

`config/conformance-coverage.json` is the release contract for the public `FT-WCAG-*` static rule family. The current contract covers all 22 production `FT-WCAG-*` rules. Every production rule must declare four dimensions:

- **positive**: conforming evidence or the rule's supported PASS path;
- **negative**: non-conforming evidence, or the rule's non-PASS path when its public behavior is REVIEW/WARNING rather than FAIL;
- **inapplicable**: evidence that the rule does not apply to a candidate or scope;
- **exception**: supported standards/implementation exceptions and conservative boundaries.

A dimension can be marked not applicable only when that state does not exist in the implemented rule model, and the contract must explain why. The validator rejects missing production rules, stale rule entries, missing test references, and undocumented dimensions. The contract is metadata tying each dimension to executable repository evidence; the referenced behavior remains enforced by the test suites themselves.

Run:

```bash
npm run conformance:validate
npm run hardening:test
```

Both are part of the normal release quality gates.

## Regression policy and performance budget

The hardening contract records a zero-tolerance policy for known critical and false-positive regressions. The numeric policy values are validated as release metadata; actual behavior is enforced by the focused hardening suites and the complete test suite rather than inferred from the JSON alone.

| Policy / budget | Release limit | Enforcement |
| --- | ---: | --- |
| Known critical regressions | 0 | focused hardening suites + full unit/integration suite |
| Known false-positive regressions | 0 | `tests/qa-hardening.test.ts` + focused rule suites |
| Root-wide universal DOM queries per static scan | 1 | `tests/scan-query-budget.test.ts` |

`tests/performance/static-scan.bench.ts` separately benchmarks generated pages with 1,000, 5,000 and 10,000 elements. Wall-clock and process-memory numbers are intentionally treated as trend data rather than fixed CI pass/fail limits because shared runners make absolute time/RSS thresholds noisy. A deterministic query-complexity budget remains release-blocking.

## Browser validation matrix

FocusTrace separates extension-package validation from engine/runtime validation because browser-extension automation support is not identical across engines.

| Target | Extension build | Runtime scanner | Notes |
| --- | --- | --- | --- |
| Chrome | Chromium MV3 build validated | Chromium Playwright coverage | Chromium is the extension E2E host. |
| Edge | Edge MV3 build validated | Covered through the shared Chromium engine path | The Edge package/manifest is validated separately. CI does not claim a distinct automated Edge-extension load where Playwright would only repeat the same Chromium engine path. |
| Firefox | Firefox MV3 build validated | Firefox Playwright browser-scanner coverage | The reusable browser scanner runs on Firefox in CI. |

`tools/validate-browser-builds.mjs` remains responsible for browser-specific package/manifest validation. The reusable Playwright scanner example runs against Chromium and Firefox so standards-derived scan behavior is exercised on two independent browser engines.

### Known automation limitation

Playwright's extension workflow is Chromium-specific. FocusTrace therefore does not claim equivalent automated extension-loading E2E coverage for Firefox. Firefox is covered by its separately validated extension build plus browser-scanner execution in Firefox. Edge is separately built/validated and shares the Chromium runtime engine path.

This limitation must remain visible until the project has a reliable, reproducible extension harness for those browsers.

## Representative interaction workflows

The release suite also retains keyboard/focus, dialog, SPA/navigation, runtime status-message, and ARIA relationship regression suites. These are browser-observable evidence checks; they are not substitutes for real assistive-technology testing with NVDA, JAWS, VoiceOver, TalkBack, or other AT/browser combinations.

Manual AT verification should therefore be recorded as release evidence when a change affects focus movement, announcements, virtual cursor/browse mode behavior, or browser/AT interoperability that cannot be proven by DOM/runtime automation.

## Release gate

`npm run release:check:full` remains the authoritative local release command. It includes standards validation, benchmark-data validation, capability/rule contracts, conformance hardening, focused false-positive/performance regressions, type/lint/unit checks, Chrome/Edge/Firefox builds, build validation, bundle limits, and Playwright E2E.

No rule semantics or public capability claims are changed by this hardening layer; it makes the existing behavior harder to regress and documents where browser automation evidence stops.
