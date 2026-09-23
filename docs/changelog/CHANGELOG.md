# Changelog

All notable FocusTrace release changes are summarized here. Detailed release notes remain under `docs/changelog/RELEASE_NOTES_<version>.md`.

## 1.0.8

### Fixed

- Fixed a severe Analyze performance regression in Firefox caused by repeated stylesheet-wide selector matching during stacked-background contrast verification.
- Replaced the expensive authored-CSS fallback with a spatial-first paint-stack check using the target center and four interior sample points.
- Reduced structural fallback work to bounded searches across up to 8 ancestors, 12 sibling branches and 24 descendants per branch.
- Added shared caching for computed styles, pseudo-element backdrop conclusions and geometry during the contrast verification pass.
- Added a hard per-scan budget of 800 computed-style observations; unresolved candidates become REVIEW instead of blocking analysis or retaining an unverified FAIL.
- Preserved the 1.0.7 contrast safeguards for sibling/ancestor backdrops, full-inset pseudo-elements and same-origin iframe rendering contexts.

### Validation

- Added regression coverage that caps computed-style work under a large synthetic page.
- Added coverage proving local search truncation becomes REVIEW rather than an unverified deterministic failure.

See `docs/changelog/RELEASE_NOTES_1.0.8.md` for release scope and validation boundaries.

## 1.0.7

### Added

- Added a persistent **Ignore iframe contents** scan-scope setting. When enabled, FocusTrace still evaluates the `iframe` / `frame` element itself but does not traverse or audit descendants inside the embedded document.

### Fixed

- Reduced contrast false positives when the rendered backdrop is supplied by painted descendants in sibling branches, ancestor-level stacking contexts, absolute/fixed image/media layers or full-inset `::before` / `::after` pseudo-elements.
- Prevented synthetic white-on-white contrast evidence from being reported when the actual composed backdrop cannot be resolved deterministically; uncertain cases now remain REVIEW without a fabricated ratio/background.
- Made contrast evaluation document-aware for same-origin iframes by resolving composed `|frame|` selectors and using each element's own `ownerDocument` / `defaultView`.
- Preserved same-origin iframe text candidates during contrast scanning instead of discarding them against the top-level document body.

### Changed

- Frame traversal can now be disabled at the composed-tree source rather than filtering iframe findings after analysis.
- When iframe contents are ignored, descendant-dependent frame checks are skipped while frame-host accessible-name and duplicate-purpose checks remain available.

See `docs/changelog/RELEASE_NOTES_1.0.7.md` for release scope and validation boundaries.

## 1.0.6

### Fixed

- Prevented native `h1`–`h6` elements from being counted twice when they redundantly also expose `role="heading"` and `aria-level`.
- Added semantic review guidance for links whose `title` attribute only repeats the visible link text, reducing redundant accessible-name noise.
- Applied stacking-aware contrast verification during normal scans so absolute/fixed image and painted backdrops no longer produce deterministic false failures against an unrelated ancestor background.
- Removed unreliable ratio/background evidence when the final composed backdrop cannot be resolved safely and downgraded those cases to REVIEW.

### Changed

- Structure metrics now deduplicate native headings and equivalent ARIA heading semantics at the element level.
- Contrast review evidence now explicitly preserves uncertainty for image/media backdrops instead of presenting an ancestor color as the rendered background.

See `docs/changelog/RELEASE_NOTES_1.0.6.md` for release scope and validation boundaries.

## 1.0.5

### Fixed

- Preserved Firefox's transient user activation by starting optional page-access requests directly from the native click, before React dispatch or awaited work.
- Recognized retained Firefox host grants when a repeated runtime request returns `false` without showing another permission dialog.
- Reused the same permission request across Analyze, component analysis, Site Audit, Focus Walk, Trace start and Structure refresh actions.
- Added a fresh-install regression contract for the Firefox permission click path.

See `docs/changelog/RELEASE_NOTES_1.0.5.md` for release scope and validation boundaries.

## 1.0.4

### Fixed

- Restored runtime page-access prompts in current Firefox Manifest V3 packages by declaring HTTP/HTTPS and visual-capture hosts through `optional_host_permissions`.
- Retained the legacy optional-host declaration for the experimental Firefox 115-127 target while keeping `devtools` optional and all global host access non-required.
- Tightened release contracts and generated-manifest validation so Firefox packages cannot silently omit the standard Manifest V3 optional-host field again.

See `docs/changelog/RELEASE_NOTES_1.0.4.md` for release scope and validation boundaries.

## 1.0.3

### Changed

- Persisted bounded Trace evidence with its matching page inside multipage audits so complete PDF reports place each recorded journey in the correct page section instead of relying on the currently open session.
- Paused an active Trace after a real document navigation and preserved its recorded evidence for an explicit resume, while keeping same-document SPA route changes in the active recording.

### Fixed

- Improved Trace disclosure spacing, card insets and chevron alignment so expanded evidence remains readable at narrow side-panel widths.
- Kept active Structure metric labels visible and added readable inset spacing to finding-management selects.

See `docs/changelog/RELEASE_NOTES_1.0.3.md` for release scope and validation boundaries.

## 1.0.2

### Fixed

- Prevented H1-H6 headings from being reported as empty when direct text is absent but meaningful accessible descendant content is available through ARIA naming or image alternative text.
- Kept decorative-only headings empty and preserved heading-level jump detection as an independent Structure signal.
- Extended `FT-REVIEW-012` so substantial navigation without an exposed main landmark remains a contextual WCAG 2.4.1 review instead of becoming silently inapplicable.
- Preserved broken early bypass-fragment candidates as review evidence even when no main landmark is exposed, while short navigation remains inapplicable.
- Kept the global header visible on the page background, moved page/component identity into the Review subtitle, protected Trace icons and counters at compact widths, and widened the cross-site audit dialog.
- Added a linked, page-numbered index to individual page and component PDF exports.

See `docs/changelog/RELEASE_NOTES_1.0.2.md` for release scope and validation boundaries.

## 1.0.1

### Fixed

- Unified guided/manual report controls, recording actions and finding-review reset styling with the existing theme.
- Improved report URL wrapping, guided-check layout, Structure section spacing and suggested-fix presentation.
- Completed Spanish audit titles and localized report evidence.
- Applied shared action styling to auditor notes, audit profiles, saved flows, runtime rechecks, dialog confirmations and Settings controls.
- Preserved red destructive confirmations, keyboard focus and disabled states across light/dark themes, and corrected theme tokens in Site Audit.
- Inset Settings and Report select indicators and aligned the Contact section with the other Settings fieldsets.

See `docs/changelog/RELEASE_NOTES_1.0.1.md` for release scope and validation boundaries.

## 1.0.0

### Added

- Expanded specialized accessible names, ElementInternals, ARIA relationships, landmarks, lists, tables, forms and embedded-content evidence.
- Added viewport, orientation and keyboard/navigation/motion checks plus bounded open-shadow, slot and same-origin frame traversal.
- Added guided manual workflows and APG widget-pattern tests, stable per-finding Recheck and saved local user-flow regression scenarios.
- Added finding lifecycle/state management, reusable audit profiles, bilingual remediation and expanded Site Audit comparison.
- Added versioned JSON/HTML/CSV/SARIF/JUnit exports, a shared local CLI, and Playwright/CI integrations.

### Fixed

- Prevented generated icon glyphs from being treated indiscriminately as ordinary text contrast.
- Corrected opaque RGB backdrop detection and retained unverified contrast candidates as REVIEW after the verification budget.
- Reserved exact lifecycle evidence before pairing changed findings.
- Strengthened composed-context/browser regressions and aligned local release validation with the Chromium/Firefox CI matrix.

### Release scope

- Preserves local-first operation, optional production page permissions, conservative outcomes and existing data/schema compatibility.
- Does not claim complete WCAG/EN certification or current full axe parity. Expert beta, manual AT/packaged-browser validation and store publication remain separately tracked under #250.

See `docs/changelog/RELEASE_NOTES_1.0.0.md` for the complete release notes and validation boundary.

## 0.2.9

### Added

- Added `FT-REVIEW-024` conservative reflow review for cross-axis document overflow and rendered text or controls clipped by unscrollable `overflow: hidden/clip` ancestors at the WCAG narrow-viewport threshold.
- Added `FT-REVIEW-025` review evidence for native inline links that may rely on color alone, including measured lightness difference against adjacent prose and observable persistent non-color cues.
- Added `FT-REVIEW-026` current-state review for persistent browser-exposed Web Animations, rendered `<marquee>` content and native autoplay video that may need a pause, stop or hide mechanism.
- Added `FT-REVIEW-027` bounded English/Spanish generic-link detection with programmatically determinable context from sentences, paragraphs, lists, tables and `aria-describedby`.
- Added `FT-REVIEW-028` guided same-document comparison between 100% and 200% browser zoom for newly unavailable content, lost control names, clipping, overlap and insufficient effective text enlargement.

### Changed

- Analyze now exposes localized workflow status for capturing, retaining and comparing the session-only Resize Text reference without changing the user's browser zoom.
- Structured JSON, Memory-compatible findings and reports can retain bounded evidence for the five new review rules, including selectors, ratios, animation timing, programmatic context, geometry and zoom factors where applicable.
- Standards Coverage and EN 301 549 clause-9 traceability now include the new partial evidence for WCAG 1.4.1, 1.4.4, 1.4.10, 2.2.2 and 2.4.4.

### Privacy and reliability

- Every new candidate remains `REVIEW`; quiet or bounded passing observations are not presented as complete WCAG conformance.
- Reflow exceptions, natural-language purpose, essential movement, functional equivalence and complete text-resize behavior remain subject to human verification.
- Scans use explicit candidate, traversal and finding limits. The Resize Text baseline is session-only and is invalidated for a different page document.
- No backend, analytics pipeline, required permission, persistent storage category or external communication was added.
- Added unit, contract and real-browser E2E coverage for all five review workflows.

See `docs/changelog/RELEASE_NOTES_0.2.9.md` for the full 0.2.9 notes and validation scope.

## 0.2.8

### Added

- Added `FT-RUNTIME-014` contextual text-contrast review for rendered hover, active, keyboard-focus and observed semantic states exercised through trusted interaction during Trace.
- Added `FT-RUNTIME-015` conservative runtime evidence for WCAG 1.4.13 Content on Hover or Focus, covering observable dismissibility, hoverability and persistence signals without inventing unvisited states.
- Added `FT-RUNTIME-016` contextual non-text contrast review for measurable control boundaries, simple graphics and authored focus indicators in real interactive states.
- Added editable and removable auditor notes to every static finding and Trace event. Notes remain separate from detected evidence and are included in applicable report, PDF, TXT, Markdown and JSON exports.
- Added parent-linked note synchronization for the current session, saved multipage reviews and existing FocusTrace Memory observations, including portable Memory JSON.
- Added the installed extension version below the support action in the side-panel footer.

### Changed

- FocusTrace Memory is now enabled by default with an explicit Settings opt-out.
- Memory observations and compact resolved markers no longer expire by age. Existing per-scope, global and visual-preview capacity limits still replace older evidence to keep storage bounded.
- Trace evidence JSON now uses `schemaVersion: 2`; Memory baseline JSON uses version 2 while continuing to accept version 1 files.
- Site Audit result presentation was split into focused report and finding components while preserving its bilingual semantics, actions and evidence model.

### Performance

- Static Analyze and Site Audit now inject only the core scanner; Trace-only observers load on demand, reducing emitted page-side JavaScript for a static scan by 44.6% in the final candidate.
- Review, Structure, Trace, Report, Instructions and Settings now load as separate side-panel workspace chunks, reducing initial side-panel assets by 45.5% and initial JavaScript by 73.2% in the final Chrome candidate.
- Trace coalesces ordinary event bursts over a 16 ms window into ordered per-tab storage writes while keeping breakpoint evidence immediate and flushing before page exit.
- The static scanner reuses identical root-scoped queries within one synchronous scan and reduces repeated whole-document `*` traversals from four to one.

### Fixed

- Visual evidence is now bound to the exact source tab, window and normalized document URL before and after capture; a tab switch or navigation discards the pixels instead of associating them with the wrong scan.
- Site Audit streams robots.txt and sitemap responses and enforces its 6 MB limit against bytes actually received, including compressed, chunked or incorrectly declared responses.

### Privacy and reliability

- The three new runtime rules observe trusted interactions only, remain `REVIEW`, do not synthesize hover/focus and add no permission or debugger access.
- Auditor notes remain local unless the user explicitly exports them. Deleting a note or its retained parent removes the linked local copy; previously exported files are not retroactively changed.
- Clarified that browser-managed extension storage persists only while FocusTrace remains installed: uninstall removes local Memory, notes, preferences and saved audits automatically, while previously exported files remain available for later import where supported.
- Release validation now uses lockfile-pinned local tools and cleans stale build output before packaging; project-wide production coverage floors complement the existing high-risk module thresholds.
- Added unit and contract coverage for note normalization, editing/removal, parent lifecycle, local-history synchronization, export formats and default Memory behavior.

See `docs/changelog/RELEASE_NOTES_0.2.8.md` for the full 0.2.8 notes and validation scope.

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
