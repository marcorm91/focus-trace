# FocusTrace 1.0.7

FocusTrace 1.0.7 improves contrast reliability for complex visual compositions and adds explicit control over whether same-origin iframe contents are included in scans.

## Contrast on composed visual backdrops

- Contrast verification now looks beyond the target's direct ancestor background chain when a visual backdrop may come from a separately stacked layer.
- Painted descendants inside sibling branches, ancestor-level stacking contexts, absolute/fixed image or media layers and full-inset painted `::before` / `::after` pseudo-elements are treated as possible rendered backdrops.
- When the final composed background cannot be resolved deterministically, FocusTrace no longer reports a synthetic contrast ratio against an unrelated white canvas or ancestor color.
- Those uncertain cases remain REVIEW, and unreliable ratio/background evidence is removed.

This remains intentionally conservative. FocusTrace does not infer a single deterministic contrast ratio from arbitrary photographs, gradients, overlays or other compositions that cannot be reduced safely to a resolved color.

## Same-origin iframe contrast

- Composed selectors crossing `|frame|` boundaries are resolved back to the actual element inside the nested document.
- Computed styles, geometry and backdrop checks use the target element's own `ownerDocument` and `defaultView`, avoiding coordinate/style mixing with the top-level page.
- Text candidates inside accessible same-origin frames remain eligible for contrast analysis when iframe contents are included.

Cross-origin, opaque or otherwise inaccessible embedded documents remain outside direct descendant inspection.

## Ignore iframe contents

Settings now includes **Ignore iframe contents / Ignorar contenido de iframes**.

The preference is disabled by default, preserving the existing scan behavior. When enabled:

- FocusTrace does not traverse or audit descendants inside embedded frame documents, including same-origin frames.
- The `iframe` / `frame` element itself remains in scope for host-level accessibility checks such as accessible name and duplicate-purpose review.
- Checks that require descendant inspection inside the frame, such as the bounded negative-`tabindex` focusability check, are skipped.
- The preference is stored locally in the browser profile and is applied at the composed-tree traversal source rather than as a post-scan result filter.

## Compatibility and privacy

No new required browser permission, backend, analytics, export schema or remote service is introduced.

The new iframe preference is local-only. Existing audits, Trace evidence, notes, FocusTrace Memory data and exports remain compatible.

## Validation

The fixes included in this release passed CI before release preparation, including workflow lint, hardening/critical coverage and browser E2E validation. The release candidate should also pass the full release pipeline, including TypeScript, lint, unit/contract tests, production Chrome/Edge/Firefox builds, generated-manifest validation and bundle budgets before tagging.

Generate production packages only from the approved release commit. E2E builds contain test-only permissions and must not be distributed.
