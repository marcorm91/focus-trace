# Changelog

All notable FocusTrace release changes are summarized here. Detailed release notes remain under `docs/RELEASE_NOTES_<version>.md`.

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
