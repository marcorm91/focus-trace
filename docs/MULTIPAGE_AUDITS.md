# Multipage audits

FocusTrace groups repeated full-page analyses into a lightweight manual audit so users can review several selected pages and export them as one PDF without duplicating the report header for every page.

## Rules

- The first full-page analysis starts an audit automatically.
- Another page on the same normalized site is added to the active audit.
- When the user tries to analyze a page from a different site, FocusTrace asks whether to add that site to the current audit, start a new audit, or cancel.
- Component-scoped analyses remain page/component debugging evidence and do not create or replace an audit page.
- A page is identified by its normalized URL. Ordinary fragment identifiers are ignored; query strings and SPA route hashes are preserved.
- Re-analyzing the same normalized URL replaces that page's saved result and its saved audit visual evidence. It never creates a duplicate page section in the audit PDF.
- Each page keeps the `scannedAt` timestamp from its latest analysis as **Review performed / Revisión realizada**.
- The audit also keeps its creation time and last-update time.

## Report history

The Report workspace lists the reviewed pages in the active audit. Only one saved review is expanded at a time so repeated report IDs and ambiguous accessibility relationships cannot be introduced by several simultaneous report instances.

The current page can reuse its live Trace, Structure snapshot and page-location actions. A historical page deliberately does not borrow those values from whichever tab happens to be active:

- the historical view shows the saved static analysis and heading evidence for that review;
- current-page locate/highlight actions are not exposed for the historical review;
- historical Trace and Structure snapshots are not persisted with audit pages in 0.1.4 and are labelled as unavailable rather than displayed as zero/live evidence;
- persisted historical screenshot crops can be reused by the page's individual PDF and by **Export audit PDF**, without capturing an unrelated active tab;
- each saved page review can be deleted explicitly; deleting the final page also removes the empty audit.

Persisting complete historical Trace and Structure snapshots is a future extension of the audit model, not something the 0.1.4 UI should infer or silently mix.

## Persistence

Audits are stored locally in `browser.storage.local`. The active audit is a product-level concept rather than a tab-level session, so navigating between pages or browser tabs does not erase the accumulated audit pages.

Storage has several independent safeguards:

- at most the newest 8 audits;
- at most 40 pages per audit;
- at most 3 screenshot crops for a reviewed page;
- a shared visual-data budget that prefers the newest review evidence;
- an overall serialized audit-store budget so scan history and screenshot data cannot grow toward the browser storage quota without pruning.

If the overall budget is exceeded, FocusTrace removes older inactive audit history first and then the oldest pages while preserving the newest active review. If the browser still rejects the write, FocusTrace makes a final attempt to keep only the newest page of the active audit without its screenshot data. Losing visual history must not silently prevent the latest static review from being recorded.

## Visual evidence

During an explicit full-page analysis, FocusTrace can capture a small bounded set of visual crops for the audit using the active page context already established for that analysis. These crops remain local in browser extension storage and may contain visible page content.

A failed or unavailable capture is stored as an evidence state rather than being treated as if screenshots existed. Audit PDFs can therefore distinguish between:

- saved visual evidence;
- a page with no eligible visual target;
- capture unavailable/restricted by the browser;
- older audit history where visual data was trimmed by the storage budget;
- legacy reviews created before audit visual evidence existed.

See `PRIVACY.md` for the complete local-data and permission description.

## PDF export

**Export audit PDF** uses a dedicated printable entrypoint with:

- one audit cover;
- a hierarchical index of reviewed pages and their non-empty result sections;
- aggregate failure/review/warning totals;
- one section per normalized page URL;
- the latest review time for every page;
- the latest saved full-page findings for every page;
- the bounded visual crops that were persisted with those page reviews when available and explicitly included for export.

The print payload is itself bounded before being placed in `browser.storage.session`, so a large historical audit cannot rely on exceeding the browser's session-storage quota just to open the print preview.

Historical page runs are not repeated in the PDF. FocusTrace Memory remains the place for longitudinal comparison across repeated analyses.
