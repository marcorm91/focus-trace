# Changelog

All notable FocusTrace release changes are summarized here. Detailed release notes remain under `docs/changelog/RELEASE_NOTES_<version>.md`.

## Unreleased

### Added

- Added editable and removable auditor notes to every static finding and Trace event. Notes remain separate from detected evidence and are included in applicable report, PDF, TXT, Markdown and JSON exports.
- Added parent-linked note synchronization for the current session, saved multipage reviews and existing FocusTrace Memory observations, including portable Memory JSON.

### Changed

- FocusTrace Memory is now enabled by default with an explicit Settings opt-out.
- Memory observations and compact resolved markers no longer expire by age. Existing per-scope, global and visual-preview capacity limits still replace older evidence to keep storage bounded.
- Trace evidence JSON now uses `schemaVersion: 2`; Memory baseline JSON uses version 2 while continuing to accept version 1 files.

### Privacy and reliability

- Auditor notes remain local unless the user explicitly exports them. Deleting a note or its retained parent removes the linked local copy; previously exported files are not retroactively changed.
- Clarified that browser-managed extension storage persists only while FocusTrace remains installed: uninstall removes local Memory, notes, preferences and saved audits automatically, while previously exported files remain available for later import where supported.
- Added unit and contract coverage for note normalization, editing/removal, parent lifecycle, local-history synchronization, export formats and default Memory behavior.

## 0.2.7

### Added

- Added a standards-coverage model for WCAG 2.2 A/AA that distinguishes automated, review, runtime, Site Audit, manual and not-covered evidence instead of treating a linked criterion as complete conformance coverage.
- Added EN 301 549 V4.1.1 (2026-09) clause-9 traceability for WCAG 2.2 A/AA criteria across the live coverage matrix and report/export guidance.
- Added conservative review coverage for prerecorded media alternatives/captions, audio description or media alternatives, live captions, form error identification/suggestions and keyboard/pointer interaction behavior.
- Added a dedicated FocusTrace panel inside Chrome, Edge and Firefox Developer Tools while keeping the existing browser side panel / Firefox sidebar available.
- Added native DOM reveal from findings: DevTools can select the exact affected node in Chrome/Edge **Elements** or Firefox **Inspector** without moving keyboard focus on the inspected page.

### Changed

- Finding location now keeps two consistent actions: **Highlight on page** remains available everywhere, while **Inspect in DOM** is enabled inside DevTools and remains visibly unavailable with F12 → FocusTrace guidance outside that surface.
- The old in-card HTML/technical-selector inspector was removed in favor of compact target location plus browser-native DevTools inspection.
- The DevTools workspace reuses the existing Review, Structure, Trace and Report session and pins it to the inspected tab rather than creating a second scanner.
- Firefox 115+ packages the DevTools entrypoint too; its `devtools` access remains an optional permission that can be enabled explicitly from FocusTrace Settings.
- Release documentation and in-product instructions now explain the DevTools/DOM workflow and preserve the distinction between standards coverage evidence and WCAG/EN conformance.

### Privacy and reliability

- No backend or analytics pipeline was added, no `chrome.debugger` permission is used, and Chromium required permissions remain unchanged.
- Firefox DevTools access is optional rather than a new required install/update permission; page/capture host permissions remain optional under the existing model.
- Native DOM inspection changes only the browser inspector selection and does not call `element.focus()` or alter the inspected page's keyboard-focus state.
- Expanded contract, unit, browser-build and E2E coverage guards standards mapping, the new conservative review rules, cross-browser DevTools packaging and element-location actions.

See `docs/changelog/RELEASE_NOTES_0.2.7.md` for the full 0.2.7 notes and validation scope.

## 0.2.6

### Changed

- Added a shared affected-element inspector across Analyze/Review, Report and Structure so findings identify targets with tag, role, readable/accessibility label, id and classes before falling back to the raw CSS selector.
- Technical selectors are now secondary and copyable, with bounded contextual HTML available on demand instead of storing full DOM fragments.
- Finding pagination now keeps the inspected page highlight synchronized with the selected occurrence and labels overlays with the rule id plus occurrence number.
- Relationship findings can retain compact deterministic related-container context, including ARIA allowed-child cases such as FT-WARN-018.
- Severity attention lines now keep consistent spacing from card content across scan results, report accordions, Structure review cards and heading hierarchy signals.

### Privacy and reliability

- The new inspector requests live bounded HTML context only when the user expands it; full page HTML/DOM fragments are not persisted as finding evidence.
- Existing local-first behavior, optional page access and browser permission model remain unchanged.
- Unit, contract, build and browser E2E coverage guard the shared inspector, bounded context, page overlays and attention-line layout.

See `docs/changelog/RELEASE_NOTES_0.2.6.md` for the full 0.2.6 notes and validation scope.

## 0.2.5

### Added

- WCAG 2.4.1 Bypass Blocks conservative full-page review (`FT-REVIEW-012`).
- WCAG 3.2.3 Consistent Navigation conservative Site Audit review (`FT-REVIEW-013`).
- WCAG 1.3.5 Identify Input Purpose explicit-`autocomplete` review (`FT-REVIEW-014`, ACT `73f2c2`).
- WCAG 3.1.2 Language of Parts explicit-language validation (`FT-WCAG-013`, ACT `de46e4`).
- WCAG 3.2.4 Consistent Identification conservative Site Audit review (`FT-REVIEW-015`).
- WCAG 1.4.12 Text Spacing inline-`!important` ACT-subset review (`FT-REVIEW-016`, ACT `24afc2`, `9e45ec`, `78fd32`).
- WCAG 2.4.7 Focus Visible runtime review using real keyboard Tab transitions and bounded stable pixel comparison (`FT-RUNTIME-010`, ACT `oj04fd`).

### Changed

- **Analyze this page** now prepares the bounded Structure snapshot together with the normal full-page analysis so Headings, Semantics and Metrics are available from the same explicit run.
- Component-scoped scans clear page-global Structure evidence instead of mixing document-wide metrics into component results.
- Report accordions now share the same soft border treatment, with improved spacing around the Document Structure header, metrics summary and separators.

### Privacy and reliability

- Focus-visible captures are temporary, lossless visible-tab samples decoded and compared in memory only; they are not persisted to session storage, Memory, reports or exports.
- New rules preserve the deterministic `FAIL` vs contextual `REVIEW` boundary and deliberately suppress ambiguous evidence to reduce false positives.
- Production page access remains optional/user initiated; no backend or analytics pipeline was added.
- Expanded unit, contract and browser E2E coverage validates the new scanner, Site Audit, Structure and real-Tab Focus Visible paths.

See `docs/changelog/RELEASE_NOTES_0.2.5.md` for the full 0.2.5 notes, limitations and validation scope.

## 0.2.4

### Changed

- Structure > Headings now opens the complete H1–H6 hierarchy by default while retaining per-branch and global collapse/expand controls.
- New scans reset the outline to the fully expanded default so the complete document hierarchy is immediately available.

### Fixed

- Removed the unintended white surface from heading-row layout wrappers so the indentation gutter remains transparent in light and dark themes.

### Reliability

- Updated component and browser regressions for the expanded default, transparent row wrapper, repeated narrow-panel toggling and bounded native memory.
- No new production permission, backend, analytics or persisted data.

See `docs/changelog/RELEASE_NOTES_0.2.4.md` for the full 0.2.4 notes and validation scope.

## 0.2.3

### Fixed

- Prevented the Structure heading tree from triggering pathological browser layout work and excessive native memory use as nested H1–H6 branches were expanded.
- Preserved heading hierarchy, row alignment, expand/collapse controls and page-overlay behavior while replacing recursively nested layout grids with block-flow branch containers.

### Reliability

- Added browser regression coverage that expands every heading level at narrow and regular panel widths.
- Added a Chromium memory guard that verifies expanded heading branches stay within a bounded native-memory budget and that collapse restores the baseline DOM/listener footprint.
- No new production permission, backend, analytics or persisted data.

See `docs/changelog/RELEASE_NOTES_0.2.3.md` for the full 0.2.3 notes and validation scope.

## 0.2.2

### Added

- WCAG 3.2.1 On Focus runtime context-change review (`FT-RUNTIME-008`).
- WCAG 3.2.2 On Input runtime context-change review (`FT-RUNTIME-009`).
- Bilingual EN/ES evidence and actionable remediation for both runtime context-change rules.
- Positive/negative unit and browser E2E coverage for focus/input-triggered route, dialog and programmatic-focus changes.

### Changed

- Runtime context-change correlation now uses a bounded 1.2-second window and excludes separate user actions, explicit activation and ordinary sequential focus movement from stale attribution.
- Text-control causality preserves the originating `input` signal when a later blur-driven `change` event belongs to the same edit.
- Persisted runtime route evidence now retains route identity while redacting query strings, fragments and URL credentials before Trace/report/export storage.

### Privacy

- Context-change tracking records control identity and trusted event type, not the form-control value.
- Browser E2E coverage verifies that fictitious email/token values carried in query/hash URL data are not retained in runtime session evidence.
- No new backend, analytics pipeline or production permission.

See `docs/changelog/RELEASE_NOTES_0.2.2.md` for the full 0.2.2 notes and documented scope limitations.

## 0.2.1

### Added

- WCAG 2.5.8 Target Size (Minimum) conservative `REVIEW` analysis (`FT-WCAG-012`).
- WCAG 4.1.3 Status Messages runtime review (`FT-RUNTIME-007`).
- Native WebExtension EN/ES localization for extension name, description and toolbar action title.
- Dead-code validation with Knip.
- FocusTrace rule-contract and EN/ES parity validators.
- Per-file coverage thresholds for critical accessibility/runtime modules.
- GitHub Actions validation with actionlint.
- Browser manifest/build contracts and bundle-growth budgets.

### Changed

- Browser manifests now take their version from `package.json` instead of duplicating a hard-coded release version.
- Release validation now checks release documentation for the exact candidate version.
- Runtime status-message correlation was hardened for isolated-world mutation/click ordering without broadening the review heuristic.

### Maintenance

- Removed residual exports/helpers identified while introducing dead-code validation.
- Added regression coverage for conservative dragging-target classification and the new quality guards.
- No new production permissions, backend, analytics or privacy behavior.

## 0.2.0

### Added

- WCAG 2.4.11 Focus Not Obscured (Minimum) runtime review.
- WCAG 2.5.7 Dragging Movements runtime review.
- WCAG 3.2.6 Consistent Help multipage review.
- Shared bilingual actionable remediation for the new runtime and Site Audit findings.

### Changed

- Expanded runtime and multipage WCAG 2.2 review coverage while preserving the deterministic `FAIL` vs contextual `REVIEW` boundary.
- Extended English and Spanish presentation/remediation coverage.

See `docs/changelog/RELEASE_NOTES_0.2.0.md` for the full 0.2.0 notes.
