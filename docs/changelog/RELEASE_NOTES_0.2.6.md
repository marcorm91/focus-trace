# FocusTrace 0.2.6

FocusTrace 0.2.6 focuses on making accessibility findings easier to inspect and locate. The release does not broaden the permission model or change FocusTrace's local-first, non-certification positioning.

## Affected-element inspector

Analyze/Review, Report and Structure now share one affected-element inspector. Instead of presenting a raw CSS selector as the primary locator, FocusTrace prioritizes human-readable identity from the inspected target: element tag, ARIA role, readable/accessibility label, id and useful classes when available.

The technical selector remains available as secondary evidence and can still be copied for debugging. This keeps deterministic machine locators without forcing users to interpret paths such as `li:nth-of-type(4) > ul` before they understand what element is affected.

## Bounded contextual HTML

Findings can expose **View HTML / Ver HTML** on demand. FocusTrace queries the live inspected page only when the user opens that detail and returns a bounded contextual fragment rather than retaining full DOM content.

This is intended to answer “which element is this?” while preserving the existing storage/privacy boundary: full page HTML and arbitrary DOM fragments are not persisted in scan results, reports or FocusTrace Memory.

## Relationship findings

Where the engine can establish a deterministic relationship, the finding can preserve compact related-container context alongside the affected target. This is particularly useful for ARIA parent/child model findings such as `FT-WARN-018`, where understanding both the child role and its container is more useful than a selector alone.

FocusTrace does not invent related context when the relationship cannot be established safely.

## Page-location overlay

**Review on page / Revisar en la página** now carries the rule id and occurrence number into the page overlay. When a grouped finding contains multiple affected elements, moving between occurrences also moves the page highlight to the selected target.

The overlay additionally includes compact target identity when it can be read safely from the live element. Existing Structure group overlays continue to highlight their complete rendered target set.

## Visual spacing

Severity/attention lines now use consistent spacing from badges, titles and card content across scan results, report accordions, Structure review cards and heading hierarchy signals. This avoids the cramped presentation previously visible when a warning/review line sat immediately beside the heading content.

## Privacy and permissions

0.2.6 adds no backend, analytics pipeline or required installation-time host permission. Production page access remains optional and user initiated.

The affected-element inspector stores only compact target identity already associated with the finding. Live contextual HTML is requested on demand, bounded before returning to the side panel and not persisted as full DOM evidence.

## Browser targets

Release targets remain:

- Google Chrome 114+;
- Chromium-based Microsoft Edge;
- Firefox 115+ as an experimental release target pending the packaged-build smoke checklist.

## Validation before publishing

Before tagging the release, run the complete gate on the exact candidate commit:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

The final candidate must keep `package.json`, `package-lock.json`, generated browser manifests, release documentation and `tests/release-contract.test.ts` aligned on `0.2.6`. CI must be green on the exact commit intended for `v0.2.6`, and the manual checks in `docs/RELEASE_CHECKLIST.md` must be completed before publishing production packages.
