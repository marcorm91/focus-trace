# Contrast analysis

FocusTrace includes WCAG 2.2 **1.4.3 Contrast (Minimum)** and **1.4.11 Non-text Contrast** in the normal **Analyze page** scan. Contrast is not a separate product mode: findings are grouped under the Contrast area alongside names/semantics, forms, structure, keyboard and ARIA findings.

## Automated text contrast

`FT-WCAG-010` evaluates DOM text when the rendered foreground and background can be resolved from computed styles.

- normal text requires at least `4.5:1`;
- large text requires at least `3:1`;
- large text is treated as at least `24px`, or at least `18.667px` with computed font weight `700` or greater.

Each deterministic result stores structured evidence:

- measured contrast ratio;
- required contrast ratio;
- computed foreground;
- computed background;
- font size;
- font weight;
- whether the text qualifies as large text.

Generated `::before` and `::after` content is classified before it enters the text-contrast model. Human-language generated text remains under `FT-WCAG-010`, while icon-font private-use glyphs, known icon-font families, and standalone Unicode symbols are excluded from WCAG 1.4.3 text failures. A character used as a visual symbol is non-text information even though CSS renders it through a font.

## Conservative review boundary

FocusTrace does not manufacture a failure when the final pixels cannot be derived safely. It returns `REVIEW` for cases involving background images/gradients, opacity, blending, filters, or unresolved computed backgrounds.

The evidence represents what the browser exposes through computed styles at scan time; it is not a screenshot/pixel sampler.

## Non-text contrast

`FT-WCAG-011` evaluates bounded WCAG 2.2 **1.4.11 Non-text Contrast** evidence at `3:1` where FocusTrace can identify a relevant graphical or UI cue. Simple SVG icon colors can be measured deterministically; CSS/image-based graphics, standalone graphics whose necessity depends on context, and other ambiguous cases remain `REVIEW` rather than manufactured failures.

Generated icon-font or symbolic content is therefore not forced through the `4.5:1` normal-text threshold. When it is the identifying cue of an interactive control, the existing non-text contrast model can preserve it as graphical review evidence instead.

## Generated icons and accessibility semantics

CSS pseudo-elements are not DOM nodes, so `role`, `aria-label`, and `aria-hidden` cannot be applied directly to `::before` or `::after`. FocusTrace must evaluate semantics on the real host/control instead of recommending impossible ARIA on the pseudo-element.

- An icon-only button or link needs an accessible name on the control; the generated icon does not inherently need `role="img"`.
- A decorative icon should not be exposed as a meaningful image merely to satisfy a heuristic.
- A standalone meaningful image-like icon may use `role="img"` and an accessible name on a real DOM element when that accurately represents the author's intent.
- Whether an ambiguous generated symbol is decorative or required information can depend on context, so FocusTrace should prefer `REVIEW` over inventing a missing-`role="img"` failure.

Accessible-name rules remain responsible for deterministic failures when an interactive control itself has no accessible name.
