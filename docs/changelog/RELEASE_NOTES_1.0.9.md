# FocusTrace 1.0.9

Maintenance release based on main at `d639fb6b617dace98fbc23623be828f70cf5b1b0`.

## Corrections and efficiency

- Compare pointer-target spacing within the owning document; same-origin iframe coordinates no longer create false overlap reviews against controls in other documents. Component scans keep same-document outside neighbors.
- Read target geometry and computed style once per evaluation, remove redundant quadratic target deduplication, and discard snapshots between scans.
- Stop enumerating composed-tree siblings immediately when the shared traversal budget is reached, avoiding eager allocation of unused child arrays.
- Preserve actual offscreen coordinates for backdrop overlap checks instead of sampling unrelated viewport-edge pixels.
- Move unresolved contrast targets to REVIEW and clear unverifiable ratios/backgrounds while maintaining rule counters.
- Distinguish the 100-candidate, 800-style-read and local structural-search limits in Spanish contrast evidence.

## Session and persistence review

- Serialize complete multipage audit mutations in the background worker, including panel requests, Trace/note updates and clears. Concurrent panels no longer overwrite each other's saved pages.
- Remove closed-tab sessions after already accepted pending writes drain.
- Reject stale session refreshes, obsolete previous-tab action responses and old audit-store reads. Preserve selection when language/presentation callbacks change and cancel delayed scope decisions after a tab switch.
- Add 15 executable unit regressions/compatibility checks and a Chromium E2E scenario with concurrent audit writers in two panels.

## Compatibility

The existing iframe-ignore preference and Firefox contrast budgets remain in place. This release adds no dependency, permission, storage format, telemetry or remote service.

## Validation

Regression tests cover frame coordinate isolation, component neighbors, single-read geometry with fresh subsequent scans, traversal stopping, offscreen backdrops, missing contrast targets and Spanish limit evidence. All nine added regression cases fail against the original main implementation and pass with these corrections. The initial scanner review passed 1,430 unit tests locally, coverage thresholds, standards/capability/i18n/dead-code validators, TypeScript, lint and Chrome/Edge/Firefox production builds with manifest and bundle checks. Browser E2E execution was blocked locally by missing Playwright browser binaries; the browser download returned an invalid ZIP. The expanded session/persistence review also passes `npm run release:check`, including 1,445 unit tests, coverage, TypeScript, lint and all three production builds. The GitHub Actions browser jobs remain the release gate; do not interpret the local build results as a completed Firefox runtime validation. Production packages must not be built from E2E output.
