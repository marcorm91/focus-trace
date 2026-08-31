# Contrast state coverage

FocusTrace evaluates only the contrast of the state that is actually rendered when a scan runs. It does not synthesize pointer, focus, activation or control-state changes because doing so can trigger application behavior.

Authored selectors for inactive states such as `:hover`, `:active`, `:focus`, `:focus-visible`, `:checked`, `aria-expanded`, `aria-selected`, `aria-pressed` or `aria-checked` do not create a failure or a **Review** item. A CSS declaration alone is not rendered evidence: the final result can still change through the live cascade, inheritance, variables, backgrounds, opacity and compositing.

When one of those states is active at scan time, the normal contrast rules measure its computed foreground and rendered background. Any deterministic failure is reported with its ratio and the observed state is added to the evidence. To check a hover, expanded menu or pressed control, keep that state visible while running the analysis.

Inactive controls are excluded from required contrast checks in line with the WCAG exceptions for inactive user interface components.
