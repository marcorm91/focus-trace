# Focus Graph and progressive explanations

FocusTrace presents the same recorded accessibility evidence at different levels of technical depth so the runtime debugger can be used by auditors, UX/UI designers, QA specialists and frontend developers.

## Explanation levels

### Simple

Simple is the default. It prioritizes:

- what happened;
- who may be affected;
- what should be reviewed or changed.

Selectors, internal cause identifiers, raw mutations and route details stay hidden.

### Accessibility

Accessibility adds:

- FocusTrace outcome and rule identifiers;
- WCAG / WAI-ARIA APG references;
- audit evidence and accessibility-specific context.

It is intended for accessibility specialists and QA roles that need traceable evidence without requiring implementation-level DOM details.

### Developer

Developer exposes the full evidence already recorded by FocusTrace, including selectors, timestamps, DOM mutation values, route URLs and deterministic root-cause identifiers.

Changing explanation level does not change the underlying analysis or result. It only changes how much evidence is displayed.

## Focus Graph

The Focus Graph is derived only from focus events observed during the current runtime recording.

Each unique observed focus destination becomes a node identified internally by its captured selector. The graph records:

- accessible name / role;
- visit count;
- directed transitions to later focus destinations;
- repeated observed transitions;
- runtime causal signals associated with the node.

Runtime causes such as focused-node removal, focus falling back to the document body, focus escaping a modal, focus becoming hidden and SPA route changes without focus movement are shown as human-readable things to review.

## Page focus path

The Focus and Graph views can project the recorded journey back onto the current page. Each observed focus destination receives a violet border and one or more numbered badges:

- numbers represent the chronological order of recorded focus events;
- revisiting the same destination preserves every observed position, for example `1 · 3`;
- selecting a graph point scrolls it into view and gives it a stronger blue highlight;
- overlays track scrolling and layout changes and stay visible until explicitly hidden;
- visualizing historical evidence never calls `focus()`, so inspection does not add a new focus event or change the recorded path.

Only elements that still match their recorded selectors can be highlighted. Removed or replaced elements remain available in the recorded evidence even when they can no longer be projected onto the live page.

## Evidence boundary

The graph is an observed journey, not a complete model of every focusable control on the page.

FocusTrace therefore does **not** infer that a control is unreachable merely because it was not visited during the recording. It also does not label repeated transitions as accessibility failures by themselves because moving backward and revisiting controls can be expected keyboard behavior.

This evidence boundary is intentional: the graph should explain what FocusTrace actually observed without inventing conformance claims that require a different test.
