# FocusTrace DevTools panel

FocusTrace can run as a dedicated **FocusTrace** panel inside Chromium DevTools.

## Scope

The initial DevTools integration targets:

- Google Chrome;
- Chromium-based Microsoft Edge.

Firefox keeps the existing FocusTrace sidebar for this release. The DevTools entrypoint is deliberately excluded from the Firefox build until the packaged Firefox path has its own manual smoke coverage.

## How it works

WXT builds `entrypoints/devtools/` as the extension `devtools_page`. When browser DevTools opens for a tab, that page reads `devtools.inspectedWindow.tabId` and creates the FocusTrace panel.

The panel loads the existing `sidepanel.html` workspace with that inspected tab id. The shared FocusTrace session hook recognizes the fixed id and pins Review, Structure, Trace and Report to the inspected page instead of following later browser-tab activation events.

This lets FocusTrace reuse the same rule engine, runtime session and report model in both surfaces:

- browser side panel / Firefox sidebar;
- browser DevTools panel.

The DevTools panel is therefore not a second scanner and does not duplicate the removed inline affected-element inspector.

## Element location actions

Every finding keeps the same compact two-action layout so the controls do not move when the workspace is opened in a different surface:

1. **Highlight on page** keeps FocusTrace open and visually marks the affected element in the current page.
2. **Inspect in DOM** is the browser-inspector action.

Inside Chromium DevTools, **Inspect in DOM** resolves the saved CSS selector through `devtools.inspectedWindow` and uses the DevTools Console Utilities `inspect()` function. Chrome or Edge then opens **Elements** and selects that exact DOM node.

The DOM action is intentionally different from calling `element.focus()` on the page: FocusTrace does not move keyboard focus or change the page interaction state just to inspect a finding. It changes the DevTools selection only.

Outside the DevTools surface, the DOM action remains visible but disabled and explains that it is available from **F12 → FocusTrace**. Chrome and Edge do not expose a supported extension API that can programmatically open Developer Tools and activate a custom DevTools panel from the browser side panel. FocusTrace therefore does not rely on unsupported `devtools://` navigation or add `chrome.debugger` just to imitate that behavior.

Firefox keeps the same two-action layout for consistency, with the DOM action unavailable while the extension uses the current sidebar path.

## Page access

FocusTrace keeps the existing optional HTTP/HTTPS page-access model. Opening DevTools by itself does not start a scan or begin continuous DOM extraction.

Explicit actions such as Analyze, component selection, page highlighting and Trace continue to request or use the same bounded page access required by the current engine.

The native DevTools DOM reveal uses the inspected-window context already exposed to the DevTools extension page. No `chrome.debugger` permission is introduced.

## UI boundary

The DevTools panel currently exposes the complete shared FocusTrace workspace:

- Review;
- Structure;
- Trace;
- Report;
- settings and instructions.

The old in-sidepanel HTML/technical-selector inspector remains removed. Element location stays compact in 0.2.7; deeper browser-inspector affordances build on DevTools-native capabilities instead of reproducing an HTML inspector inside FocusTrace cards.

## Validation

Before release, validate the packaged Chrome and Edge builds manually:

1. Install the candidate package.
2. Open a normal HTTP/HTTPS page and confirm both finding actions are visible in the normal FocusTrace side panel.
3. Confirm **Highlight on page** remains usable there and **Inspect in DOM** is visibly unavailable with the DevTools guidance.
4. Open browser Developer Tools.
5. Confirm a **FocusTrace** tab appears.
6. Run a full-page analysis from the DevTools panel.
7. Confirm the result belongs to the inspected tab even if another browser tab becomes active.
8. Open a finding and use **Highlight on page**; confirm the element is marked without leaving FocusTrace.
9. Use **Inspect in DOM**; confirm DevTools switches to **Elements** and selects the exact DOM node.
10. Confirm the two action cells are contiguous with no layout gap in normal, hover and keyboard-focus states.
11. Return to FocusTrace and check Review, Structure, Trace and Report.
12. Close and reopen DevTools and confirm the panel reconnects to the current inspected tab session.

The normal release gate and side-panel smoke checks still apply.
