# FocusTrace 1.0.8

FocusTrace 1.0.8 is a performance hotfix for the stacked-background contrast safeguards introduced in 1.0.7.

## Firefox Analyze performance

The 1.0.7 contrast fallback could perform repeated CSSOM traversal and selector matching while checking complex visual backdrops. On large pages, especially in Firefox, that work could grow enough for Analyze to remain on **Processing** for an excessive amount of time.

1.0.8 removes that stylesheet-wide path entirely.

## Spatial-first backdrop verification

Contrast backdrop verification now:

- samples the actual paint stack with `elementsFromPoint()` at the target center and four interior points;
- falls back only when necessary to a bounded structural search;
- inspects at most 8 ancestor levels, 12 sibling branches per level and 24 descendants per sibling branch;
- caches computed styles and element geometry for the verification pass;
- caches pseudo-element backdrop conclusions across candidates;
- limits the pass to 800 computed-style observations in addition to the existing 100 contrast-candidate budget.

If a global or local budget is exhausted before a backdrop can be excluded safely, FocusTrace keeps the result conservative and moves the candidate to REVIEW rather than preserving an unverified deterministic FAIL.

## Contrast behavior preserved

The optimization keeps the protections added in 1.0.7 for:

- painted/image backgrounds in sibling branches;
- ancestor-level stacking contexts;
- full-inset painted `::before` / `::after` pseudo-elements;
- same-origin iframe targets resolved against their own document and viewport context.

## Compatibility and privacy

No new required browser permission, backend, analytics, storage category, export schema or remote service is introduced.

Existing audits, Trace evidence, notes, FocusTrace Memory data and exports remain compatible.

## Validation

The performance hotfix passed the feature-branch CI before merge, including browser E2E validation and the critical test suite. The release candidate must also pass the complete 1.0.8 release pipeline before tagging.

Regression coverage now includes a large synthetic-page test that counts real `getComputedStyle()` calls and requires the backdrop verification pass to remain within its 800-observation budget.

Generate production packages only from the approved release commit. E2E builds contain test-only permissions and must not be distributed.
