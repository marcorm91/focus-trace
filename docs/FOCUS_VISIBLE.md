# WCAG 2.4.7 Focus Visible runtime review

FocusTrace implements a deliberately conservative runtime subset of WCAG 2.2 **2.4.7 Focus Visible (AA)**, informed by W3C ACT rule **oj04fd — Element in sequential focus order has visible focus**.

The production rule ID is `FT-RUNTIME-010`. It is a **REVIEW**, never an automatic WCAG failure.

## Why this is runtime-only

Focus visibility cannot be determined reliably from static CSS such as `outline: none`. A valid focus indicator can use outline, border, box shadow, background changes, descendants, pseudo-elements or another visible change. Conversely, the automatic Focus Walk uses `element.focus()`, which is not equivalent to a real keyboard Tab transition for `:focus-visible` modality.

For that reason `FT-RUNTIME-010` is evaluated only during manual Trace after a **trusted real Tab / Shift+Tab interaction**. Automatic Focus Walk is intentionally excluded.

## Observable subset

FocusTrace evaluates a target only when all of these conditions are available:

1. a trusted Tab key event is followed by focus moving to a sequential-focus candidate;
2. the focused target remains the active element for at least **1 second**, matching the ACT focus-stability definition;
3. a lossless PNG viewport capture is available while the tab is active;
4. the same local comparison region was captured while that adjacent sequential-focus target was not focused;
5. two captures of the non-focused state and two captures of the focused state are stable;
6. viewport size and scroll position remain unchanged between the compared states.

The comparison region is the target's visible bounding rectangle plus a **32 CSS px margin**, clipped to the viewport. The crop is mapped to screenshot device pixels from the actual screenshot dimensions instead of assuming a fixed device-pixel ratio.

## Outcome policy

- If at least one stable pixel changes between the non-focused and focused state, FocusTrace has positive evidence of a local visual change and emits no review.
- If the region is pixel-stable within each state and **no pixel changes** between states, FocusTrace emits `FT-RUNTIME-010` as **REVIEW**.
- If either state is visually unstable, capture is unavailable, the viewport moves, the target leaves the viewport, focus moves before the stability window ends, or no reliable non-focused baseline exists, the check is **inconclusive and omitted**.

FocusTrace intentionally does **not** convert an unchanged local crop into `FAIL`. ACT `oj04fd` allows the visible focus indication to occur elsewhere in the viewport. A bounded local comparison therefore supplies a strong review signal but cannot prove the whole ACT expectation failed.

The first real Tab destination in a sequence can remain unassessed until FocusTrace has observed a stable neighboring state from which a trustworthy non-focused baseline can be captured. This is an intentional false-negative tradeoff.

## Privacy and storage

Viewport captures used by this rule are ephemeral. They are requested only while Trace is recording and the inspected tab is active, decoded locally for pixel comparison, and are **not written to FocusTrace session storage, FocusTrace Memory, reports or exports**.

## What this rule does not test

`FT-RUNTIME-010` does not measure focus-indicator contrast, thickness, area, persistence under overlays, complete obscuring, or whether every sequential-focus element on the page was visited. Those concerns belong to separate WCAG criteria and/or manual verification.

A clear `FT-RUNTIME-010` session does not prove full WCAG 2.4.7 conformance. Reviewers should still traverse the complete interface with Tab and Shift+Tab and confirm that every keyboard-operable component has a visible focus indication whenever it receives keyboard focus.
