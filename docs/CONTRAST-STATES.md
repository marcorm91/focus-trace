# Contrast state coverage

FocusTrace evaluates the contrast of the state that is actually rendered when a scan runs. It does not synthesize pointer, focus, activation or control-state changes because doing so can trigger application behavior.

To avoid silently missing alternate visual states, FocusTrace also inspects readable author CSS for contrast-relevant state selectors. When a state such as `:hover`, `:active`, `:focus`, `:focus-visible`, `:checked`, `aria-expanded`, `aria-selected`, `aria-pressed` or `aria-checked` changes relevant color, background, border, outline, shadow, fill, stroke, opacity or filter properties and that selector is not currently active, the state is reported for **Review**.

An observed state is measured by the normal contrast rules and is annotated in its evidence. An unobserved authored state is not called a WCAG failure because FocusTrace has not measured its final rendered pixels.

Inactive controls are excluded from required contrast checks in line with the WCAG exceptions for inactive user interface components. Cross-origin stylesheets that the browser does not expose through CSSOM are not claimed as covered.
