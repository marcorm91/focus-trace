# FocusTrace 0.2.7

FocusTrace 0.2.7 expands standards traceability, conservative WCAG review coverage and the developer workflow around affected elements. The release adds a first-class DevTools surface for Chrome, Edge and Firefox while keeping the existing side panel/sidebar workflow available.

The release continues to distinguish tooling coverage from standards conformance: a clean FocusTrace result is evidence about what FocusTrace actually evaluated, not a WCAG or EN 301 549 certification.

## Standards Coverage

FocusTrace now exposes a WCAG 2.2 A/AA coverage model that separates the kind of evidence the product can provide from criterion-level completeness.

The matrix distinguishes:

- **Automated** deterministic static evidence;
- **Review** evidence that still requires human judgement;
- **Runtime** evidence observed during interaction;
- **Site Audit** evidence derived from representative multi-page comparison;
- **Manual** residual conformance work;
- **Not covered** criteria for which FocusTrace has no implemented WCAG-linked rule.

Coverage completeness remains deliberately conservative. The current model does not promote a criterion to complete coverage merely because one or more FocusTrace rules reference it.

## EN 301 549 V4.1.1 traceability

WCAG 2.2 Level A and AA references are now mapped to the corresponding web requirement numbering in **EN 301 549 V4.1.1 (2026-09)**.

The same interpretation boundary is carried into live coverage information and report/export guidance. The mapping is technical traceability only: FocusTrace does not claim complete clause-9 coverage, legal compliance or certification.

## Additional WCAG review evidence

0.2.7 broadens conservative evidence collection for areas that cannot safely be reduced to simple automatic pass/fail decisions, including:

- prerecorded media alternatives and captions;
- audio description / media alternatives and live captions;
- keyboard operability and keyboard traps;
- pointer cancellation behavior;
- form error identification and error suggestions.

These checks preserve FocusTrace's existing boundary between deterministic `FAIL` results and contextual `REVIEW` evidence. Ambiguous cases remain review work rather than being promoted into automatic failures.

## FocusTrace inside browser DevTools

FocusTrace can now run as a dedicated **FocusTrace** panel inside Developer Tools in:

- Google Chrome;
- Chromium-based Microsoft Edge;
- Mozilla Firefox 115+.

The DevTools panel reuses the existing FocusTrace Review, Structure, Trace and Report workspace and pins that workspace to the tab currently being inspected. It is not a second scanner and does not create a parallel result model.

The normal Chrome/Edge side panel and Firefox sidebar remain available for users who prefer the regular extension workflow.

## Native DOM inspection

Affected-element location now has two consistent actions:

1. **Highlight on page** visually marks the element while keeping FocusTrace open.
2. **Inspect in DOM** reveals the exact element in the browser's native DOM inspector.

Inside DevTools, **Inspect in DOM** resolves the saved selector in the inspected page and uses the browser DevTools `inspect()` utility:

- Chrome and Edge select the node in **Elements**;
- Firefox selects the node in **Inspector**.

Outside DevTools, the DOM action remains visible but disabled with guidance to open **F12 → FocusTrace**. Browsers do not expose a supported extension API that lets the normal side panel/sidebar programmatically open DevTools and activate a custom extension panel.

FocusTrace does not call `element.focus()` for DOM reveal, so inspecting a finding does not move keyboard focus or deliberately alter the page interaction state.

## Firefox DevTools permission

Firefox packages the FocusTrace DevTools entrypoint while keeping the `devtools` permission optional.

Users who want the Firefox DevTools workflow can enable **Firefox DevTools integration** from FocusTrace Settings and then open or reopen Developer Tools. The normal Firefox sidebar remains available whether or not that optional permission is granted.

This keeps DevTools access from becoming a new required installation/update permission and does not change the existing optional page/capture host-access model.

## Element-location UI cleanup

The previous in-card HTML/technical-selector inspector has been removed in favor of the compact two-action locator and the browser's native developer tools.

Technical selectors remain part of the finding evidence, but deeper DOM exploration now belongs in the browser inspector rather than a second HTML-inspector interface embedded inside FocusTrace cards.

## Privacy and permissions

0.2.7 adds no FocusTrace backend or analytics pipeline.

Chromium required permissions remain unchanged. FocusTrace does not add `chrome.debugger` for DOM inspection. Existing page and visual-capture host access remains optional and user initiated.

On Firefox, `devtools` is an optional permission. Native DOM reveal changes the developer-tools selection only; it is not used to persist page DOM content or to move real keyboard focus.

## Browser targets

Release targets are:

- Google Chrome 114+;
- Chromium-based Microsoft Edge;
- Firefox 115+.

The existing Firefox packaged-build smoke checklist still applies before publishing the Firefox artifact, including the new optional DevTools/Inspector path.

## Validation before publishing

Before tagging the release, run the complete gate on the exact candidate commit:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

The final candidate must keep `package.json`, `package-lock.json`, generated browser manifests, release documentation and `tests/release-contract.test.ts` aligned on `0.2.7`.

CI must be green on the exact commit intended for `v0.2.7`. Complete the manual checks in `docs/RELEASE_CHECKLIST.md`, including Chrome/Edge/Firefox DevTools DOM selection and the new standards/review smoke scope, before publishing production packages.
