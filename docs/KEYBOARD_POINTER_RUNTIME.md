# Keyboard and pointer runtime reviews

This document is the focused methodology and severity supplement for WCAG interaction evidence collected during Trace. It complements `docs/RULES.md` and `docs/SEVERITY-AUDIT.md`; the public capability inventory remains `README.md` / `README.es.md`.

The rules below run only while Trace is recording real trusted interaction. They emit **REVIEW**, never automatic **FAIL**, because FocusTrace can observe a strong runtime signal without proving every alternative path, exception, state or recovery mechanism required for complete WCAG conformance.

## `FT-RUNTIME-011` — Keyboard operability review

**Reference:** WCAG 2.1.1 Keyboard · EN 301 549 V4.1.1 §9.2.1.1.

FocusTrace observes a trusted pointer activation on a custom/non-native interactive target and checks whether that same target participates in the current sequential keyboard focus order. Native controls and targets already reachable by normal sequential focus are excluded.

A review is emitted only for the bounded case FocusTrace can demonstrate: pointer-driven interaction was observed on a custom target that is not sequentially keyboard reachable. This is evidence that the target itself may be mouse/pointer-only, not proof that the complete functionality lacks some separate keyboard-equivalent control elsewhere in the interface.

**Base impact:** serious. A pointer-only interaction can block keyboard users from performing functionality, but the observed target alone cannot prove that no equivalent keyboard path exists.

## `FT-RUNTIME-012` — Possible keyboard trap review

**Reference:** WCAG 2.1.2 No Keyboard Trap · ACT `a1b64e` · EN 301 549 V4.1.1 §9.2.1.2.

FocusTrace watches trusted standard `Tab` / `Shift+Tab` navigation and looks for repeated evidence that sequential keyboard navigation cannot progress normally. The detector can review repeated no-move Tab attempts and repeated short cycles of focus targets.

Normal wrapping across the complete page focus order is suppressed. Intentional focus containment inside an open modal dialog is also suppressed because a modal focus loop can be correct while the modal is active. The observation remains REVIEW because a non-Tab escape mechanism, documented user instruction, widget-specific navigation model or other contextual behavior may satisfy the criterion.

**Base impact:** serious. A real keyboard trap can prevent a keyboard user from leaving a component, but repeated observed focus alone still needs context before conformance can be judged.

## `FT-RUNTIME-013` — Pointer Cancellation review

**Reference:** WCAG 2.5.2 Pointer Cancellation · EN 301 549 V4.1.1 §9.2.5.2.

FocusTrace observes trusted pointer sequences and snapshots a bounded set of activation-like state signals on the target. It reviews evidence when the action appears to take effect during `pointerdown`, before a normal `pointerup`, or remains committed when a `pointercancel` is observed.

The detector does not retain a full pointer-coordinate trail. It also does not claim to determine every WCAG exception, whether the down-event is essential, whether completion on up is impossible, or whether a later undo/reversal mechanism is available. Those questions remain manual.

**Base impact:** moderate. Premature activation can cause accidental actions for users with motor impairments, while valid exceptions and recovery mechanisms can make the observed pattern conforming.

## `FT-RUNTIME-014` — Interactive text contrast review

**Reference:** WCAG 1.4.3 Contrast (Minimum) · EN 301 549 V4.1.1 §9.1.4.3.

FocusTrace complements the default-state static contrast scan by measuring text contrast while a real interactive state is actually rendered during Trace. The initial runtime scope includes pointer hover, pointer active, keyboard focus/focus-visible reached through a real Tab transition, and rendered checked/expanded/selected/pressed state variants after user activation.

The detector does not infer a failure merely because CSS contains an inactive selector such as `:hover`. It waits for a bounded transition-settle window, verifies that the state is still active, then uses the live computed foreground/background colors and rendered font size/weight. A low measured ratio is recorded as REVIEW because the evidence covers the observed state only; FocusTrace has not exercised every possible state, application path or WCAG applicability branch.

**Base impact:** serious. Text can become unreadable only during interaction even when the default state passes, which can block users with low vision or reduced contrast sensitivity from understanding or completing the active control state.

The detailed implementation boundary is documented in `docs/INTERACTIVE_CONTRAST.md`.

## `FT-RUNTIME-015` — Content on Hover or Focus review

**Reference:** WCAG 1.4.13 Content on Hover or Focus · EN 301 549 V4.1.1 §9.1.4.13.

FocusTrace observes additional rendered content that becomes visible after a real trusted hover or a focus transition correlated with recent trusted user input. Candidate content is associated with the trigger only when an explicit `aria-controls`, `aria-describedby` or `aria-details` relationship exists, or when the newly visible content is within a bounded geometric proximity of the trigger. The observer is capped by element and concurrent-observation limits so Trace does not turn ordinary pointer movement into a page-wide inventory.

The runtime evidence is intentionally split around the three WCAG 1.4.13 requirements. **Hoverable** review evidence can be emitted when additional content disappears while the trusted pointer is moving into its last observed bounds. **Persistent** review evidence can be emitted when the additional content disappears while the originating hover/focus trigger remains active and no dismissal attempt was observed. **Dismissible** evidence is probed conservatively when overlapping additional content remains visible after Escape while the trigger state remains active; Escape is evidence of one attempted dismissal mechanism, not a universal WCAG requirement.

FocusTrace never synthesizes hover or focus for this rule and does not infer a failure from authored CSS alone. It records **REVIEW**, not FAIL, because alternate dismissal mechanisms, exceptions, timing behavior, relationship ambiguity and unobserved interaction states can still determine conformance.

**Base impact:** serious. Additional content that cannot be reached, retained or dismissed can obscure or remove information during pointer or keyboard interaction, especially for users with low vision, magnification or motor impairments.

## Shared guardrails

- Only trusted user interaction is considered; synthetic test events from the page are not treated as user evidence.
- Interactive contrast and hover/focus-content review do not synthesize hover and do not call `element.focus()` to manufacture focus evidence.
- The rules record compact target/evidence data and do not persist raw pointer trajectories.
- Absence of a review does not mean the referenced WCAG criterion is fully tested.
- The WCAG coverage matrix marks these runtime criteria as **partial**, **runtime**, **review** and still requiring manual review.
- EN 301 549 references are traceability mappings for the web requirement in clause 9, not certification or a complete EN 301 549 evaluation.
