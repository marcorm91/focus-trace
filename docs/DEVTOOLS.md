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

## Native DOM inspection

When FocusTrace is running inside Chromium DevTools, the compact element-location action on a finding becomes a native DOM inspection action.

FocusTrace evaluates the saved CSS selector through `devtools.inspectedWindow` and uses the DevTools Console Utilities `inspect()` function on the resolved element. Chrome or Edge then opens the **Elements** panel and selects that exact DOM node.

This is intentionally different from calling `element.focus()` on the page: FocusTrace does not move keyboard focus or change the page interaction state just to inspect a finding. It changes the DevTools selection only.

If the saved selector can no longer be resolved, FocusTrace falls back to the existing page-location behavior rather than creating a second HTML inspector inside the FocusTrace UI.

The normal browser side panel and Firefox sidebar keep their current page-highlight action.

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
2. Open a normal HTTP/HTTPS page.
3. Open browser Developer Tools.
4. Confirm a **FocusTrace** tab appears.
5. Run a full-page analysis from the DevTools panel.
6. Confirm the result belongs to the inspected tab even if another browser tab becomes active.
7. Open a finding and use its element-location action.
8. Confirm DevTools switches to **Elements** and selects the exact DOM node for that finding.
9. Return to FocusTrace and check Review, Structure, Trace and Report.
10. Confirm page-location fallbacks still affect the inspected page.
11. Close and reopen DevTools and confirm the panel reconnects to the current inspected tab session.

The normal release gate and side-panel smoke checks still apply.
