# Interactive contrast runtime evidence

FocusTrace checks the default rendered page state during **Analyze**, but authored interactive selectors such as `:hover` or `:focus-visible` are not reliable evidence by themselves. Their final visual result depends on the live cascade, inheritance, variables, compositing, transitions and application state.

FocusTrace therefore complements the static contrast scan with bounded **runtime evidence during Trace**.

## Runtime scope

While Trace is recording, FocusTrace can observe real user interaction and re-evaluate rendered contrast for these active states:

- pointer `hover`;
- pointer `active` while the control remains pressed long enough to observe the state;
- keyboard `focus-visible` / `focus` reached by a real Tab transition;
- rendered semantic states after activation: `checked`, `unchecked`, `expanded`, `collapsed`, `selected`, `unselected`, `pressed` and `unpressed`.

Two separate runtime rules share this trusted-state observation model:

- `FT-RUNTIME-014` re-evaluates rendered **text contrast** with the same text evaluator used by the static WCAG 1.4.3 check, including current foreground/background colors and rendered font size/weight.
- `FT-RUNTIME-016` re-evaluates bounded **non-text contrast** for the interacted control with the same control-scoped evidence model used by the static WCAG 1.4.11 check. It can measure simple identifying SVG fill/stroke, relevant author-styled component boundaries and author-defined focus outlines when their adjacent color is resolvable.

Text contrast may inspect a bounded descendant set because text inside the interacted control can inherit the state. Non-text runtime evaluation stays scoped to the interacted control; its existing SVG descendants are inspected as part of that control. This avoids a page-wide non-text scan on every pointer movement.

## Real state, not CSS inference

FocusTrace does **not** dispatch synthetic pointer events and does **not** call `element.focus()` to manufacture state evidence.

The runtime probe starts only from trusted user interaction while Trace is recording. Before measuring, FocusTrace reads the active control and bounded descendants' rendered transition duration/delay and waits for a bounded settle window. If the state is no longer active when that window expires, the probe is discarded.

This means a rule such as:

```css
.button {
  color: #fff;
  background: #005ea8;
}

.button:hover {
  color: #aaa;
  background: #ddd;
}
```

can pass in the default Analyze state and still produce `FT-RUNTIME-014` evidence when the user actually hovers the button and the final rendered hover colors fall below the required text-contrast ratio.

Likewise, an icon or focus outline can be acceptable by default and still produce `FT-RUNTIME-016` evidence if the **real rendered state** exposes a measured non-text cue below 3:1 against its adjacent color.

## Result boundaries

`FT-RUNTIME-014` is linked to **WCAG 2.2 1.4.3 Contrast (Minimum)** / **EN 301 549 V4.1.1 §9.1.4.3**.

`FT-RUNTIME-016` is linked to **WCAG 2.2 1.4.11 Non-text Contrast** / **EN 301 549 V4.1.1 §9.1.4.11**.

Both rules report **REVIEW**, not automatic FAIL. Even when a measured ratio is deterministic, the evidence proves only the bounded state that was observed; FocusTrace has not exercised every possible interactive state, exception, equivalent cue or application path.

The runtime record keeps technical evidence such as:

- observed state;
- text or non-text subject;
- non-text signal kind when applicable (`graphic`, `ui-boundary` or `focus-indicator`);
- measured contrast ratio;
- required ratio;
- foreground/visual and background/adjacent colors when deterministically resolved;
- rendered font size and weight for text evidence.

## Low-noise non-text boundary

Runtime non-text contrast deliberately does **not** copy every static REVIEW into Trace. `FT-RUNTIME-016` is emitted only when FocusTrace has a **resolved numeric ratio below 3:1** for the observed state.

Therefore these remain silent/manual rather than producing speculative runtime findings:

- gradients, background images and masks that cannot be reduced to one reliable adjacent-color comparison;
- generated CSS graphics without a deterministic color ratio;
- multi-color graphics where one ratio would be misleading;
- box-shadow-only focus indicators when the shadow cannot be reduced safely to one ratio;
- any state that was never actually observed.

If a low-contrast outline is accompanied by an additional box-shadow cue, the measured outline can remain REVIEW because the second cue may contribute to the overall visible indicator. Focus-indicator evidence is attributed only to real `focus` / `focus-visible` observations; a control that happens to remain focused while it is hovered is not reported as a hover focus-indicator issue.

Static Analyze behavior remains unchanged: inactive authored selectors are not treated as rendered failures merely because they exist in CSS, and complete WCAG 1.4.3 / 1.4.11 conformance still requires manual coverage beyond the observed subset.
