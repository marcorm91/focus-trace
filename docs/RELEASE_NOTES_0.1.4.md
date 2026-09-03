# FocusTrace 0.1.4

FocusTrace 0.1.4 adds a dedicated **Structure** workspace for understanding how a page is built and integrates that structural evidence into reports without duplicating the full DOM or heading outline.

The release keeps the product focused on local accessibility debugging: static findings, document structure, runtime behavior and historical evidence remain separate but connected workflows.

## Highlights

### Structure workspace

The primary navigation is now **Review · Structure · Trace · Report**. The previous standalone Headings workspace is grouped under Structure with two complementary views:

- **Headings** — the existing H1–H6 hierarchy, review signals and page overlay;
- **Semantics** — concrete review suggestions for generic `div`/`span` elements used as buttons, links or headings, inline click handlers and generic tab stops;
- **Metrics** — accessibility-oriented counts for semantic regions, lists, forms, buttons, links, form controls, tables and images, with page highlighting from each metric.

Semantic suggestions are intentionally **not treated as automatic WCAG failures**. They identify patterns worth reviewing while leaving content intent to human judgement.

### On-demand DOM analysis

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

### Navigation and UI consistency

- Headings is now part of the broader Structure workspace instead of a fifth primary navigation item.
- The main navigation remains four clear areas without shrinking the existing 14px label floor.
- Structure receives a dedicated navigation icon while Trace and Report keep their existing mappings.
- English and Spanish copy has been updated across the workspace and report summaries.

### Test and reliability coverage

The release adds or updates coverage for:

- accessibility-oriented structural metric collection;
- heuristic semantic suggestions;
- large-DOM safety limits;
- Structure remaining idle until explicitly generated;
- Headings interactions after moving under Structure;
- compact document-structure reporting without duplicating the complete heading outline;
- component reports excluding page-global structure evidence.

## Privacy and permissions

Structure follows the existing local-first model. Structure evidence is generated only after an explicit user action and stays in the current sidepanel session.

Reports may reuse a compact subset of Structure evidence — metrics and semantic suggestions — without storing or exporting a parallel DOM tree. No page content or Structure data is sent to a FocusTrace server or third-party AI service.

Production page access remains optional and is requested only from explicit page actions such as **Analyze this page** or **Analyze / Refresh Structure**.

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
