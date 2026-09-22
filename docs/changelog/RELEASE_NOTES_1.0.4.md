# FocusTrace 1.0.4

FocusTrace 1.0.4 is a Firefox compatibility hotfix. It restores the runtime page-access grant needed by Analyze, Structure, Trace and other explicit page-inspection actions in current Firefox Manifest V3 packages.

## Firefox page access

- Firefox 128+ packages now declare HTTP/HTTPS page access and temporary visual-capture access through the standard Manifest V3 `optional_host_permissions` field.
- FocusTrace continues to request access only from an explicit user action; global host access is not required at installation.
- The Firefox 115-127 compatibility declaration remains under `optional_permissions` so the existing experimental minimum version is not dropped by this hotfix.
- The optional `devtools` permission remains separate and is still requested only when the user enables the Firefox DevTools integration.

## Validation hardening

- The release contract now requires Firefox to emit the standard Manifest V3 optional-host field as well as the legacy compatibility declaration.
- Generated-build validation fails if either Firefox permission path is missing.
- The English and Spanish permission documentation describes the version boundary explicitly.

## Compatibility and privacy

Chrome and Edge behavior is unchanged. Existing local preferences, saved audits, Trace evidence, notes, FocusTrace Memory data and export schemas remain compatible.

This release adds no required global host permission, backend, analytics or external transmission. Granting optional page access allows local inspection of the sites selected by the user and does not change FocusTrace's local-first data policy.

No scanner rule, WCAG outcome, severity or conformance claim changes in this release.

## Validation

The 1.0.4 release candidate must pass TypeScript, lint, the complete unit and contract suite, capability validation, Chrome/Edge/Firefox production builds, generated-manifest validation, bundle budgets and browser E2E tests before tagging. The production Firefox package must additionally pass Mozilla `web-ext lint` and manual verification that an explicit Analyze action can grant page access.

Generate production packages only from the approved release commit. E2E builds contain test-only permissions and must not be distributed.
