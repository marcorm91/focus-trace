# Site Audit methodology

Site Audit is FocusTrace's bounded, local-first multi-page analysis workflow. It uses the same page scanner as normal Analysis and adds site discovery, route-family grouping, representative sampling and cross-run comparison. It is not a crawler intended to exhaustively certify every URL on a site.

## Scope modes

### Automatic discovery

Automatic mode starts at the selected same-origin root and can combine `robots.txt`, declared or conventional sitemaps and internal links visible from the source page. The user can configure lower limits while FocusTrace retains hard safety caps of **500 discovered URLs**, **30 scanned pages** and **3 samples per route family**.

The user can also provide path-prefix exclusions. A matching path is not scanned. Exclusions, duplicate normalized URLs and candidates rejected by the configured safety limit are represented as bounded discovery decisions so the report can explain why a page was included or excluded.

### Manual URLs

Manual mode accepts explicit same-origin URLs or relative paths and scans only those pages, up to the configured scan limit. It does not discover or add other pages. Results are still grouped by route family for reporting.

### Current browser session

Current-session mode is intended for private routes that the user can already access in the browser. FocusTrace does not automate sign-in and exposes no credential fields. The user signs in normally, then supplies the same-origin private routes to scan. Temporary scan tabs reuse the browser's current session in the normal way.

FocusTrace does **not** persist passwords, cookies or session tokens. URL normalization removes embedded credentials, tracking parameters and common credential/session query keys before URLs enter Site Audit results. Persisted Site Audit baseline history is stricter: it stores no sampled page URLs or query values at all.

## URL normalization and canonical evidence

Before grouping, FocusTrace keeps discovery on the requested origin, removes fragments, embedded URL credentials, common tracking parameters and common credential/session query parameters, sorts remaining query parameters and normalizes trailing slashes. Equivalent normalized URLs collapse to one discovery target and duplicate candidates remain explainable as excluded discovery evidence.

If a sampled page exposes a different document canonical URL through the existing Structure evidence, Site Audit surfaces that canonical relationship in the report. The scan evidence is retained; the canonical alias is not silently treated as proof that two documents are identical.

## Route families and deterministic sampling

Route-family inference preserves the top-level information architecture and generalizes clearly dynamic identifiers and repeated lower-level instance segments. Families and URLs are sorted before sampling so equivalent deterministic input produces the same grouping and sample set.

Automatic mode first selects one page from as many route families as the scan limit allows. Additional samples are then spread through larger families, up to the configured per-family limit. Every sampled page carries a selection reason (`family-first` or `family-spread`) that is exposed in the report. Manual and current-session pages use explicit selection reasons instead.

Representative sampling is evidence about the sampled pages and inferred family; it is not proof that every URL in the family has identical accessibility behavior.

## Baseline comparison

After a completed Site Audit, FocusTrace derives a redacted baseline from aggregated finding identity only. A baseline contains:

- origin and generation time;
- a fingerprint of the audit scope rather than raw selected/private URLs;
- route pattern, FocusTrace rule ID and normalized target shape;
- outcome, severity and bounded sample counts.

The local store is bounded to **12 Site Audit baselines**. It contains no page text, DOM excerpts, passwords, cookies, session tokens or sampled/private page URLs.

When the next audit for the same origin has a compatible scope, findings are classified as:

- `new`: the current finding identity did not exist in the previous baseline;
- `persistent`: identity and bounded evidence are unchanged;
- `changed`: the identity remains but outcome, severity or sample coverage changed;
- `resolved`: a previous finding identity is absent from the compatible current baseline.

If the mode, configured limits/exclusions or selected route-family scope is incompatible, FocusTrace starts a new comparison baseline and does **not** infer resolved findings from absence.

## Privacy and permissions

Site Audit remains local-first. It uses the extension's existing optional same-origin access and `storage` permission; this feature adds no new persistent host permission, remote service, axe-core runtime dependency or Deque API dependency. Discovery evidence and baseline history stay in extension-local storage unless the user explicitly exports a report.
