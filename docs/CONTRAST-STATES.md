# Contrast state coverage

FocusTrace evaluates the contrast of the state that is actually rendered when a scan runs. It does not synthesize pointer, focus, activation or control-state changes because doing so can trigger application behavior.

To avoid silently missing alternate visual states, FocusTrace also inspects readable author CSS for contrast-relevant state selectors. When a state such as `:hover`, `:active`, `:focus`, `:focus-visible`, `:checked`, `aria-expanded`, `aria-selected`, `aria-pressed` or `aria-checked` changes relevant color, background, border, outline, shadow, fill, stroke, opacity or filter properties and that selector is not currently active, the authored selector is reported once for **Review**, with one representative target and its matching-candidate count. Repeated nodes no longer manufacture repeated review cards for the same CSS obligation.

Geometry-only or invisible declarations such as outline width/offset/style changes with a transparent outline are not contrast evidence. FocusTrace leaves those out of WCAG 1.4.11 contrast review; a missing focus indicator belongs to the separate focus-appearance workflow.

An observed state is measured by the normal contrast rules and is annotated in its evidence. An unobserved authored state is not called a WCAG failure because FocusTrace has not measured its final rendered pixels.

Inactive controls are excluded from required contrast checks in line with the WCAG exceptions for inactive user interface components. Cross-origin stylesheets that the browser does not expose through CSSOM are not claimed as covered.
