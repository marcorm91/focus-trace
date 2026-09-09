# FocusTrace 0.2.5

FocusTrace 0.2.5 expands conservative WCAG 2.2 coverage and tightens the main analysis workflow without changing the product's local-first or non-certification model.

## New WCAG review and validation coverage

### 2.4.1 Bypass Blocks — `FT-REVIEW-012`

Full-page analysis now reviews whether substantial repeated navigation has an observable keyboard bypass mechanism. The rule does not require a literal “Skip to content” label and does not treat a `<main>` landmark alone as proof of a bypass mechanism. Ambiguous cases remain `REVIEW`.

### 3.2.3 Consistent Navigation — `FT-REVIEW-013`

Site Audit can compare repeated rendered navigation landmarks across sampled pages. FocusTrace only pairs blocks whose complete normalized destination sets match exactly, ignores ambiguous duplicates/partial overlap and reports changed order as `REVIEW`, preserving WCAG's user-initiated-change allowance.

### 1.3.5 Identify Input Purpose — `FT-REVIEW-014`

Page and component analysis now reviews the explicit HTML `autocomplete` subset described by ACT `73f2c2`. FocusTrace validates recognizable standard token grammar but does not infer input purpose from labels, names, placeholders or surrounding prose. Unknown-only/custom taxonomies are deliberately not treated as failures.

### 3.1.2 Language of Parts — `FT-WCAG-013`

Full-page analysis validates explicit `lang` declarations on rendered human-language text against the synchronized IANA primary-language registry, aligned with ACT `de46e4`. Code-like contexts and non-rendered source text are excluded. FocusTrace does not infer missing language changes from natural-language prose, so this remains a deliberately bounded subset of the criterion.

### 3.2.4 Consistent Identification — `FT-REVIEW-015`

Site Audit can review repeated native links whose exact HTTP(S) destination provides a strong cross-page function anchor. Comparison requires an unambiguous unique destination, the same page language and the same accessible-name source. Lexically compatible labels, numeric-only variation, mixed-name approximations and ambiguous duplicates are suppressed. Same destination is not treated as proof of semantic equivalence, so findings remain `REVIEW`.

### 1.4.12 Text Spacing — `FT-REVIEW-016`

Page and component analysis now covers the observable inline-`!important` ACT subsets for:

- `letter-spacing` at least `0.12 × font-size` — ACT `24afc2`;
- `word-spacing` at least `0.16 × font-size` — ACT `9e45ec`;
- `line-height` at least `1.5 × font-size` when a real soft wrap is observed — ACT `78fd32`.

The result is `REVIEW` / tested-expectation `PASS`, never automatic WCAG failure. Complete 1.4.12 verification still requires applying all four spacing values together, including paragraph spacing, and confirming there is no loss of content or functionality.

### 2.4.7 Focus Visible — `FT-RUNTIME-010`

Manual Trace can now review keyboard focus visibility after a trusted real `Tab` / `Shift+Tab` transition, informed by ACT `oj04fd`.

FocusTrace deliberately does not reuse automatic Focus Walk for this check because programmatic `element.focus()` does not reliably reproduce keyboard `:focus-visible` modality. The runtime detector requires stable focus, stable viewport state and stable before/after lossless captures. It compares a bounded local pixel region and discards inconclusive or visually unstable evidence.

A stable local region with no observed pixel-color change produces `REVIEW`, never automatic `FAIL`, because the ACT model permits a visible focus indication elsewhere in the viewport. Temporary captures are decoded and compared in memory and are not written to session storage, Memory, reports or exports.

## Unified page analysis and Structure

**Analyze this page** now prepares the bounded Structure snapshot in the same explicit full-page action as the normal rule-engine result. Headings, Semantics and Metrics are therefore ready from the same analyzed DOM instead of requiring a second Structure analysis step.

Structure remains non-continuous: opening the workspace does not start DOM observation and **Refresh** remains available when the page changes. Component-scoped analysis clears the page-global Structure snapshot so document-wide metrics are not presented as component evidence.

## Report UI refinements

Report accordions now use the same soft border treatment across sections. Document Structure spacing around the opened header, metrics summary and separators has also been relaxed so metrics and review cards no longer sit directly against divider lines.

## False-positive policy

The new coverage continues FocusTrace's existing evidence model:

- deterministic failures are reserved for cases the product can actually prove;
- contextual or incomplete observations stay `REVIEW`;
- rules deliberately prefer false negatives when accessible-name, functional identity, visual state or WCAG exceptions cannot be established safely;
- a clean FocusTrace result does not prove complete WCAG or EN 301 549 conformance.

## Privacy and permissions

0.2.5 adds no backend, analytics pipeline or required installation-time host permission. Production page access remains optional/user initiated.

The Focus Visible runtime comparison uses temporary visible-tab captures during an active manual Trace. They can contain visible page information while being processed, but they are compared in memory only and are not persisted by FocusTrace.

## Browser targets

Release targets remain:

- Google Chrome 114+;
- Chromium-based Microsoft Edge;
- Firefox 115+ as an experimental release target pending the packaged-build smoke checklist.

## Validation before publishing

Before tagging the release, run the complete gate on the exact candidate commit:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

The final candidate must keep `package.json`, `package-lock.json`, generated browser manifests, release documentation and `tests/release-contract.test.ts` aligned on `0.2.5`. CI must be green on the exact commit intended for `v0.2.5`, and the manual checks in `docs/RELEASE_CHECKLIST.md` must be completed before publishing production packages.
