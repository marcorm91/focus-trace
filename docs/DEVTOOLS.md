# FocusTrace DevTools panel

FocusTrace can run as a dedicated **FocusTrace** panel inside browser DevTools.

## Scope

The DevTools integration targets:

- Google Chrome;
- Chromium-based Microsoft Edge;
- Mozilla Firefox 115+.

The existing browser side panel / Firefox sidebar remains available. DevTools is an additional developer-focused surface, not a replacement for the normal extension workflow.

Firefox keeps the DevTools permission **optional**. This matters for existing installations: adding the DevTools panel in an update does not force a new install/update permission warning. Users who want the Firefox DevTools panel enable it once from **FocusTrace Settings**, then open or reopen Developer Tools.

## How it works

WXT builds `entrypoints/devtools/` as the extension `devtools_page` for Chrome, Edge and Firefox. When browser DevTools opens for a tab, that page reads `devtools.inspectedWindow.tabId` and creates the FocusTrace panel.

The panel loads the existing `sidepanel.html` workspace with that inspected tab id. The shared FocusTrace session hook recognizes the fixed id and pins Review, Structure, Trace and Report to the inspected page instead of following later browser-tab activation events.

This lets FocusTrace reuse the same rule engine, runtime session and report model in both surfaces:

- browser side panel / Firefox sidebar;
- browser DevTools panel.

The DevTools panel is therefore not a second scanner and does not duplicate the removed inline affected-element inspector.

Firefox supports the Chromium-style `chrome.devtools` callback namespace as a WebExtensions compatibility layer. FocusTrace intentionally uses the common callback form of `devtools.inspectedWindow.eval()` without an options object because Firefox does not implement the optional eval context options used by Chromium.

## Firefox permission model

Firefox treats `devtools_page` as DevTools access. FocusTrace lists the `devtools` permission under Firefox `optional_permissions` instead of making it a required permission.

From the normal Firefox sidebar:

1. Open **Settings**.
2. Select **Enable DevTools integration**.
3. Approve the Firefox permission request.
4. Open or reopen Developer Tools with **F12**.
5. Select the **FocusTrace** tab.

If the optional permission is not enabled, the normal Firefox sidebar keeps working and **Inspect in DOM** remains unavailable. Page analysis, Structure, Trace and Report do not depend on the Firefox DevTools permission.

## Element location actions

Every finding keeps the same compact two-action layout so the controls do not move when the workspace is opened in a different surface:

1. **Highlight on page** keeps FocusTrace open and visually marks the affected element in the current page.
2. **Inspect in DOM** is the browser-inspector action.

Inside browser DevTools, **Inspect in DOM** resolves the saved CSS selector through `devtools.inspectedWindow` and uses the DevTools Console Utilities `inspect()` function.

- Chrome and Edge switch to **Elements** and select that exact DOM node.
- Firefox selects that exact DOM node in the native **Inspector**.

The DOM action is intentionally different from calling `element.focus()` on the page: FocusTrace does not move keyboard focus or change the page interaction state just to inspect a finding. It changes the DevTools selection only.

Outside the DevTools surface, the DOM action remains visible but disabled and explains that it is available from **F12 → FocusTrace**. Browsers do not expose a supported extension API that can programmatically open Developer Tools and activate a custom DevTools panel from the normal side panel/sidebar. FocusTrace therefore does not rely on unsupported internal-browser navigation or add `chrome.debugger` just to imitate that behavior.

## Page access

FocusTrace keeps the existing optional HTTP/HTTPS page-access model. Opening DevTools by itself does not start a scan or begin continuous DOM extraction.

Explicit actions such as Analyze, component selection, page highlighting and Trace continue to request or use the same bounded page access required by the current engine.

The native DevTools DOM reveal uses the inspected-window context already exposed to the DevTools extension page. No `chrome.debugger` permission is introduced.

The Firefox `devtools` permission grants access to the browser's developer-tool extension surface; it does not grant permanent host access to inspected pages. FocusTrace keeps page/capture hosts optional under the existing permission model.

## UI boundary

The DevTools panel exposes the complete shared FocusTrace workspace:

- Review;
- Structure;
- Trace;
- Report;
- settings and instructions.

The old in-sidepanel HTML/technical-selector inspector remains removed. Element location stays compact in 0.2.7; deeper browser-inspector affordances build on DevTools-native capabilities instead of reproducing an HTML inspector inside FocusTrace cards.

## Validation

Before release, validate the packaged Chrome, Edge and Firefox builds manually.

### Chrome and Edge

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

### Firefox

1. Install or update the candidate package and confirm the normal FocusTrace sidebar still works without enabling DevTools access.
2. Open **Settings** and confirm **Firefox DevTools integration** is present.
3. Enable the integration and approve the optional `devtools` permission.
4. Open or reopen Firefox Developer Tools with **F12**.
5. Confirm a **FocusTrace** tab appears while the regular sidebar remains available.
6. Run a full-page analysis from the DevTools panel and confirm the result stays pinned to the inspected tab.
7. Use **Highlight on page** and confirm the visual overlay still works.
8. Use **Inspect in DOM** and confirm Firefox selects the exact node in the native **Inspector**.
9. Confirm FocusTrace does not move keyboard focus on the inspected page.
10. Confirm the two action cells remain contiguous in normal, hover and keyboard-focus states.
11. Close and reopen the toolbox and confirm FocusTrace reconnects to the newly inspected tab.
12. Confirm removing or declining the optional DevTools permission does not break the normal sidebar workflow.

The normal release gate, browser-build validation and side-panel/sidebar smoke checks still apply.
