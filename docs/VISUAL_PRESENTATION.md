# Viewport, zoom, reflow and visual presentation

This document is the methodology companion for FocusTrace viewport and visual-presentation checks. It complements `docs/RULES.md` and `docs/SEVERITY-AUDIT.md` so page-level zoom/orientation rules can stay documented without mixing them into runtime keyboard guidance.

## Viewport zoom

`FT-WCAG-021` evaluates the bounded syntax covered by ACT `b4f0c3` for WCAG 1.4.4. It applies to `meta[name="viewport"]` declarations that author `user-scalable` or `maximum-scale`.

- `user-scalable=no` is a deterministic FAIL for the implemented zoom expectation.
- A finite non-negative `maximum-scale` below `2` is a deterministic FAIL.
- `maximum-scale=yes` follows the ACT/browser parsing expectation that it resolves to `1` and therefore FAILs the bounded 200% expectation.
- Negative maximum-scale values are treated as dropped rather than as a zoom restriction.
- Unresolvable non-negative values remain REVIEW rather than being converted into a failure by guesswork.

A PASS means only that the tested viewport syntax does not block the ACT-observable 200% expectation. It does not prove complete WCAG 1.4.4 or 1.4.10 conformance. ACT explicitly notes that modern user agents can ignore authored viewport restrictions and that alternate text-resize mechanisms or content context can affect the complete criterion.

`FT-REVIEW-041` is deliberately separate. A finite `maximum-scale` from `2` up to but not including `5` is retained as a **minor REVIEW** for larger low-vision enlargement compatibility. Five-times zoom is not presented as a WCAG requirement. Restrictions already reported by `FT-WCAG-021` are not duplicated as `FT-REVIEW-041` findings.

## Reflow and 200% resize

Existing evidence remains authoritative:

- `FT-REVIEW-024` checks the current narrow viewport at the WCAG reflow threshold, preserving tables, graphics, media, embedded applications and other two-dimensional surfaces as contextual exceptions.
- `FT-REVIEW-028` compares a session-only 100% baseline with the same page at 200% browser zoom for disappearance, clipping, overlap, lost control names and insufficient effective text scaling.

The #234 package does not duplicate those workflows. It adds authored viewport restrictions around them so syntax-level zoom barriers and observed browser behavior remain distinct evidence.

## Orientation

`FT-REVIEW-042` implements a bounded subset of ACT `b33eff` for WCAG 1.3.4. FocusTrace inspects accessible CSSOM rules and looks for visible elements whose `transform` or `rotate` value is authored under an `(orientation: portrait)` or `(orientation: landscape)` media query and resolves to an approximately 90°/270° Z-axis rotation.

The evaluator recognizes `rotate()`, `rotateZ()`, two-dimensional `matrix()`, `matrix3d()` and the CSS `rotate` property where a quarter-turn can be resolved reliably. Stylesheets whose CSSOM is inaccessible are skipped rather than treated as clean evidence. Traversal is bounded to 100 stylesheets, 5,000 CSS rules and 50 matched elements.

Every orientation candidate remains **REVIEW**, not automatic FAIL. WCAG permits an essential-orientation exception, and the page may provide a control or script-driven alternative that cannot be proven from the static CSS candidate alone. Non-quarter-turn stylistic rotations are ignored by this bounded detector.

## Stacking and contrast conservatism

Text and non-text contrast continue to use the existing color evaluator. Complex gradients, images, opacity, filters and blend modes remain unresolved rather than being promoted to deterministic failures.

The #234 package adds a real-browser stacking guard for deterministic contrast failures. When `document.elementsFromPoint()` shows a separately stacked painted element behind the target, FocusTrace downgrades that measured FAIL to REVIEW because the effective rendered backdrop cannot safely be reconstructed from the target's ancestor background chain alone. The rule-result counters are updated so the scan remains internally consistent.

This guard is bounded to the first 100 contrast failures in a scan and never stores screenshots, page pixels or arbitrary background content. It prefers a false negative/review over a false deterministic contrast failure.

## Severity decisions

- `FT-WCAG-021` — **moderate** FAIL/REVIEW/PASS. A blocked 200% enlargement can materially affect low-vision access, while the current mobile-browser impact is lower than older implementations and the detector is limited to viewport syntax.
- `FT-REVIEW-041` — **minor** REVIEW/PASS. This is a larger-zoom compatibility/usability signal, not an additional WCAG conformance threshold.
- `FT-REVIEW-042` — **serious** REVIEW. Effective orientation locking can be a substantial barrier, but essential-orientation and alternate-control context keeps the final judgement manual.

## Privacy and performance

All checks run locally. The package reads only viewport metadata, bounded CSSOM declarations, computed visibility/paint information and existing compact scan findings. It does not retain field values, full DOM snapshots, screenshots or pixel buffers. Cross-origin/inaccessible stylesheet rules are not bypassed or fetched with additional permissions.
