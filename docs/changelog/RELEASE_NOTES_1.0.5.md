# FocusTrace 1.0.5

FocusTrace 1.0.5 completes the Firefox page-access hotfix. Version 1.0.4 declared the optional Manifest V3 host permissions correctly, but Firefox could still reject the runtime request after the UI click had crossed React or another asynchronous boundary.

## Firefox page access

- Permission-sensitive page tools now start the optional HTTP/HTTPS access request directly from the native capture-phase click.
- If Firefox retains the optional host grant but a repeated request returns `false` without another dialog, FocusTrace now verifies the browser permission store before reporting that access was denied.
- The requested action consumes that same pending request instead of starting a second request after asynchronous UI work.
- The protected path covers Analyze, component analysis, Site Audit, Focus Walk, Trace start and Structure refresh.
- Production builds continue to avoid required global host access at installation.

## Validation hardening

- The fresh-install page-access contract now requires the capture-phase permission handoff.
- English and Spanish permission documentation describes Firefox's transient user-action requirement.
- Browser CI continues to validate the production Chrome, Edge and Firefox packages independently from the test-only E2E permission setup.

## Compatibility and privacy

Chrome and Edge behavior is unchanged. Existing preferences, saved audits, Trace evidence, notes, FocusTrace Memory data and export schemas remain compatible.

This release adds no required permission, backend, analytics or external transmission. The optional access grant continues to permit only local inspection of pages selected by the user.

No scanner rule, WCAG outcome, severity or conformance claim changes in this release.

## Validation

The 1.0.5 release candidate must pass TypeScript, lint, the complete unit and contract suite, capability validation, Chrome/Edge/Firefox production builds, generated-manifest validation, bundle budgets and browser E2E tests before tagging.

Generate production packages only from the approved release commit. E2E builds contain test-only permissions and must not be distributed.
