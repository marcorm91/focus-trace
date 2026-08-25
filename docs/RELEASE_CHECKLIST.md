# FocusTrace v0.1.0 release checklist

Use this checklist before making the repository public or publishing a release build.

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

Production builds must not request global host permissions. The localhost host permission used by E2E is test-only.

Before changing repository visibility, scan the **entire Git history**, not only the current tree, with a dedicated secret scanner. This repository checklist does not claim that historical commits have already been scanned. Example local tools include gitleaks or TruffleHog.

Also review generated build artifacts before attaching them to a GitHub release.

## Public repository readiness

- Confirm `README.md`, `LICENSE`, `CONTRIBUTING.md` and `SECURITY.md` reflect the release.
- Confirm the README does not overclaim full WCAG conformance or browser support.
- Confirm GitHub description, website and topics are set.
- Add current screenshots or a short demo of Analyze and Trace.
- Verify author/contact links.
- Enable private vulnerability reporting after the repository becomes public when available.

## Release

- Confirm `package.json`, `package-lock.json` and all browser manifests report `0.1.0`.
- Confirm the release commit is on `main` and CI is green.
- Build the production Chrome, Edge and Firefox MV3 artifacts from that commit.
- Smoke-test the unpacked production build in supported Chromium browsers.
- Complete the Firefox experimental smoke checklist before describing Firefox as officially supported.
- Tag the exact commit as `v0.1.0`.
- Write release notes that distinguish automated FAIL, REVIEW and runtime evidence.
- Only then change repository visibility or publish/distribute the release artifact.
