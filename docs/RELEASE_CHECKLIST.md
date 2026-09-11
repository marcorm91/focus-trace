# FocusTrace release checklist

Current release candidate: **0.2.8**.

Use this checklist before publishing a release build or submitting an updated package to a browser store. Keep the candidate version above aligned with `package.json`, `package-lock.json`, the browser manifests and the release contract test.

## Automated gate

Run the complete local release gate:

```bash
npm run release:check:full
```

A release candidate is blocked if standards validation, rule/i18n/dead-code checks, project-wide or critical-module coverage, TypeScript, lint, unit tests, Chrome/Edge/Firefox MV3 builds, manifest/build validation, bundle budgets or browser E2E tests fail.

CI must also be green on the exact commit that will be tagged.

The committed `package-lock.json` must remain synchronized with `package.json`, and CI/release packaging must install it with `npm ci` so the dependency graph cannot drift between builds of the same source commit.

## Accessibility self-audit

- Navigate the side panel/sidebar entirely with the keyboard.
- Navigate the FocusTrace DevTools panel entirely with the keyboard in Chrome/Edge and, after opt-in, Firefox.
- Confirm every visible control has a readable accessible name.
- Confirm focus remains clearly visible throughout Analyze, Structure, Trace, Replay, Report, Settings and the DevTools surface.
- Confirm the document language changes with the FocusTrace language setting.
- Switch FocusTrace to Spanish and inspect representative FAIL, REVIEW and WARNING findings, including Structure/Site Audit/reference details; user-facing scanner/standards prose should be Spanish while technical identifiers such as rule IDs, HTML/ARIA tokens, selectors, ratios and colors remain unchanged.
- Check the panel at 200% browser zoom and at its narrowest supported width.
- Check both light and dark system appearance.
- Check Windows/high-contrast or forced-colors behavior before public release when available.
- Run Analyze against representative fixtures and manually inspect any new REVIEW result for noise.
- Exercise at least one broken and one correctly managed dialog, SPA navigation and focus-restoration flow.
- Record a Trace, inspect Replay and Report, reset the session, then confirm runtime evidence is empty while the latest Analyze result remains available; start another Trace and confirm focus numbering restarts at step 1.

The automated side-panel E2E smoke test is a regression guard; it is not a substitute for the manual checks above.

## Standards Coverage and EN 301 549 smoke

- Open **Instructions → Standards Coverage** and confirm WCAG 2.2 Level A/AA criteria expose the implemented evidence modes without presenting linked criteria as complete conformance coverage.
- Confirm the matrix distinguishes Automated, Review, Runtime, Site Audit, Manual and Not covered states and that completeness remains `none` or `partial` under the current model.
- Confirm representative WCAG A/AA rows expose their EN 301 549 V4.1.1 clause-9 mapping, for example WCAG 1.1.1 → § 9.1.1.1 and WCAG 2.4.11 → § 9.2.4.11.
- Confirm AAA rows are not presented as part of the A/AA EN clause-9 equivalence.
- Generate a Report plus TXT/PDF export and verify the standards legend preserves the WCAG/ACT/EN traceability boundary and never claims that a clean result proves WCAG or EN 301 549 conformance.
- Switch EN/ES and confirm explanatory copy changes language while criterion identifiers and EN clause numbers remain stable.

## WCAG 2.2 regression smoke

### Media alternatives and captions — WCAG 1.2.x

- Analyze representative prerecorded audio/video with observable alternatives/captions and confirm the corresponding review is suppressed where the modeled evidence is present.
- Remove or make the relevant alternative/caption evidence ambiguous and confirm FocusTrace produces contextual `REVIEW`, not automatic `FAIL`.
- Exercise prerecorded audio description/media-alternative and live-caption scenarios and confirm FocusTrace does not invent media state that cannot be observed safely from the page.
- Switch EN/ES and confirm remediation/explanation is translated while media attributes and technical evidence remain unchanged.

### WCAG 1.3.5 Identify Input Purpose

- Analyze a form with an explicit valid standard `autocomplete` token sequence and confirm the modeled expectation can pass without inferring purpose from the visible label alone.
- Use malformed standard-like `autocomplete` grammar and confirm `FT-REVIEW-014` stays `REVIEW`, never automatic `FAIL`.
- Use an unknown-only/custom purpose taxonomy and confirm FocusTrace does not invent a WCAG failure from it.
- Switch EN/ES and confirm explanatory/remediation copy is translated while HTML tokens remain unchanged.

### WCAG 1.4.12 Text Spacing

- Analyze direct visible text with inline `letter-spacing`, `word-spacing` or `line-height` declarations marked `!important` below the modeled ACT thresholds and confirm `FT-REVIEW-016` identifies only the applicable property.
- Confirm normal-priority declarations, CSS-wide values such as `inherit`/`unset`/`revert`, code-like contexts and non-rendered text are not reported by this bounded detector.
- For `line-height`, confirm a genuine soft wrap is required and authored line breaks alone do not establish applicability.
- Manually apply the complete WCAG text-spacing set together, including paragraph spacing, and verify content/functionality is not lost; do not treat the automated subset as complete 1.4.12 conformance proof.

### WCAG 1.4.10 Reflow

- Set the inspected page to an effective `320` CSS px width with browser zoom or a narrow viewport, rerun Analyze without resetting that state and confirm `FT-REVIEW-024` becomes applicable.
- Use ordinary navigation or content that forces horizontal document overflow and confirm the REVIEW preserves viewport size, writing mode, scroll extent, overflow pixels and useful protruding selectors.
- Clip visible text or an interactive control with `overflow: hidden/clip` and confirm partial/complete clipping plus the responsible ancestor are preserved in the finding and JSON export.
- Repeat with a CSS-hidden desktop alternative and a visible responsive replacement; confirm the hidden alternative is not reported merely because it exists in the DOM.
- Repeat with a data table, SVG/canvas graphic, video or embedded application as the only two-dimensional surface and confirm it is not automatically treated as a failure/review target.
- Test above the threshold and confirm the rule is inapplicable; test a clean layout at the threshold and confirm only a bounded PASS is recorded.
- Switch EN/ES and confirm title, explanation, measured evidence and remediation are localized while selectors and numeric geometry remain unchanged.
- Manually traverse all content and controls after zooming; confirm the product does not claim complete WCAG 1.4.10 coverage or reset the page's zoom.

### WCAG 1.4.1 Use of Color — inline links

- Analyze a native link inside a prose paragraph whose only distinction is a text color less than `3:1` from the adjacent non-link text; confirm `FT-REVIEW-025` reports REVIEW with both colors, the measured ratio and stable link/context selectors.
- Repeat with an underline, bold/italic/different-size treatment, visible boundary, generated cue or graphic icon and confirm the bounded observation records PASS rather than a review.
- Repeat with a color difference of at least `3:1`, equal link/surrounding colors, a standalone link and a link inside navigation/menu/toolbar context; confirm only the applicable bounded cases are counted.
- Exercise translucent, image/gradient, filtered and different-background cases and confirm unresolved visual rendering is omitted rather than guessed.
- Switch EN/ES and confirm title, explanation, evidence and remediation are localized while selectors, RGB colors and ratios remain canonical.
- Manually verify normal, hover and focus presentation plus non-link color semantics such as errors, required fields, charts and state indicators; confirm the product does not claim complete WCAG 1.4.1 coverage.

### WCAG 2.2.2 Pause, Stop, Hide — moving content

- Analyze a running Web Animation with changing keyframes, a total active duration over five seconds and separate visible page content; confirm `FT-REVIEW-026` reports REVIEW with the target, duration or indefinite repetition, animation name and changed properties.
- Repeat with a resolved total active duration of exactly five seconds or less and confirm the bounded duration expectation records PASS.
- Analyze rendered `<marquee>` content and looping/long/unresolved native `video[autoplay]` without native controls; confirm each applicable candidate remains REVIEW and preserves its motion source.
- Add native controls to autoplay video and confirm the bounded native-control expectation records PASS. Add a rendered, accessibly named custom control with `aria-controls` pointing to the moving target and confirm its selector is evidence but the result remains REVIEW until behavior is exercised.
- Confirm hidden targets, stopped/paused animations, effects without changing resolved keyframes, targets without observable parallel content and FocusTrace-owned overlays are omitted.
- Switch EN/ES and confirm title, explanation, evidence and remediation are localized while selectors, animation properties and numeric timing remain canonical.
- Manually test automatic start, more-than-five-second duration, essentiality, persistent pause/restart and the auto-updating branch. Confirm the product does not claim complete WCAG 2.2.2 coverage.

### WCAG 2.4.4 Link Purpose (In Context)

- Analyze exposed links named `Read more`, `Click here`, `Details`, `Más información` and `Aquí`; confirm `FT-REVIEW-027` reports REVIEW while a descriptive accessible name and an empty name do not enter this rule.
- Place generic links in a sentence/paragraph, nested list and table with explicit `headers` or `scope`; confirm structured evidence retains bounded context text, source kinds and stable selectors.
- Add a resolved `aria-describedby` target, including a hidden referenced description, and confirm its text is retained as programmatic context without converting the outcome to PASS.
- Run component analysis around a nested link and confirm neither links nor context outside the selected component enter the result.
- Switch EN/ES and confirm title, explanation, evidence, reference label and remediation are localized while selectors and source tokens remain canonical.
- Manually judge whether each name plus context communicates purpose, test screen-reader presentation and inspect generic wording outside the bounded vocabulary, Shadow DOM and frames. Confirm the product never presents a candidate as an automatic WCAG failure or a non-candidate as proof of conformance.

### WCAG 1.4.4 Resize Text

- Set browser zoom to 100%, analyze the full page and confirm `FT-REVIEW-028` reports that the session-only reference is ready without changing zoom.
- Set the same tab to 200% and analyze again; confirm the workflow reports a completed comparison and preserves the 100% reference for repeated checks.
- Cause one text/control to disappear without an equivalent rendered replacement, lose its accessible name, become clipped by `overflow: hidden/clip`, overlap an unrelated subject and shrink through responsive CSS; confirm each signal remains REVIEW with structured zoom, geometry and selector evidence.
- Replace a hidden responsive subject with rendered content exposing the same bounded text/name signature and confirm disappearance is suppressed. Confirm content already clipped/overlapped at 100% does not become a new resize candidate.
- Switch EN/ES and confirm title, explanation, evidence, reference label, workflow guidance and remediation are localized while selectors, zoom factors and ratios remain canonical.
- Test every browser-supported zoom step from 100% through 200%, images of text, captions, transformed/generated/Shadow DOM content, cross-origin frames and task functionality manually. Confirm a quiet comparison is never presented as complete WCAG 1.4.4 conformance.

### WCAG 1.4.3 Contrast in interactive text states

- Start Trace and exercise a real hover, pointer-active and keyboard-focus state whose rendered text contrast becomes insufficient; confirm `FT-RUNTIME-014` records contextual `REVIEW` evidence only after the trusted interaction.
- Repeat with sufficient final contrast and confirm the observed state stays silent.
- Exercise a transitioned state and confirm the measurement reflects the bounded settled style rather than an intermediate animation frame.
- Confirm static Analyze does not infer inactive authored selectors and that unvisited interactive states are not presented as passing.

### WCAG 1.4.11 Non-text Contrast in interactive states

- During Trace, exercise a control whose real hover state exposes a measurably insufficient boundary or simple graphic contrast and confirm `FT-RUNTIME-016` remains `REVIEW`.
- Reach an authored low-contrast focus outline with real keyboard navigation and confirm it is evaluated only after the trusted focus transition.
- Repeat with sufficient boundary/graphic/focus-indicator contrast and confirm the observed state stays silent.
- Confirm complex gradients, image-based or multi-color graphics and unresolved shadow-only indicators do not become invented deterministic failures.

### WCAG 1.4.13 Content on Hover or Focus

- Exercise additional content that appears after real hover or focus and confirm `FT-RUNTIME-015` associates it only through an explicit ARIA relationship or bounded geometric proximity.
- Verify a broken example that disappears while the pointer enters it can produce hoverability review evidence, while content that remains available under the pointer stays silent.
- Review representative persistence and overlapping-content dismissal scenarios; confirm Escape is treated as one diagnostic probe, not a universal requirement.
- Confirm every result remains contextual `REVIEW`, unexercised states are not inferred and EN/ES presentation keeps the technical evidence stable.

### WCAG 2.1.1 / 2.1.2 Keyboard and keyboard traps

- Start a manual Trace and exercise representative keyboard-operable controls; confirm keyboard evidence remains contextual and does not infer operability from pointer behavior alone.
- Exercise a deliberately trapped keyboard sequence and a valid escape/exit sequence and confirm FocusTrace keeps the result in `REVIEW` where human judgement is still required.
- Confirm programmatic FocusTrace actions do not masquerade as trusted user keyboard evidence.

### WCAG 2.4.1 Bypass Blocks

- Analyze a page with substantial repeated navigation before main content and a valid early keyboard-focusable same-document bypass link; confirm the review is suppressed when its target resolves to the main content area.
- Remove the observable bypass mechanism and confirm `FT-REVIEW-012` remains a contextual `REVIEW`, not automatic `FAIL`.
- Confirm a `<main>` landmark alone is not treated as proof that repeated blocks can be bypassed.
- Confirm the rule does not require the literal text “Skip to content”.

### WCAG 2.4.7 Focus Visible

- Start a manual Trace and move with a real `Tab` / `Shift+Tab` to a control whose keyboard focus state has no local visible pixel change; after the stable observation window, confirm `FT-RUNTIME-010` can appear as `REVIEW`.
- Repeat on a control with a clearly visible focus indicator and confirm the Focus Visible review is not emitted for that transition.
- Cause scroll, resize or visual animation/instability during the evidence window and confirm the observation is discarded rather than converted into a noisy result.
- Confirm automatic Focus Walk is not presented as equivalent evidence for this rule because programmatic `element.focus()` does not reliably reproduce keyboard `:focus-visible` modality.
- Inspect extension session/Memory/report data and confirm temporary PNG comparison captures are not persisted.

### WCAG 2.4.11 Focus Not Obscured (Minimum)

- Start Trace, move keyboard focus to a visible control, then scroll or introduce a fixed/sticky overlay so the already-focused control becomes completely covered without moving focus.
- Confirm FocusTrace records `FT-RUNTIME-002` as `REVIEW` and identifies the affected target.
- Confirm the finding exposes **How to fix / Cómo corregirlo** guidance and a verification step in both English and Spanish.
- Partially cover the focused control while leaving sampled visible area exposed and confirm FocusTrace does not report the complete-obscuration review solely for that partial overlap.
- Repeat with a visually transparent/non-rendered overlay and confirm it is not treated as a blocker.
- Confirm FocusTrace's own page overlay/highlight UI never becomes the reported covering element.

### WCAG 2.5.2 Pointer Cancellation

- Exercise a pointer interaction where activation occurs only after a complete click/tap and compare it with a control that commits behavior too early in the pointer sequence.
- Confirm FocusTrace records bounded interaction evidence as `REVIEW` rather than claiming it has resolved every Pointer Cancellation exception.
- Repeat with ordinary pointer movement/jitter and confirm unrelated pointer activity is not promoted into a cancellation finding.

### WCAG 2.5.7 Dragging Movements

- Start Trace on a representative drag-capable control and perform a deliberate pointer drag beyond the movement threshold; confirm `FT-RUNTIME-006` appears as `REVIEW`.
- Confirm the finding exposes equivalent single-pointer alternatives and validation guidance in both English and Spanish.
- Click the same control without dragging and repeat with only small pointer jitter; confirm neither interaction is classified as dragging.
- Drag a normal browser-draggable image/link that is not identified as a drag-capable interaction and confirm native `dragstart` alone does not create the review signal.
- Confirm the guidance preserves the possibility that dragging can be essential and does not claim an automatic WCAG failure.

### WCAG 2.5.8 Target Size (Minimum)

- Analyze a representative interactive target smaller than 24 × 24 CSS px and confirm `FT-WCAG-012` is presented as `REVIEW`, not deterministic `FAIL`.
- Confirm measured target geometry/spacing evidence is shown without claiming that FocusTrace resolved every WCAG exception.
- Check a sufficiently large target and confirm the rule can pass its modeled size expectation.
- Verify inline, equivalent-target, user-agent-control and essential-presentation possibilities are not incorrectly promoted to automatic failures.
- Switch EN/ES and confirm the criterion title, explanation and remediation remain semantically equivalent while selectors/numeric evidence stay unchanged.

### WCAG 3.1.2 Language of Parts

- Analyze rendered human-language text with an explicit valid nested `lang` and confirm the explicit-language expectation remains quiet/passing.
- Use an explicit invalid primary language tag and confirm `FT-WCAG-013` reports the deterministic invalid declaration.
- Confirm `code`, `pre`, `samp`, `kbd`, `var` and non-rendered source contexts are excluded from this bounded rule.
- Confirm FocusTrace does not infer missing language changes from prose alone and does not claim complete 3.1.2 coverage.

### WCAG 3.2.3 Consistent Navigation

- Run Site Audit over sampled pages with a repeated rendered navigation landmark whose complete normalized destination set is identical but whose order changes; confirm `FT-REVIEW-013` is produced as `REVIEW`.
- Repeat with the same order and confirm the review disappears.
- Repeat with only partial destination overlap or ambiguous duplicate matching blocks and confirm FocusTrace does not force a comparison.
- Preserve the possibility of user-initiated order changes; do not present this review as automatic WCAG failure.

### WCAG 3.2.4 Consistent Identification

- Run Site Audit over pages where one unique native link has the same exact HTTP(S) destination and same naming source but substantially different identification; confirm `FT-REVIEW-015` can be produced as `REVIEW`.
- Repeat with compatible labels such as `Cart` / `View cart` and numeric-only variants such as `Go to page 4` / `Go to page 5`; confirm those cases stay quiet.
- Repeat across different primary page languages, different naming sources or duplicate same-destination links and confirm the comparator declines the ambiguous comparison.
- Confirm an exact destination is described only as a strong function anchor, not proof that the complete functionality is semantically identical.

### WCAG 3.2.6 Consistent Help

- Run Site Audit over two sampled pages that expose at least two shared help mechanism categories in different relative order; confirm `FT-REVIEW-011` is generated as `REVIEW` for the affected comparison.
- Confirm the evidence preserves the observed order, comparison URL and compared order in both English and Spanish.
- Confirm the remediation guidance recommends keeping applicable help mechanisms in the same relative order and is available in both languages.
- Repeat with the same relative order and confirm the review disappears.
- Repeat with only one shared help mechanism category and confirm FocusTrace does not infer an order inconsistency from insufficient evidence.

### WCAG 3.3.1 / 3.3.3 Error Identification and Error Suggestion

- Analyze an explicitly invalid form control with a programmatically associated textual error and confirm the modeled error-identification review can stay quiet when sufficient observable evidence exists.
- Remove the associated error description and confirm FocusTrace produces conservative `REVIEW` evidence instead of assuming every invalid state is a deterministic WCAG failure.
- Exercise a correctable input error with and without an observable suggestion and confirm 3.3.3 remains contextual where FocusTrace cannot determine the complete applicability/exceptions automatically.
- Switch EN/ES and confirm form-error guidance is translated without modifying the inspected page's original error text.

### WCAG 4.1.3 Status Messages

- Start Trace, trigger a save/loading/result message that updates after a real user interaction without moving focus or changing context, and confirm an unexposed candidate can produce `FT-RUNTIME-007` as `REVIEW`.
- Repeat with `role="status"`, `role="alert"`, `role="log"`, active `aria-live`, native `<progress>`/`role="progressbar"` and active `aria-errormessage`; confirm valid programmatic exposure suppresses the review.
- Confirm `aria-busy="true"` alone does not suppress the review merely because the region is marked busy.
- Trigger a dialog, focus move, navigation/context change or modeled widget-state update and confirm ordinary context changes are not misclassified as status messages.
- Switch EN/ES and confirm FocusTrace's explanation/remediation is translated while the inspected page's original message text remains verbatim.

## Native browser i18n smoke

- Inspect the production Chrome, Edge and Firefox manifests and confirm `default_locale` is `en` and browser-facing name/description/action title use `__MSG_*__` references.
- Confirm `_locales/en/messages.json` and `_locales/es/messages.json` exist in every production build with matching keys.
- Load the extension in a browser/profile using English UI and verify browser-owned extension metadata resolves to the English catalog.
- Repeat with Spanish browser UI and verify the browser-owned metadata resolves to Spanish.
- Confirm changing the FocusTrace in-product language remains independent of the browser UI locale.

## Structure and element-location smoke

- From a fresh page/session, confirm merely opening **Structure** does not independently request access or start continuous DOM observation.
- Run **Analyze this page** and confirm the normal rule-engine result and bounded Structure snapshot are prepared from that same explicit full-page action.
- Open **Headings**, **Semantics** and **Metrics** after Analyze and confirm all three are already populated without requiring a second **Analyze structure** action.
- Change the inspected DOM, use the explicit Structure **Refresh** action and confirm semantic/metric evidence is updated on request rather than continuously.
- Open **Headings** and confirm the H1–H6 tree starts fully expanded, its indentation gutter remains transparent, and hierarchy signals, branch controls and page overlay still work.
- Review semantic suggestions for generic `div`/`span` controls or headings, inline click handlers and generic sequential tab stops; verify they are presented as suggestions/review signals rather than automatic WCAG failures.
- Confirm Metrics reports the current accessibility-oriented groups: headings, semantic regions, lists, forms, buttons, links, form controls, tables and images.
- Test a large DOM and confirm safety limits produce a limited-snapshot notice instead of continuous processing or an unresponsive panel.
- Open **Report** after full-page analysis and confirm section 03 is **Document structure / Estructura del documento**, includes compact accessibility-oriented metrics and only headings that require review, and does not duplicate the complete heading tree.
- Confirm the report accordion cards share the same soft border treatment and the Document Structure header/metrics/separators have readable spacing without content sitting directly against divider lines.
- Open representative FAIL, REVIEW and WARNING findings and confirm the compact affected-element locator keeps the technical selector plus two location actions without restoring the removed inline HTML inspector.
- In the normal Chrome/Edge side panel, confirm **Highlight on page** works and **Inspect in DOM** remains visible but disabled with F12 → FocusTrace guidance.
- For a relationship finding such as `FT-WARN-018`, confirm the affected child and deterministic related-container context remain understandable without relying on `nth-of-type()` alone.
- Confirm severity attention lines keep readable spacing from badges/titles in Analyze, Report, Structure review cards and heading hierarchy signals.
- Export PDF and TXT from the same live session and confirm both reuse the available compact Structure evidence without triggering another DOM scan or exporting a full DOM tree.
- Run a component-scoped analysis and confirm the page-global Structure snapshot is cleared/not mixed into the component-only static report.

## DevTools and native DOM inspection smoke

### Chrome and Edge

- Install the production candidate and confirm the normal side panel still opens and works independently of DevTools.
- Open Developer Tools with F12 and confirm a **FocusTrace** tab appears.
- Run Analyze inside the DevTools panel and confirm Review, Structure, Trace and Report stay pinned to the inspected tab even if another browser tab becomes active.
- Use **Highlight on page** from a finding and confirm the visual overlay appears without leaving FocusTrace.
- Use **Inspect in DOM** and confirm DevTools switches to **Elements** and selects the exact affected node.
- Confirm native DOM inspection does not move real keyboard focus on the inspected page and does not call `element.focus()` as part of the reveal flow.
- Confirm the two action cells are contiguous with no blank gap in normal, hover and keyboard-focus states.
- Close/reopen DevTools and confirm FocusTrace reconnects to the newly inspected tab.

### Firefox 115+

- Install/update the candidate and confirm the normal Firefox sidebar works before granting any DevTools permission.
- Open FocusTrace Settings and confirm **Firefox DevTools integration** is offered as an explicit opt-in.
- Enable it, approve the optional `devtools` permission, then open/reopen Firefox Developer Tools with F12.
- Confirm a **FocusTrace** tab appears while the normal sidebar remains available.
- Run Analyze in the DevTools panel and confirm the workspace remains pinned to the inspected tab.
- Use **Highlight on page** and confirm the normal overlay works.
- Use **Inspect in DOM** and confirm Firefox selects the exact node in the native **Inspector**.
- Confirm native DOM reveal does not move the page's keyboard focus.
- Decline/remove the optional permission and confirm the normal Firefox sidebar remains functional while Inspect in DOM is unavailable outside DevTools.

## Multipage Report smoke

- Analyze two different URLs on the same site and confirm the active audit contains two page entries with their own review timestamps.
- Open the first review, then the second, and confirm only one saved review is expanded at a time.
- Confirm the current page can still use live page-location actions, current Trace and the current Structure snapshot.
- Open a historical page while another URL is active and confirm the historical review does not expose page-location controls that could target the current tab.
- Confirm historical Trace and Structure are labelled as unavailable rather than displayed as if zero/live evidence belonged to the saved page.
- Export an individual historical page PDF after changing tabs and confirm its saved static scan remains available without borrowing live Trace or Structure evidence.
- Delete one saved page review, confirm its analysis and crops are removed, and confirm deleting the final page removes the empty audit.
- Re-analyze one normalized URL and confirm it replaces that page's previous scan and audit screenshot evidence instead of adding a duplicate page.
- Export the audit PDF after navigating away from the first page and confirm saved visual crops still appear next to their matching findings when capture was available.
- Confirm the Report workspace warns that complete-audit images are collected page by page and identifies how many saved pages still need to be analyzed again.
- Confirm the audit PDF index links each reviewed page to its non-empty heading/failure/review/warning sections.
- Confirm the audit PDF index uses dotted leaders and calculated A4 page numbers rather than result counts.
- Repeat with capture unavailable/restricted and confirm the disabled image selector is replaced by the page-by-page guidance.
- Use **Start Over** and confirm the current session plus every saved audit and report are removed.
- Exercise enough large audit data to trigger the storage-bound tests/fixtures and confirm older history is pruned before the newest active review.
- Confirm the single-page PDF still exports current-session evidence independently of the audit PDF and that a large set of visual crops is bounded by payload size rather than an arbitrary finding-count cap.

## FocusTrace Memory smoke

- Confirm Memory is enabled by default after a clean installation/profile and that clearing **Remember accessibility history** persists the opt-out.
- Analyze a page with a visible deterministic failure and confirm the observation is stored locally without a separate opt-in step.
- Re-analyze after fixing that failure and confirm the resolved history shows useful visual context: a small saved preview when capture was possible, or a compact locator fallback when it was not.
- Confirm resolved cards no longer expose an opaque `Ref. XXXXX` identifier.
- Check that a saved preview remains usable by keyboard focus as well as pointer hover.
- Confirm disabling Memory stops new observations/comparisons without deleting existing local history.
- Mark a no-longer-reproduced finding as resolved and confirm its detailed preview/locator/history is removed while regression recognition remains available.
- Clear saved Memory history from Settings and confirm both observation history and resolved markers are removed.
- Inspect extension storage during the smoke test and confirm Memory does not persist full-page screenshots, page HTML or full DOM snapshots.
- Seed an observation older than 90 days and confirm it remains available; then exercise count limits and confirm the oldest retained evidence is replaced only because of capacity.
- In a disposable clean browser profile, export a Memory JSON containing an attached note, uninstall FocusTrace, reinstall it and confirm local Memory/preferences/audit history start empty; then import the exported JSON and confirm the supported Memory observation and note are restored.

## Auditor-note smoke

- Add, edit and remove a multiline note on a failure, a REVIEW, a WARNING and an ordinary Trace event; confirm the detected outcome, severity and counts never change.
- Reload/reopen the side panel and confirm notes remain attached to the current parent evidence.
- Confirm a full-page finding note updates the matching saved audit page and Memory observation without removing its saved visual crop.
- Export the single-page PDF/TXT, complete-audit PDF, Trace Markdown/JSON and Memory baseline JSON; confirm each applicable note remains associated with the correct finding/event and Trace JSON reports `schemaVersion: 2`.
- Remove a Trace interaction, saved audit page and Memory history in turn, and confirm their embedded notes disappear with the parent evidence.
- Confirm a previously exported file is unchanged after editing/removing the local note and review its contents before sharing.

## Scanner confidence

- Verify deterministic FAIL cases still reproduce on the target element.
- Verify contextual or visually ambiguous cases remain REVIEW instead of being promoted to FAIL.
- Re-test text contrast and non-text contrast on simple colors, gradients/images and native browser controls.
- Confirm color suggestions are only offered when foreground/background evidence is deterministic.
- Confirm a report generated from the same session matches the findings shown in Analyze and Trace.

## Firefox packaged-build smoke

The Firefox artifact remains experimental until the complete packaged-build checklist is accepted on Firefox 115+:

- Load `.output/firefox-mv3/manifest.json` or the `focustrace-firefox-dev` artifact from `about:debugging#/runtime/this-firefox`.
- Confirm clicking the FocusTrace toolbar action opens the Firefox sidebar.
- Run **Analyze this page** and confirm static findings plus Headings/Semantics/Metrics are prepared from the same explicit analysis.
- Open Structure, inspect Headings/Semantics/Metrics, change the page DOM, then use **Refresh** and confirm the snapshot updates while the sidebar remains responsive.
- Start a manual Trace, leave the sidebar, interact with the page, then return and confirm recording continued.
- Exercise a real keyboard Tab transition with and without a visible focus indicator; confirm Focus Visible evidence is either correctly reviewed or safely omitted when Firefox capture authority/evidence is unavailable, never fabricated.
- Run the automatic Tab walk and confirm the focus journey is populated without presenting that programmatic walk as equivalent Focus Visible evidence.
- Select a recorded focus step and confirm the current page highlight appears.
- Complete the Firefox DevTools/Inspector opt-in smoke above.
- Check Replay and Report against the same runtime session.
- Add at least two pages to a multipage audit, revisit the historical report and open its audit PDF.
- Navigate to another tab and back; confirm state remains scoped to the inspected tab while the active audit remains product-level history.
- Test a full navigation while Trace is recording and confirm instrumentation is restored.
- Change language and interface size, reload the sidebar and confirm both preferences persist.
- Reset the Trace session and confirm Analyze remains available.
- Check Firefox browser console/background errors before promoting Firefox from experimental to supported.

## Privacy and permissions

Chromium production permissions must remain:

- `activeTab`
- `scripting`
- `storage`
- `sidePanel`

Firefox required production permissions must remain:

- `activeTab`
- `scripting`
- `storage`

Firefox uses `sidebar_action` generated from the WXT sidepanel entrypoint rather than the Chromium `sidePanel` permission. Firefox may additionally list `devtools` under **optional permissions** for the explicit DevTools integration opt-in; it must not become a required permission.

Production builds must not declare required global host permissions. Optional HTTP/HTTPS host access may be requested only from an explicit page action and must remain documented in the README and privacy policy. The localhost/global visual-capture authority added by the E2E build is test-only and must not become a required production host permission.

Confirm [`PRIVACY.md`](../PRIVACY.md) still matches the actual product behavior, especially unified full-page Structure evidence, temporary in-memory Focus Visible captures, bounded multipage-audit visual context, auditor notes and exports, default-enabled Memory with user opt-out, optional Memory visual context, optional single-page report screenshot evidence, DevTools DOM selection, external services and sponsorship integration.

Before a browser-store submission, resolve the publication blockers in `STORE_SUBMISSION.md`: the public privacy-policy URL and public support/contact URL must be real, unauthenticated destinations rather than `TODO` placeholders.

Voluntary support is enabled through `https://github.com/sponsors/marcorm91`. Verify both the About support block and the compact global footer are keyboard accessible, retain visible focus at 200% zoom and open only that reviewed external HTTPS destination. Confirm the support link does not appear in printed/exported reports.

Before changing repository visibility, scan the **entire Git history**, not only the current tree, with a dedicated secret scanner. This repository checklist does not claim that historical commits have already been scanned. Example local tools include gitleaks or TruffleHog.

Also review generated build artifacts before attaching them to a GitHub release.

## Licensing and history review

- Confirm the intended current project license is `GPL-3.0-only` in `LICENSE`, `README.md` and package metadata.
- Confirm the project has the right to distribute all first-party code and assets under that license.
- Review third-party dependencies, copied snippets, generated standards snapshots and bundled assets for compatible licenses and required attribution.
- Review contributor history before accepting a relicense if any code was authored by people who have not granted compatible rights.
- The repository historically contained an MIT license. Changing the current project license does not revoke permissions already granted for historical versions that were actually distributed under MIT.
- Before making the full Git history public, decide deliberately whether to publish that historical license trail or publish a clean/squashed public history from a GPLv3-licensed release point. Do not rewrite shared history casually after public contributions begin.
- Confirm [`TRADEMARKS.md`](../TRADEMARKS.md) matches the desired treatment of the FocusTrace name and logo and does not imply a registered mark where none has been established.

A license change is a legal/project-governance decision, not merely a code-style change. If ownership or relicensing rights are unclear, resolve them before public release.

## Repository privacy audit

Before changing visibility:

- scan all reachable Git objects for credentials, API keys, tokens, private certificates and environment files;
- review commit author names/emails and issue/PR content for personal information you do not intend to publish;
- review GitHub Actions logs, artifacts and release assets that may become visible or linked from a public repository;
- verify `.gitignore` covers local environment files, keys, generated archives and test artifacts;
- rotate any credential that has ever been committed, even if it was later removed from the current tree;
- verify development fixtures do not contain copied customer/client data or proprietary page content.

## Public repository readiness

- Confirm `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `PRIVACY.md` and `TRADEMARKS.md` reflect the release.
- Confirm the README does not overclaim full WCAG/EN conformance or browser support.
- Confirm GitHub description, website and topics are set.
- Add current screenshots or a short demo of Analyze, Structure, Trace, the DevTools DOM workflow, auditor notes and default-enabled Memory.
- Verify author/contact links.
- Enable branch protection or an equivalent ruleset for `main`.
- Require the relevant CI checks before merge.
- Enable private vulnerability reporting after the repository becomes public when available.
- Review Dependabot/security-alert settings and enable the ones appropriate for a public extension project.
- Review issue and pull-request templates for public contributors.
- Decide whether discussions should happen in GitHub Issues, Discussions or both.
- Confirm `.github/FUNDING.yml` points only to the reviewed active GitHub Sponsors destination.

## Release

For the current candidate, the release version is **0.2.8** and the intended tag is **`v0.2.8`**.

- Confirm `package.json`, `package-lock.json` and all browser manifests report `0.2.8`.
- Confirm `tests/release-contract.test.ts` targets `v0.2.8` and passes.
- Confirm `docs/changelog/RELEASE_NOTES_0.2.8.md` and `docs/changelog/CHANGELOG.md` match the shipped behavior and limitations.
- Confirm the version shown in Settings comes from the installed manifest and displays `0.2.8` in the packaged candidate.
- Confirm the release commit is on `main` and CI is green on that exact commit.
- Build the production Chrome, Edge and Firefox MV3 artifacts from that commit.
- Smoke-test the unpacked production build in supported Chromium browsers, including F12 → FocusTrace → Inspect in DOM.
- Complete the Firefox packaged-build and optional DevTools/Inspector smoke checklist before describing Firefox as officially supported.
- Tag the exact approved commit as `v0.2.8`.
- Review the generated ZIPs before attaching/uploading them.
- Only then publish/distribute the release artifacts or submit the updated packages to browser stores.

After publishing 0.2.8, update the candidate version at the top of this checklist when preparing the next release rather than copying a version-specific checklist.
