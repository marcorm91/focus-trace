# FocusTrace release checklist

Current release candidate: **0.2.0**.

Use this checklist before publishing a release build or submitting an updated package to a browser store. Keep the candidate version above aligned with `package.json`, `package-lock.json`, the browser manifests and the release contract test.

## Automated gate

Run the complete local release gate:

```bash
npm run release:check:full
```

A release candidate is blocked if standards validation, TypeScript, unit tests, Chrome/Edge/Firefox MV3 builds or browser E2E tests fail.

CI must also be green on the exact commit that will be tagged.

The committed `package-lock.json` must remain synchronized with `package.json`, and CI/release packaging must install it with `npm ci` so the dependency graph cannot drift between builds of the same source commit.

## Accessibility self-audit

- Navigate the side panel/sidebar entirely with the keyboard.
- Confirm every visible control has a readable accessible name.
- Confirm focus remains clearly visible throughout Analyze, Structure, Trace, Replay, Report and Settings.
- Confirm the document language changes with the FocusTrace language setting.
- Switch FocusTrace to Spanish and inspect representative FAIL, REVIEW and WARNING findings, including Structure/Site Audit/reference details; user-facing scanner/standards prose should be Spanish while technical identifiers such as rule IDs, HTML/ARIA tokens, selectors, ratios and colors remain unchanged.
- Check the panel at 200% browser zoom and at its narrowest supported width.
- Check both light and dark system appearance.
- Check Windows/high-contrast or forced-colors behavior before public release when available.
- Run Analyze against representative fixtures and manually inspect any new REVIEW result for noise.
- Exercise at least one broken and one correctly managed dialog, SPA navigation and focus-restoration flow.
- Record a Trace, inspect Replay and Report, reset the session, then confirm runtime evidence is empty while the latest Analyze result remains available; start another Trace and confirm focus numbering restarts at step 1.

The automated side-panel E2E smoke test is a regression guard; it is not a substitute for the manual checks above.

## WCAG 2.2 runtime and Site Audit 0.2.0 smoke

### WCAG 2.4.11 Focus Not Obscured (Minimum)

- Start Trace, move keyboard focus to a visible control, then scroll or introduce a fixed/sticky overlay so the already-focused control becomes completely covered without moving focus.
- Confirm FocusTrace records `FT-RUNTIME-002` as `REVIEW` and identifies the affected target.
- Confirm the finding exposes **How to fix / Cómo corregirlo** guidance and a verification step in both English and Spanish.
- Partially cover the focused control while leaving sampled visible area exposed and confirm FocusTrace does not report the complete-obscuration review solely for that partial overlap.
- Repeat with a visually transparent/non-rendered overlay and confirm it is not treated as a blocker.
- Confirm FocusTrace's own page overlay/highlight UI never becomes the reported covering element.

### WCAG 2.5.7 Dragging Movements

- Start Trace on a representative drag-capable control and perform a deliberate pointer drag beyond the movement threshold; confirm `FT-RUNTIME-006` appears as `REVIEW`.
- Confirm the finding exposes equivalent single-pointer alternatives and validation guidance in both English and Spanish.
- Click the same control without dragging and repeat with only small pointer jitter; confirm neither interaction is classified as dragging.
- Drag a normal browser-draggable image/link that is not identified as a drag-capable interaction and confirm native `dragstart` alone does not create the review signal.
- Confirm the guidance preserves the possibility that dragging can be essential and does not claim an automatic WCAG failure.

### WCAG 3.2.6 Consistent Help

- Run Site Audit over two sampled pages that expose at least two shared help mechanism categories in different relative order; confirm `FT-REVIEW-011` is generated as `REVIEW` for the affected comparison.
- Confirm the evidence preserves the observed order, comparison URL and compared order in both English and Spanish.
- Confirm the remediation guidance recommends keeping applicable help mechanisms in the same relative order and is available in both languages.
- Repeat with the same relative order and confirm the review disappears.
- Repeat with only one shared help mechanism category and confirm FocusTrace does not infer an order inconsistency from insufficient evidence.

## Structure smoke

- Open **Structure** and confirm that merely entering the workspace does not request page access or generate a semantic/metrics snapshot.
- Open **Headings** inside Structure and confirm the existing H1–H6 tree, hierarchy signals, expand/collapse behavior and page overlay still work.
- Open **Semantics** or **Metrics**, run **Analyze structure** explicitly and confirm those views populate only after that action.
- Review semantic suggestions for generic `div`/`span` controls or headings, inline click handlers and generic sequential tab stops; verify they are presented as suggestions/review signals rather than automatic WCAG failures.
- Confirm Metrics reports the current accessibility-oriented groups: headings, semantic regions, lists, forms, buttons, links, form controls, tables and images.
- Test a large DOM and confirm safety limits produce a limited-snapshot notice instead of continuous processing or an unresponsive panel.
- Open **Report** after analyzing Structure and confirm section 03 is **Document structure / Estructura del documento**, includes compact accessibility-oriented metrics and only headings that require review, and does not duplicate the complete heading tree.
- Export PDF and TXT from the same live session and confirm both reuse the available compact Structure evidence without triggering another DOM scan or exporting a full DOM tree.
- Repeat the report flow without analyzing Structure and confirm the report remains passive and explains that accessibility-oriented Structure metrics/suggestions are not available.
- Run a component-scoped analysis and confirm page-global Structure evidence is not mixed into the component-only static report.

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

- Confirm Memory is still disabled by default after a clean installation/profile.
- Enable **Remember accessibility history**, analyze a page with a visible deterministic failure and confirm the observation is stored locally.
- Re-analyze after fixing that failure and confirm the resolved history shows useful visual context: a small saved preview when capture was possible, or a compact locator fallback when it was not.
- Confirm resolved cards no longer expose an opaque `Ref. XXXXX` identifier.
- Check that a saved preview remains usable by keyboard focus as well as pointer hover.
- Confirm disabling Memory stops new observations/comparisons without deleting existing local history.
- Mark a no-longer-reproduced finding as resolved and confirm its detailed preview/locator/history is removed while regression recognition remains available.
- Clear saved Memory history from Settings and confirm both observation history and resolved markers are removed.
- Inspect extension storage during the smoke test and confirm Memory does not persist full-page screenshots, page HTML or full DOM snapshots.

## Scanner confidence

- Verify deterministic FAIL cases still reproduce on the target element.
- Verify contextual or visually ambiguous cases remain REVIEW instead of being promoted to FAIL.
- Re-test text contrast and non-text contrast on simple colors, gradients/images and native browser controls.
- Confirm color suggestions are only offered when foreground/background evidence is deterministic.
- Confirm a report generated from the same session matches the findings shown in Analyze and Trace.

## Firefox experimental smoke

The Firefox artifact remains experimental until these checks pass on Firefox 115+:

- Load `.output/firefox-mv3/manifest.json` or the `focustrace-firefox-dev` artifact from `about:debugging#/runtime/this-firefox`.
- Confirm clicking the FocusTrace toolbar action opens the Firefox sidebar.
- Run Analyze and locate at least one finding on the inspected page.
- Open Structure, inspect Headings, then explicitly run **Analyze structure** and confirm Semantics/Metrics populate while the sidebar remains responsive.
- Start a manual Trace, leave the sidebar, interact with the page, then return and confirm recording continued.
- Run the automatic Tab walk and confirm the focus journey is populated.
- Select a recorded focus step and confirm the current page highlight/inspector appears.
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

Firefox production permissions must remain:

- `activeTab`
- `scripting`
- `storage`

Firefox uses `sidebar_action` generated from the WXT sidepanel entrypoint rather than the Chromium `sidePanel` permission.

Production builds must not declare required global host permissions. Optional HTTP/HTTPS host access may be requested only from an explicit page action and must remain documented in the README and privacy policy. The localhost host permission used by E2E is test-only.

Confirm [`PRIVACY.md`](../PRIVACY.md) still matches the actual product behavior, especially storage, on-demand Structure evidence, bounded multipage-audit visual context, optional Memory visual context, optional single-page report screenshot evidence, external services and sponsorship integration.

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
- Confirm the README does not overclaim full WCAG conformance or browser support.
- Confirm GitHub description, website and topics are set.
- Add current screenshots or a short demo of Analyze, Structure and Trace.
- Verify author/contact links.
- Enable branch protection or an equivalent ruleset for `main`.
- Require the relevant CI checks before merge.
- Enable private vulnerability reporting after the repository becomes public when available.
- Review Dependabot/security-alert settings and enable the ones appropriate for a public extension project.
- Review issue and pull-request templates for public contributors.
- Decide whether discussions should happen in GitHub Issues, Discussions or both.
- Confirm `.github/FUNDING.yml` points only to the reviewed active GitHub Sponsors destination.

## Release

For the current candidate, the release version is **0.2.0** and the intended tag is **`v0.2.0`**.

- Confirm `package.json`, `package-lock.json` and all browser manifests report `0.2.0`.
- Confirm `tests/release-contract.test.ts` targets `v0.2.0` and passes.
- Confirm `docs/RELEASE_NOTES_0.2.0.md` matches the shipped behavior and limitations.
- Confirm the release commit is on `main` and CI is green on that exact commit.
- Build the production Chrome, Edge and Firefox MV3 artifacts from that commit.
- Smoke-test the unpacked production build in supported Chromium browsers.
- Complete the Firefox experimental smoke checklist before describing Firefox as officially supported.
- Tag the exact approved commit as `v0.2.0`.
- Review the generated ZIPs before attaching/uploading them.
- Only then publish/distribute the release artifacts or submit the updated packages to browser stores.

After publishing 0.2.0, update the candidate version at the top of this checklist when preparing the next release rather than copying a version-specific checklist.
