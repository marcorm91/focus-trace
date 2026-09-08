# Keyboard and pointer runtime reviews

This document is the focused methodology and severity supplement for the WCAG interaction evidence introduced in the 0.2.7 development batch. It complements `docs/RULES.md` and `docs/SEVERITY-AUDIT.md`; the public capability inventory remains `README.md` / `README.es.md`.

All three rules below run only while Trace is recording real trusted interaction. They emit **REVIEW**, never automatic **FAIL**, because FocusTrace can observe a strong runtime signal without proving every alternative path, exception or recovery mechanism required for complete WCAG conformance.

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

## Shared guardrails

- Only trusted user interaction is considered; synthetic test events from the page are not treated as user evidence.
- The rules record compact target/evidence data and do not persist raw pointer trajectories.
- Absence of a review does not mean WCAG 2.1.1, 2.1.2 or 2.5.2 is fully tested.
- The WCAG coverage matrix therefore marks these criteria as **partial**, **runtime**, **review** and still requiring manual review.
- EN 301 549 references are traceability mappings for the web requirement in clause 9, not certification or a complete EN 301 549 evaluation.
