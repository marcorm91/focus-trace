# Interactive contrast runtime evidence

FocusTrace checks the default rendered page state during **Analyze**, but authored interactive selectors such as `:hover` or `:focus-visible` are not reliable evidence by themselves. Their final visual result depends on the live cascade, inheritance, variables, compositing, transitions and application state.

FocusTrace therefore complements the static contrast scan with bounded **runtime evidence during Trace**.

## Initial scope

While Trace is recording, FocusTrace can observe real user interaction and re-evaluate rendered **text contrast** for these active states:

- pointer `hover`;
- pointer `active` while the control remains pressed long enough to observe the state;
- keyboard `focus-visible` / `focus` reached by a real Tab transition;
- rendered semantic states after activation: `checked`, `unchecked`, `expanded`, `collapsed`, `selected`, `unselected`, `pressed` and `unpressed`.

The observation is limited to the interacted control and a bounded descendant set. FocusTrace uses the same rendered text-contrast evaluator as the static WCAG 1.4.3 check, including the current foreground/background colors and current font size/weight.

## Real state, not CSS inference

FocusTrace does **not** dispatch synthetic pointer events and does **not** call `element.focus()` to manufacture state evidence.

The runtime probe starts only from trusted user interaction while Trace is recording. Before measuring, FocusTrace reads the active control's rendered transition duration/delay and waits for a bounded settle window. If the state is no longer active when that window expires, the probe is discarded.

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

can pass in the default Analyze state and still produce runtime evidence when the user actually hovers the button and the final rendered hover colors fall below the required text-contrast ratio.

## Result boundary

The new runtime rule is `FT-RUNTIME-014` and is linked to **WCAG 2.2 1.4.3 Contrast (Minimum)** / **EN 301 549 V4.1.1 §9.1.4.3**.

Even when the observed ratio is deterministic, FocusTrace reports this as **REVIEW**, not automatic FAIL. The evidence proves the bounded state that was observed; it does not prove that FocusTrace exercised every possible interactive state, exception or application path.

The runtime record keeps technical evidence such as:

- observed state;
- text subject;
- measured contrast ratio;
- required ratio;
- foreground/background colors when deterministically resolved;
- rendered font size and weight.

## Current boundary

This first runtime extension targets **text contrast (WCAG 1.4.3)**. It does not yet claim runtime coverage of every non-text component/state contrast requirement under WCAG 1.4.11. The same trusted-state observation model can be extended to non-text boundaries, graphics and focus-indicator contrast separately without conflating the two criteria.

Static Analyze behavior remains unchanged: inactive authored selectors are not treated as rendered failures merely because they exist in CSS.
