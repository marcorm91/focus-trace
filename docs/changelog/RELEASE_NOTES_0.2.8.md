# FocusTrace 0.2.8

FocusTrace 0.2.8 adds human audit context to the evidence model, enables bounded local Memory by default and expands conservative runtime review for real interactive states. It also delivers a focused performance and reliability pass across static scanning, Trace, Site Audit, side-panel loading, visual capture and release validation.

The release preserves FocusTrace's evidence boundary: auditor notes never change technical outcomes, and interaction-dependent accessibility signals remain contextual `REVIEW` evidence rather than automatic conformance claims.

## Auditor notes on findings and Trace events

Auditors can now add an optional plain-text note to every static finding and every Trace event.

- Notes can be added, edited and removed from the relevant evidence card.
- One shared contract limits notes to 2,000 characters and records their last update time.
- Notes remain visually and semantically separate from detected evidence.
- Adding or changing a note does not alter outcome, severity, finding counts, standards coverage or conformance interpretation.
- Static-finding notes are synchronized with the matching saved multipage review and existing FocusTrace Memory observation when those parent records exist.
- Removing a note or deleting its parent interaction, audit page, remembered detail or Memory history removes the attached local copy.

Applicable reports preserve that human context alongside the original evidence:

- side-panel report preview;
- single-page PDF and TXT exports;
- complete multipage-audit PDF;
- Trace Markdown and JSON;
- portable FocusTrace Memory JSON for remembered static findings.

An exported file is an independent snapshot. Later editing or deleting the local note does not rewrite a file that was already exported.

## FocusTrace Memory enabled by default

FocusTrace Memory now starts enabled after installation. Users can disable **Remember accessibility history** in Settings, and that opt-out persists.

Turning Memory off stops new observations and comparisons without silently deleting existing history. **Clear saved history** remains available while Memory is disabled.

Remembered observations and compact resolved markers no longer expire because of age. Storage remains bounded through the existing capacity limits:

- 8 observations for one page/component scope;
- 200 observations across the browser profile;
- 120 detailed failures in one retained scan;
- 24 visual previews across remembered findings;
- 200 compact resolved markers.

When a capacity limit is reached, FocusTrace replaces the oldest evidence needed to remain within the bound. It does not request `unlimitedStorage`.

Memory persists only while FocusTrace remains installed in the current browser profile. Uninstalling the extension causes the browser to remove its extension-owned local storage automatically. Users who want to reuse supported remembered findings and notes after reinstalling or in another profile should export the portable Memory JSON first.

## Interactive text contrast during Trace

`FT-RUNTIME-014` reviews text contrast in rendered interactive states that the user actually exercises while Trace is recording.

It can observe trusted hover, pointer-active, keyboard focus/focus-visible and rendered semantic-state changes, then waits for a bounded transition-settle window before measuring the final computed colors. Insufficient contrast produces contextual `REVIEW` evidence linked to WCAG 2.2 1.4.3 and EN 301 549 V4.1.1 §9.1.4.3.

Static Analyze remains unchanged: FocusTrace does not infer inactive authored selectors as rendered failures, synthesize interaction or claim that unvisited states pass.

## Content on Hover or Focus

`FT-RUNTIME-015` adds conservative runtime evidence for WCAG 2.2 1.4.13 and the corresponding EN 301 549 clause.

When additional content actually becomes visible after trusted hover or focus, FocusTrace can review observable signals for:

- **hoverable** content that disappears as the pointer moves into its last known bounds;
- **persistent** content that disappears while the originating trigger state remains active and no dismissal was observed;
- **dismissible** overlapping content that remains after an Escape probe.

Trigger/content association uses explicit ARIA relationships or bounded geometric proximity. Observation size and concurrency are limited. Escape supplies evidence about one attempted mechanism; it is not presented as a universal WCAG requirement.

## Interactive non-text contrast

`FT-RUNTIME-016` extends real-state contrast review to a conservative subset of WCAG 2.2 1.4.11 and EN 301 549 V4.1.1 §9.1.4.11.

The rule reuses the scoped non-text evaluator on the interacted control rather than rescanning the page. It can measure supported control boundaries, simple SVG graphics and author-defined focus outlines in observed hover, active, focus/focus-visible and semantic states.

Complex gradients, image-based or multi-color graphics and unresolved shadow-based indicators remain outside automatic runtime findings. The outcome stays `REVIEW`, and no synthetic focus or hover is generated.

## Faster static analysis and side-panel startup

Runtime content-script injection is now scoped by capability:

- Analyze and Site Audit inject the core scanner only;
- Trace and Focus Walk load the additional focus-visible and hover/focus observers when needed;
- restoring an active recording after navigation restores the complete Trace set.

The emitted JavaScript injected for a static analysis in the final candidate is 376,327 bytes, down from the 679,000-byte pre-optimization baseline: 302,673 bytes or 44.6% less per analyzed page.

The six side-panel workspaces now load through separate module boundaries. The loading fallback is localized and exposed as a polite live status. In the measured Chrome MV3 build:

| Metric | Before | 0.2.8 | Change |
| --- | ---: | ---: | ---: |
| Initial assets | 902,199 B | 491,457 B | -45.5% |
| Initial JavaScript | 339,983 B | 91,171 B | -73.2% |
| Initial CSS | 196,847 B | 120,643 B | -38.7% |

## Lower scan and Trace overhead

The static rule engine now caches identical root/selector results for exactly one synchronous scan. Repeated whole-document `*` traversals fall from four to one, while every new scan receives a fresh cache so DOM changes remain observable.

Ordinary Trace event bursts are coalesced over a 16 ms window before crossing the extension boundary. A complete ordered batch is persisted, trimmed and broadcast with one per-tab write. Breakpoint evidence still flushes immediately, and pending evidence is flushed before navigation or content-context invalidation. The 500-event retention bound and event order are unchanged.

The installed `FocusTrace v<version>` is also visible below the support action in the side-panel footer and is read from the packaged browser manifest.

## Visual-evidence source integrity

Multipage audit crops, single-page report evidence, Memory previews and temporary Focus Visible comparisons are now bound to the exact tab, window and normalized document URL that initiated the scan.

FocusTrace validates that identity immediately before and after a window-scoped capture. If the source tab becomes inactive, another tab is selected or navigation changes the document, captured pixels are discarded and the existing unavailable/inconclusive fallback is used. Evidence from an unrelated page is never borrowed for the original result.

## Bounded Site Audit discovery

Site Audit now streams robots.txt and sitemap response bodies instead of materializing an unbounded body first.

The existing 6 MB limit is enforced against bytes actually received. `Content-Length` is used only for early rejection, so compressed, chunked, missing or understated headers cannot bypass the limit. Oversized streams are cancelled immediately; valid same-origin discovery behavior and the existing route/page sampling limits are unchanged.

Site Audit presentation was also split into focused report and finding components. This is an internal maintainability improvement: summaries, route families, findings, localized copy, export actions and visual-evidence behavior remain unchanged.

## Export compatibility

- Trace evidence JSON is now `schemaVersion: 2` and can include an optional auditor note on each event.
- Portable Memory JSON is now version 2 and can include notes on remembered static findings.
- Memory import continues to accept version 1 baselines.
- Existing report formats preserve their previous technical evidence while adding applicable notes.

## Release and test reliability

Release validation now uses tools pinned in the committed dependency graph, cleans stale `.output` content before production builds and uses the lockfile-pinned Playwright CLI for browser installation.

Coverage now instruments every production TypeScript/TSX module under `entrypoints/`, `lib/` and `shared/`. Aggregate project floors complement the existing exact-file thresholds for high-risk audit and runtime modules. New executable and browser regressions cover interactive-state rules, capture source binding, query budgets, event batching, lazy workspaces, Site Audit streaming, notes, Memory lifecycle and export compatibility.

## Privacy and permissions

0.2.8 adds no FocusTrace backend, account requirement, analytics pipeline, `chrome.debugger` access or new production permission.

Auditor notes, Memory history and retained audit evidence remain local unless the user explicitly exports them. The new runtime rules observe trusted interaction only and do not manufacture page states. Visual capture remains bounded, user-initiated and subject to the existing optional page/capture access model.

## Browser targets

Release targets remain:

- Google Chrome 114+;
- Chromium-based Microsoft Edge;
- Firefox 115+.

## Validation before publishing

Run the complete gate on the exact candidate commit before tagging:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

The final candidate must keep `package.json`, `package-lock.json`, generated Chrome/Edge/Firefox manifests, release documentation and `tests/release-contract.test.ts` aligned on `0.2.8`.

CI must be green on the exact commit intended for `v0.2.8`. Complete the manual checks in `docs/RELEASE_CHECKLIST.md`, especially trusted interactive-state evidence, auditor-note lifecycle and exports, default Memory/opt-out behavior, uninstall/reimport behavior, source-bound visual capture, Site Audit discovery and packaged browser smoke tests, before publishing production artifacts.
