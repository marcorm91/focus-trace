# Multipage audits

FocusTrace groups repeated full-page analyses into a lightweight manual audit so users can review several selected pages and export them as one PDF without duplicating the report header for every page.

## Rules

- The first full-page analysis starts an audit automatically.
- Another page on the same normalized site is added to the active audit.
- When the user tries to analyze a page from a different site, FocusTrace asks whether to add that site to the current audit, start a new audit, or cancel.
- Component-scoped analyses remain page/component debugging evidence and do not create or replace an audit page.
- A page is identified by its normalized URL. Ordinary fragment identifiers are ignored; query strings and SPA route hashes are preserved.
- Re-analyzing the same normalized URL replaces that page's saved result. It never creates a duplicate page section in the audit PDF.
- Each page keeps the `scannedAt` timestamp from its latest analysis as **Review performed / Revisión realizada**.
- The audit also keeps its creation time and last-update time.

## Persistence

Audits are stored locally in `browser.storage.local`. The active audit is a product-level concept rather than a tab-level session, so navigating between pages or browser tabs does not erase the accumulated audit pages.

Storage is bounded to the newest 8 audits and 40 pages per audit.

## PDF export

The Report workspace keeps the existing single-page/session report and adds an **Export audit PDF** action. Audit export uses a dedicated printable entrypoint with:

- one audit cover;
- aggregate failure/review/warning totals;
- one section per normalized page URL;
- the latest review time for every page;
- the latest saved full-page findings for every page.

Historical page runs are not repeated in the PDF. FocusTrace Memory remains the place for longitudinal comparison across repeated analyses.
