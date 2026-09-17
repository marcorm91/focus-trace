# FocusTrace 1.0.1

FocusTrace 1.0.1 is a maintenance release covering the interface and Spanish localization fixes merged after 1.0.0 in #285–#291.

## Interface consistency

- Guided and manual report checks, recording controls and finding-review reset actions follow the existing visual theme.
- Report URLs wrap more compactly; guided-check layout, subtitles and Structure section spacing are clearer.
- Suggested fixes have a clearer visual treatment.
- Auditor notes, audit profiles, saved-flow actions, runtime rechecks, Settings actions and audit/reset/delete dialogs share consistent borders, spacing, typography and shadows.
- Destructive dialog confirmations retain their red tint with the same structure as neutral actions.
- Shared controls preserve keyboard focus, disabled states and forced-colors handling. Component styles respect the existing CSS layer order.
- Remediation, saved flows and Site Audit use defined theme colors, including dark mode.
- Single-select indicators have an inset gutter in Settings and Report; forced-colors mode restores the native indicator.
- Contact uses the same fieldset and legend structure as the other Settings groups.

## Spanish localization

- Completed Spanish audit titles and localized report evidence while preserving canonical technical identifiers.

## Compatibility

Chrome, Edge and Firefox manifests inherit version 1.0.1 from the package metadata. This release does not add permissions, change storage or export schemas, or introduce new scanner rules. Existing local history and notes remain compatible. Firefox retains its documented packaged-browser/manual-validation boundary.

## Validation

The merged theme PR #291 passed CI, including unit tests, extension E2E tests, Chromium/Firefox scanner examples and Chrome/Edge/Firefox production builds. Those results describe the pre-release baseline; the 1.0.1 PR must pass CI on its own versioned commit.

The release contract verifies package/lockfile/browser version alignment and version-specific documentation. Manual packaged-browser and assistive-technology checks remain tracked in `docs/RELEASE_CHECKLIST.md`. This release preparation does not mark the outstanding #250 publication tasks complete.

Generate production packages from the approved release commit. E2E builds contain test-only permissions and must not be distributed.
