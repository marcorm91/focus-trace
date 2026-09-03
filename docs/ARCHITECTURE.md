# FocusTrace architecture

FocusTrace is a local-first Manifest V3 browser extension. The architecture is intentionally split by execution boundary because code running in the extension UI, the background service worker and the inspected page have different permissions, lifetimes and trust constraints.

## Top-level boundaries

### Side panel / sidebar

`entrypoints/sidepanel/` owns the interactive FocusTrace UI.

Responsibilities include:

- selecting full-page or component analysis;
- starting/stopping Trace and Focus Walk;
- rendering scan, heading, focus, replay and report views;
- managing user-facing settings;
- requesting optional HTTP/HTTPS page access directly from explicit user actions, before querying privileged tab URL fields on a fresh installation;
- collecting bounded local Memory evidence for an explicit scan when Memory is enabled;
- presenting FocusTrace Memory comparisons without mutating scan history merely by rendering a view.

The side panel treats the background session as the source of truth for the active tab. Asynchronous tab refreshes are guarded so a slow response from a previously selected tab cannot overwrite the current tab state.

### Background service worker

`entrypoints/background.ts` owns per-tab session persistence and message coordination.

Per-tab writes are serialized before updating `browser.storage.session`. This is important in Manifest V3 because runtime events can arrive close together and the service worker itself can be suspended between periods of activity.

The background stores a completed static scan before broadcasting the updated session. If FocusTrace Memory is enabled, the same save flow records the compact historical observation and any bounded local evidence supplied by the explicit scan independently of which UI view the user opens afterwards.

### Inspected-page runtime

`entrypoints/runtime.content.ts` and `lib/runtime/` execute or support code that observes the inspected page.

Responsibilities include:

- static scan execution;
- keyboard/pointer and focus observation;
- selected DOM mutation and route evidence;
- dialog lifecycle evidence;
- Focus Walk;
- page overlays and component selection.

Functions passed through `browser.scripting.executeScript({ func })` must be self-contained. The browser serializes the function body; module closures are not available inside the inspected page.

### Site Audit

`entrypoints/site-audit/` and `lib/site-audit/` own same-origin discovery, route-family grouping, representative sampling and aggregate reporting.

Site Audit reuses the real static rule engine rather than maintaining a second accessibility scanner.

### Printable report

`entrypoints/report-print/` and `lib/report/` own report assembly, optional local visual evidence and printable/export formats.

Visual evidence is user initiated. Screenshot capability is requested for the export action and is not a permanent production host permission.

## Library layout

### `lib/audit/`

Deterministic static-analysis primitives and rule execution:

- accessible-name and DOM helpers;
- text and non-text contrast;
- label-in-name;
- standards registry evaluation;
- duplicate-ID authoring checks;
- scan orchestration.

A static `FAIL` must be backed by evidence that the implemented expectation can evaluate deterministically. Context-dependent signals belong in `REVIEW`; authoring/maintenance signals that are not direct WCAG failures belong in `WARNING`.

### `lib/runtime/`

Runtime behavior, focus causality, breakpoints, overlays, replay inputs and session-state helpers.

Runtime causal classifications explain recorded evidence. They do not automatically convert an APG pattern or contextual focus behavior into a WCAG conformance failure.

### `lib/focus-memory/`

Browser-storage lifecycle and optional local evidence capture for FocusTrace Memory.

Memory persistence is deliberately separate from React presentation components. Saving a scan records an eligible observation; rendering a result reads history but does not create it.

When Memory is enabled, `visual-evidence.ts` can collect a compact locator for failing targets and, for a bounded number of currently visible targets, attempt a visible-tab capture and local crop. Capture failure is non-fatal and leaves the locator as the fallback.

### `lib/report/`

Shared report composition, evidence formatting and remediation guidance.

### `shared/`

Cross-boundary data contracts and pure helpers, including:

- message/session/result types;
- rule catalog;
- localization;
- severity and scan categories;
- FocusTrace Memory comparison/fingerprint logic;
- persistent preference keys.

Keep browser-specific side effects outside `shared/` so pure behavior remains straightforward to test.

## Storage model

FocusTrace uses two browser storage lifetimes for different purposes.

### Session storage

`browser.storage.session` stores per-tab working state:

- current scan;
- Trace events;
- recording state;
- breakpoint state.

Runtime event history is capped at 500 events per tab.

Closing a tab removes its session entry. **Start Over** clears the page/Trace evidence while preserving configured breakpoint preferences.

### Local storage

`browser.storage.local` stores durable user choices such as:

- interface language and scale;
- breakpoint preferences;
- FocusTrace Memory opt-in, bounded history and optional bounded local evidence.

FocusTrace Memory is disabled by default. Its normal observation data includes hashed fingerprints, counts and timestamps. To preserve useful context for a resolved finding, it can also retain a compact target locator and, when available, a small local JPEG crop of the visible failing element. Memory does not store page HTML, a full DOM snapshot or a full-page screenshot.

Current retention bounds are 8 observations per scope, 200 observations total, 24 visual previews across remembered findings and 90 days. Only the newest retained preview for a finding is kept. Age cleanup occurs when FocusTrace next reads Memory storage. Users can clear saved history and evidence from Settings even when Memory is disabled.

## Static scan flow

```text
User action in side panel
        ↓
Request/verify optional page access
        ↓
Ensure runtime content script is injected
        ↓
Run FocusTrace static scanner in inspected page
        ↓
ScanResult returned to side panel
        ↓
If Memory enabled: collect compact locators and bounded visible-element previews
        ↓
FOCUSTRACE_SAVE_SCAN
        ↓
Background serializes per-tab write
        ├─ stores current scan in storage.session
        ├─ records eligible Memory observation/evidence in storage.local
        └─ broadcasts updated session
```

Component scans use the same rule engine with a selected subtree. Rules that need document context can still inspect the document when required. Duplicate-ID uniqueness, for example, is document-wide even when only occurrences inside the selected component are reported.

## Trace event flow

```text
Keyboard / pointer / focus / relevant mutation
        ↓
Inspected-page runtime
        ↓
FOCUSTRACE_EVENT
        ↓
Background per-tab write queue
        ↓
storage.session (bounded event list)
        ↓
FOCUSTRACE_SESSION_UPDATED
        ↓
Side panel views / graph / journey / replay / report
```

## Selector invariant

Selectors stored as evidence must resolve as specifically as practical to the element that produced the evidence.

A unique HTML ID can use the compact `#id` form. If the ID is duplicated, FocusTrace must not use the ambiguous ID selector; it falls back to a structural selector (and can anchor that path to a unique ancestor ID). This matters for Inspect/highlight navigation, report occurrences, runtime correlation and historical fingerprints.

Memory locators deliberately retain only a bounded selector string as historical context. They are not treated as a stable DOM snapshot and are removed when the detailed resolved finding is archived or when Memory history is cleared.

## Permission boundary

Production builds intentionally avoid permanent global host access.

- `activeTab` and `scripting` support explicit page analysis/runtime actions.
- HTTP/HTTPS host access is optional and requested from the user action that needs it.
- Memory visible-element previews are attempted only during an explicit scan using the active-tab/page-access context already established for that action; capture failure falls back to the locator and does not request persistent broad screenshot access.
- broader `<all_urls>` screenshot access remains temporary and export-specific for printable-report evidence.
- E2E builds may include localhost access solely to exercise the extension in browser tests.

Changes to these boundaries require a privacy/security review and corresponding documentation updates.

## Standards data

Generated standards snapshots live in `generated/` and are validated in CI.

The scheduled Standards Registry workflow can refresh public source data and propose the change through GitHub. Product scans remain local/offline against committed snapshots instead of fetching standards data during an audit.

## Validation strategy

The main quality gate combines:

- TypeScript strict checking;
- linting;
- unit/contract tests;
- standards snapshot validation;
- Chrome, Edge and Firefox production builds;
- build-manifest validation;
- Chromium extension E2E tests.

CI is intentionally least-privilege for normal validation. Third-party GitHub Actions are pinned to verified commit SHAs rather than mutable major-version tags.

## Maintenance guidance

Prefer extracting pure behavior into `shared/` or `lib/` and testing it directly instead of hiding product logic inside React effects or view rendering.

Several UI/style files remain comparatively large because the visual system has evolved incrementally. Treat large-scale CSS/view decomposition as a separate refactor with visual/E2E coverage rather than mixing it into unrelated feature work.

Before adding a new persistent feature, define:

1. whether it belongs in session or local storage;
2. its retention bound;
3. whether it is opt-in;
4. which execution context is allowed to write it;
5. how concurrent writes are serialized;
6. how the user can clear it;
7. what privacy documentation must change.
