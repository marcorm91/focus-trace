# Contrast analysis

FocusTrace includes WCAG 2.2 **1.4.3 Contrast (Minimum)** in the normal **Analyze page** scan. Contrast is not a separate product mode: findings are grouped under the Contrast area alongside names/semantics, forms, structure, keyboard and ARIA findings.

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

## Conservative review boundary

FocusTrace does not manufacture a failure when the final pixels cannot be derived safely. It returns `REVIEW` for cases involving background images/gradients, opacity, blending, filters, or unresolved computed backgrounds.

The evidence represents what the browser exposes through computed styles at scan time; it is not a screenshot/pixel sampler.

## Non-text contrast

WCAG 2.2 **1.4.11 Non-text Contrast** is intentionally outside `FT-WCAG-010`. Automatically evaluating control boundaries, icons, states and focus indicators requires a dedicated visual/context model, including the user-agent appearance exception and determining which visual information is necessary to identify a component.

Until that dedicated rule exists, FocusTrace must not label uncertain non-text contrast as a deterministic WCAG failure.
