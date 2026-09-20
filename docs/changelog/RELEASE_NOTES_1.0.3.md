# FocusTrace 1.0.3

FocusTrace 1.0.3 is a maintenance release that keeps Trace evidence associated with the audited page across navigation and improves compact side-panel presentation. It includes the changes merged after 1.0.2.

## Page-scoped Trace evidence

- Multipage audits now retain a bounded set of Trace events on the matching audited page.
- Complete audit PDFs render each retained Trace journey in that page's report section, preserving page order and avoiding association with whichever session happens to be open during export.
- Reanalyzing a page preserves its retained Trace evidence, while deleting an interaction or audit page removes the corresponding stored evidence.
- Trace events are matched by sanitized page URL and are attached only when the destination page is unambiguous within the active audit.
- Existing saved audits remain compatible; the added page-level Trace fields are optional.

## Navigation behavior

- Starting or resuming Trace records the current page and document identity.
- A real document navigation pauses recording, retains the collected journey and requires an explicit resume on the destination page.
- Same-document SPA route changes remain part of the active Trace instead of being mistaken for a full reload.
- Resuming after navigation continues the retained journey rather than clearing the previous events.
- The destination page still passes through the existing audit-scope decision before more evidence is recorded.

## Interface refinements

- Expanded Trace findings use clearer lateral padding, card insets and aligned disclosure chevrons at regular and narrow widths.
- Trace evidence content no longer sits against the right edge of its card.
- Active Structure metric buttons retain their text while highlighted and continue to toggle independently.
- Finding-management status selects include additional left inset so their value is not pressed against the field edge.

## Compatibility and privacy

Chrome, Edge and Firefox manifests inherit version 1.0.3 from the package metadata. This release adds no permissions, backend, analytics or external transmission.

Trace and audit evidence remains local to browser-managed extension storage unless the user explicitly exports it. Runtime export schema compatibility is preserved, and existing audit records without page-level Trace evidence continue to load normally.

No new FocusTrace rule ID or deterministic conformance claim is introduced.

## Validation

The page-scoped Trace and navigation changes include unit, contract and browser E2E coverage. The interface refinements include visual contract coverage for narrow layouts, active metric presentation and finding-state controls.

The 1.0.3 release candidate must pass CI and the complete release gate before tagging and packaging. Manual packaged-browser and assistive-technology validation remains tracked in `docs/RELEASE_CHECKLIST.md`. Generate production packages only from the approved release commit; E2E builds contain test-only permissions and must not be distributed.
