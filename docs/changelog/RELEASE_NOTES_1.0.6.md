# FocusTrace 1.0.6

FocusTrace 1.0.6 reduces false positives and unnecessary review noise in heading structure, link metadata and contrast analysis.

## Heading structure

- Native `h1`–`h6` elements are counted once even when authors redundantly add `role="heading"` and `aria-level`.
- The heading outline continues to use the native heading level for native heading elements.
- Equivalent ARIA heading semantics on non-heading elements remain available for structural review without duplicating native nodes.

## Redundant link titles

- Links whose `title` exactly repeats their visible link text are surfaced as semantic REVIEW guidance rather than as WCAG failures.
- Supplementary `title` values that provide different information are not flagged by this check.
- The recommendation is to remove redundant tooltips while preserving useful complementary information where it genuinely adds context.

## Contrast with image and stacked backdrops

- The normal scanner now applies the existing stacking-aware contrast policy.
- Absolute/fixed painted layers and image/media elements behind text are treated as possible rendered backdrops.
- When the final composed background cannot be resolved deterministically, FocusTrace no longer reports a contrast FAIL based on an unrelated ancestor color.
- Uncertain cases are downgraded to REVIEW and unreliable ratio/background values are removed from the retained contrast evidence.

This intentionally does not attempt to infer a single contrast ratio from arbitrary photographs, gradients or composited imagery. Those cases still require visual review.

## Compatibility and privacy

No required browser permission, backend, analytics, persistent storage schema or export schema is added by this release.

Existing audits, Trace evidence, notes, FocusTrace Memory data and exports remain compatible.

## Validation

The 1.0.6 release candidate should pass TypeScript, lint, unit/contract tests, capability validation, production Chrome/Edge/Firefox builds, generated-manifest validation and bundle budgets before tagging.

Generate production packages only from the approved release commit. E2E builds contain test-only permissions and must not be distributed.
