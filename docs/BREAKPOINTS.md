# Accessibility breakpoints

FocusTrace accessibility breakpoints are runtime debugging controls built on top of the deterministic causality engine.

A breakpoint hit **pauses FocusTrace recording after the triggering event has been persisted**. It does not pause JavaScript execution in the inspected page and does not require the `chrome.debugger` permission.

This distinction is deliberate for the first implementation: FocusTrace can freeze the evidence chain without changing page behavior or requesting a high-trust browser permission.

## Breakpoints

| Breakpoint | Runtime cause | Default |
| --- | --- | --- |
| Focused node removed | `FOCUSED_NODE_REMOVED` | Off |
| Focus falls back to body | `FOCUS_FELL_BACK_TO_BODY` | Off |
| Dialog opens without focus | `DIALOG_OPENED_WITHOUT_FOCUS` | Off |
| Focus escapes modal | `MODAL_FOCUS_ESCAPE` | Off |
| SPA route changes without focus | `ROUTE_CHANGED_WITHOUT_FOCUS_MOVE` | Off |
| Focused element becomes hidden | `FOCUSED_ELEMENT_BECAME_HIDDEN` | Off |

All breakpoints are opt-in. Starting a recording and returning focus to the inspected page must not pause the session by itself; a pause only occurs when a breakpoint the user explicitly enabled matches a deterministic runtime cause.

## Hit lifecycle

1. A keyboard or pointer interaction receives an `interactionId`.
2. FocusTrace records relevant focus, DOM, dialog and route evidence.
3. The causality engine emits one or more deterministic `RuntimeCause` values.
4. Enabled breakpoints are matched against those causes.
5. The triggering `RuntimeEvent` is persisted with `breakpointHits` metadata.
6. FocusTrace recording is paused locally.
7. The side panel keeps the triggering interaction expanded and shows the root cause and breakpoint hit.
8. **Resume recording** continues the same session without clearing previous evidence.

A manually started new recording still clears the previous runtime journey as before. Resuming from a breakpoint does not.

## Session behavior

Breakpoint settings are stored with the tab session and normalized against current defaults so sessions created by older FocusTrace versions remain compatible when new breakpoint types are introduced.

Changing a breakpoint updates both the background session and the injected runtime recorder. Breakpoint hits are also included in the Session Report metric.

Recording state belongs to the inspected tab, not to the side panel. Closing the panel, focusing the page or reloading/navigating the page does not stop recording. After a full navigation, the background worker re-injects the recorder and restores the saved per-tab state.

## Scope

Accessibility breakpoints are debugging controls, not new WCAG conformance rules. The breakpoint is triggered by an existing deterministic runtime cause, while the associated WCAG/APG finding can remain `REVIEW` when workflow context is required.

A future DevTools integration could optionally pause JavaScript execution using browser debugging APIs, but that is intentionally outside this version because it would require additional permissions and a different trust/UX model.
