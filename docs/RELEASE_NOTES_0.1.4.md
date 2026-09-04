# FocusTrace 0.1.4

FocusTrace 0.1.4 adds a dedicated **Structure** workspace for understanding accessibility-relevant page structure and integrates that evidence into reports without duplicating the complete heading outline.

The release keeps the product focused on local accessibility debugging: static findings, document structure, runtime behavior and historical evidence remain separate but connected workflows.

## Highlights

### Structure workspace

The primary navigation is now **Review · Structure · Trace · Report**. The previous standalone Headings workspace is grouped under Structure with three complementary views:

- **Headings** — the existing H1–H6 hierarchy, review signals and page overlay;
- **Semantics** — concrete review suggestions for generic `div`/`span` elements used as buttons, links or headings, inline click handlers and generic tab stops;
- **Metrics** — accessibility-oriented counts for semantic regions, lists, forms, buttons, links, form controls, tables and images, with page highlighting from each metric.

Semantic suggestions are intentionally **not treated as automatic WCAG failures**. They identify patterns worth reviewing while leaving content and interaction intent to human judgement.

### On-demand structural analysis

Opening Structure does not inspect or continuously recalculate the DOM. Headings reuses the current page analysis; Semantics and Metrics are generated only from an explicit **Analyze structure** or **Refresh** action.

Safety limits keep the feature predictable on large pages:

- up to 10,000 sampled DOM elements by default;
- no parallel visual DOM tree;
- no repeated-sibling or wrapper-chain heuristics;
- an explicit limited-snapshot notice when the sampling threshold is reached.

No MutationObserver or continuous Structure watcher is introduced.

### Document structure in reports

The report no longer repeats the complete H1–H6 tree already available under Structure → Headings.

Section 03 is now **Document structure / Estructura del documento** and focuses on conclusions:

- total headings and headings requiring review;
- only headings with structural signals;
- accessibility-oriented structural metrics when Structure has already been analyzed;
- concrete semantic suggestions for generic interactive/heading markup;
- a passive explanation when Structure evidence has not been generated.

The sidepanel report, printable PDF and TXT export reuse the compact Structure evidence already available. Exporting a report does not trigger another DOM scan or persist a parallel DOM tree.

Component-scoped reports continue to avoid mixing page-global document structure into component-only static evidence.

### Multipage audits and reports

- Repeated scans of the same normalized URL update the saved page instead of duplicating it in the audit.
- Each reviewed page keeps its own review timestamp.
- Moving to another site lets the user add the page to the current audit or start a new audit.
- The Report workspace keeps an expandable history of reviewed pages; opening a saved page reveals its report and summary.
- Multipage PDF export uses one audit cover followed by one section per reviewed page.
- A full-page audit review can retain up to three bounded local screenshot crops for eligible findings, so visual evidence remains available after navigating to another audited page.
- Re-analyzing a page replaces its previous visual crops together with the scan result; audit PDFs explicitly identify reviews whose visual evidence could not be captured or was trimmed by the local storage budget.
- Single-page PDF visual capture now attempts valid active-tab capture instead of returning zero screenshots solely because the optional broad screenshot grant is absent. Runtime-only report findings are also eligible for visual evidence.

### Navigation and UI consistency

- Headings is now part of the broader Structure workspace instead of a fifth primary navigation item.
- The main navigation remains four clear areas without shrinking the existing 14px label floor.
- Structure receives a dedicated navigation icon while Trace and Report keep their existing mappings.
- Neutral no-data / analyze-first states share the same visual treatment across Review, Structure, Trace, Replay, Runtime, Focus Graph, Headings and Report.
- Section subtitles wrap instead of truncating explanatory copy with ellipses.
- Report history and report sections use the shared FocusTrace disclosure chevrons.
- English and Spanish copy has been updated across the workspace and report summaries.

### Test and reliability coverage

The release adds or updates coverage for:

- accessibility-oriented structural metric collection;
- concrete semantic suggestions;
- large-DOM sampling safety limits;
- Structure remaining idle until explicitly analyzed;
- Headings interactions after moving under Structure;
- compact document-structure reporting without duplicating the complete heading outline;
- component reports excluding page-global structure evidence;
- multipage audit deduplication, visual-evidence replacement and expandable report history;
- uncapped single-page visual export with bounded multipage persistence;
- consistent neutral empty states across the sidepanel.

## Privacy and permissions

Structure follows the existing local-first model. Structure evidence is generated only after an explicit user action and stays in the current sidepanel session.

Reports may reuse a compact subset of Structure evidence — metrics and semantic suggestions — without storing or exporting a parallel DOM tree. Multipage audits may retain bounded local screenshot crops for the latest reviewed pages so their PDF can preserve visual context after navigation. No page content, screenshots or Structure data are intentionally sent to a FocusTrace server or third-party AI service.

Production page access remains optional and is requested only from explicit page actions such as **Analyze this page** or **Analyze / Refresh Structure**. Optional broad screenshot access used by a single-page printable export remains scoped to that export operation.

## Browser targets

Release targets remain:

- Chrome 114+
- Microsoft Edge based on Chromium
- Firefox 115+ as an experimental pre-release target pending the manual packaged-build smoke checklist

## Release validation

Before publishing this release, run:

```bash
npm run release:check:full
npm audit --omit=dev
npm audit
```

Manual packaged-browser smoke testing is still required before treating the generated artifacts as the final release packages, especially for the experimental Firefox target.
