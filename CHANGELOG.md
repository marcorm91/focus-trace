# Changelog

All notable FocusTrace release changes are summarized here. Detailed release notes remain under `docs/RELEASE_NOTES_<version>.md`.

## 0.2.3

### Fixed

- Prevented the Structure heading tree from triggering pathological browser layout work and excessive native memory use as nested H1–H6 branches were expanded.
- Preserved heading hierarchy, row alignment, expand/collapse controls and page-overlay behavior while replacing recursively nested layout grids with block-flow branch containers.

### Reliability

- Added browser regression coverage that expands every heading level at narrow and regular panel widths.
- Added a Chromium memory guard that verifies expanded heading branches stay within a bounded native-memory budget and that collapse restores the baseline DOM/listener footprint.
- No new production permission, backend, analytics or persisted data.

See `docs/RELEASE_NOTES_0.2.3.md` for the full 0.2.3 notes and validation scope.

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

See `docs/RELEASE_NOTES_0.2.2.md` for the full 0.2.2 notes and documented scope limitations.

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

See `docs/RELEASE_NOTES_0.2.0.md` for the full 0.2.0 notes.
