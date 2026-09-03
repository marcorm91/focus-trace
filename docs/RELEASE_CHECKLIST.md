# FocusTrace release checklist

Current release candidate: **0.1.3**.

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
- Confirm focus remains clearly visible throughout Analyze, Trace, Replay, Report and Settings.
- Confirm the document language changes with the FocusTrace language setting.
- Check the panel at 200% browser zoom and at its narrowest supported width.
- Check both light and dark system appearance.
- Check Windows/high-contrast or forced-colors behavior before public release when available.
- Run Analyze against representative fixtures and manually inspect any new REVIEW result for noise.
- Exercise at least one broken and one correctly managed dialog, SPA navigation and focus-restoration flow.
- Record a Trace, inspect Replay and Report, reset the session, then confirm runtime evidence is empty while the latest Analyze result remains available; start another Trace and confirm focus numbering restarts at step 1.

The automated side-panel E2E smoke test is a regression guard; it is not a substitute for the manual checks above.

## FocusTrace Memory 0.1.3 smoke

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
- Start a manual Trace, leave the sidebar, interact with the page, then return and confirm recording continued.
- Run the automatic Tab walk and confirm the focus journey is populated.
- Select a recorded focus step and confirm the current page highlight/inspector appears.
- Check Replay and Report against the same runtime session.
- Navigate to another tab and back; confirm state remains scoped to the inspected tab.
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

Confirm [`PRIVACY.md`](../PRIVACY.md) still matches the actual product behavior, especially storage, optional Memory visual context, optional report screenshot evidence, external services and sponsorship integration.

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
- Add current screenshots or a short demo of Analyze and Trace.
- Verify author/contact links.
- Enable branch protection or an equivalent ruleset for `main`.
- Require the relevant CI checks before merge.
- Enable private vulnerability reporting after the repository becomes public when available.
- Review Dependabot/security-alert settings and enable the ones appropriate for a public extension project.
- Review issue and pull-request templates for public contributors.
- Decide whether discussions should happen in GitHub Issues, Discussions or both.
- Confirm `.github/FUNDING.yml` points only to the reviewed active GitHub Sponsors destination.

## Release

For the current candidate, the release version is **0.1.3** and the intended tag is **`v0.1.3`**.

- Confirm `package.json`, `package-lock.json` and all browser manifests report `0.1.3`.
- Confirm `tests/release-contract.test.ts` targets `v0.1.3` and passes.
- Confirm the release commit is on `main` and CI is green on that exact commit.
- Build the production Chrome, Edge and Firefox MV3 artifacts from that commit.
- Smoke-test the unpacked production build in supported Chromium browsers.
- Complete the Firefox experimental smoke checklist before describing Firefox as officially supported.
- Tag the exact approved commit as `v0.1.3`.
- Write release notes that distinguish automated FAIL, REVIEW and runtime evidence and describe the opt-in Memory visual-context behavior accurately.
- Review the generated ZIPs before attaching/uploading them.
- Only then publish/distribute the release artifacts or submit the updated packages to browser stores.

After publishing 0.1.3, update the candidate version at the top of this checklist when preparing the next release rather than copying a version-specific checklist.
