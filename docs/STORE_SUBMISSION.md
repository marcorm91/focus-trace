# FocusTrace store submission

This document keeps the Chrome Web Store and Microsoft Edge Add-ons submission copy aligned with the actual extension behavior. It is not a substitute for the public privacy policy or the release checklist.

Current release candidate: **0.2.1**.

## Release positioning

- Product: FocusTrace
- Version: 0.2.1
- Supported targets: Chrome 114+ and Chromium-based Microsoft Edge
- Firefox: keep experimental until the manual Firefox smoke checklist in `RELEASE_CHECKLIST.md` has passed
- Architecture: Manifest V3, local-first, no required backend

FocusTrace should be positioned as an accessibility auditing and runtime debugging tool. Do not describe it as a certification tool and do not claim that a clean scan proves WCAG or EN 301 549 conformance.

## Suggested short description

Run local WCAG 2.2 checks, inspect document structure and debug keyboard focus, SPA navigation and dynamic accessibility behavior.

## Suggested store description

FocusTrace helps developers investigate web accessibility with local static checks, document-structure inspection and runtime focus debugging.

Analyze a full page or a selected component, inspect deterministic failures and review signals, use Structure to understand the page's semantic organization, then use Trace to understand keyboard focus, SPA transitions, dialogs and dynamic DOM behavior as it happens. Replay and Report keep the recorded evidence understandable, while optional FocusTrace Memory can retain bounded local history and visual context for repeated checks.

FocusTrace separates deterministic failures from contextual review signals, semantic suggestions and authoring warnings. It is designed to support accessibility debugging and review, not to certify that a page conforms to WCAG or EN 301 549.

Key capabilities include:

- local WCAG 2.2-oriented page and component analysis;
- accessible-name, language, text/non-text contrast, target-size/spacing, ARIA and HTML authoring checks;
- on-demand Structure workspace with heading outline, concrete semantic suggestions and accessibility-oriented structural metrics;
- runtime keyboard-focus and interaction tracing;
- conservative runtime review evidence for completely obscured focus, dragging interactions and potentially unexposed status messages;
- SPA navigation and dialog lifecycle evidence;
- read-only replay and consolidated reports;
- multipage audit history with bounded local visual context for recent reviewed pages;
- representative same-origin Site Audit sampling, including cross-page Consistent Help review evidence;
- actionable English/Spanish remediation guidance for selected static, runtime and Site Audit findings;
- native English/Spanish WebExtension metadata for extension name, description and toolbar action title;
- optional local accessibility history through FocusTrace Memory, including bounded element context for remembered failures.

By default, inspected page data is processed locally in the browser. FocusTrace does not require an account or a FocusTrace backend to run its analysis.

## Single purpose

FocusTrace has one purpose: help developers audit, understand and debug accessibility behavior on web pages, including static accessibility signals, relevant document structure and runtime keyboard-focus behavior.

Analyze, Structure, Trace, Replay, Report, Site Audit and Memory are complementary workflows for that same accessibility-debugging purpose.

## Permission justifications

### `activeTab`

Used to access the current tab after an explicit user action such as Analyze, Analyze Structure or Trace. FocusTrace does not require permanent access to every website for normal single-page use. The same user-initiated analysis context may also be used for bounded local visual evidence when a full-page review is added to the multipage audit, and for a small Memory preview when Memory is explicitly enabled.

### `scripting`

Used to run the local FocusTrace scanner, generate an explicitly requested Structure snapshot, run runtime instrumentation in pages the user chooses to inspect, locate current report targets, and prepare bounded local visual context where the corresponding feature allows it.

### `storage`

Used for extension preferences, per-tab/session state, multipage audit history and optional FocusTrace Memory.

A full-page analysis can add or replace one page in the active multipage audit. Audit storage is bounded by audit/page counts, a visual-evidence budget and an overall serialized-size budget. A reviewed page can retain up to three small local visual crops so its audit PDF can preserve context after navigation. When storage pressure requires pruning, older audit history or visual crops are removed before the newest active review.

Memory is disabled by default. When enabled, it can store bounded local diagnostic observations, compact element locators and small compressed visual previews for selected remembered failures. It does not store page HTML, full DOM snapshots or full-page screenshots as Memory history.

Structure snapshots are generated on demand and remain in the active sidepanel/sidebar session. Reports can reuse compact Structure metrics and semantic suggestions; Structure does not persist a parallel DOM tree as report or Memory history.

### `sidePanel` (Chromium)

Used to provide the main FocusTrace interface alongside the page being inspected.

### Optional `http://*/*` and `https://*/*` host access

Requested only from explicit user actions when functionality needs page access beyond the transient active-tab grant. This includes actions such as Analyze, Analyze / Refresh Structure and Site Audit. Site Audit requests access for the selected same-origin site so it can discover and analyze representative pages.

### Optional `<all_urls>` visual-capture access

Used when the user explicitly requests visual evidence for a printable single-page report or Site Audit export and the browser requires broader screenshot capability. The broader capture permission is requested from the user action and is released after capture when FocusTrace acquired it for that operation.

Multipage audit review crops and FocusTrace Memory previews do not add a persistent `<all_urls>` grant. They use the active-tab/page-access context already established for the explicit analysis and record an unavailable/fallback state when the browser cannot capture the visible tab.

## Remote code

FocusTrace does not intentionally execute remotely hosted JavaScript or download executable code at runtime. Standards snapshots used by the scanner are generated at build/repository time and shipped with the extension.

## Data-use declaration basis

FocusTrace may inspect website content necessary to provide its user-facing accessibility analysis, such as DOM structure and attributes, accessible-name/role information, rendered contrast and target-geometry evidence, focus transitions, selected runtime mutations, status-message candidates, URL/title context and local visual evidence associated with the requested feature.

An explicitly generated Structure snapshot can include bounded accessibility-oriented metrics plus selectors and evidence for concrete semantic review suggestions. Reports may reuse the compact metrics/suggestions subset; exporting a report does not trigger another Structure scan.

Multipage audits keep the latest saved full-page analysis for each normalized URL and may retain bounded local screenshot crops for recent reviews. Re-analyzing the same normalized URL replaces its prior scan and its saved audit visual evidence. Historical Trace and Structure snapshots are not persisted as part of a historical page review.

If the user explicitly enables FocusTrace Memory, bounded local history may include hashed finding/scope identities, generic rule identifiers, counts, timestamps, compact element locators and a limited number of small local visual previews. These values remain in the browser profile unless the user exports or otherwise shares data outside FocusTrace.

The default product is local-first. The submission declarations must remain consistent with `PRIVACY.md`; do not claim that FocusTrace accesses no website data, because inspecting the selected page is fundamental to the product.

FocusTrace currently has no product analytics or behavioral telemetry pipeline and does not require a FocusTrace account/backend for analysis.

## Voluntary support

FocusTrace exposes an optional external **Support FocusTrace** link in the About view and a compact footer across the side-panel views and Site Audit. The configured destination is the public GitHub Sponsors page:

`https://github.com/sponsors/marcorm91`

Core functionality remains available without payment. Sponsorship does not unlock features, remove limits or change analysis behavior. The destination opens externally in a new tab, and FocusTrace does not process payment-card or bank-account details itself. Support links are excluded from printed/exported reports.

## Publication blocker: public privacy URL

Before submitting an updated package to Chrome Web Store or Edge Add-ons, provide a publicly accessible privacy-policy URL that contains the policy represented by `PRIVACY.md`.

A URL that requires authentication is not suitable as the store privacy-policy URL.

Record the final public URLs here before submission:

- Privacy policy URL: **TODO — public URL required**
- Voluntary support URL: `https://github.com/sponsors/marcorm91`
- Support/contact URL: **TODO — public contact destination required**

## Assets to prepare

- current extension icon/logo in the store-required sizes;
- screenshots showing Analyze, Structure and Trace as the primary workflows;
- optionally one screenshot for Report, Site Audit or FocusTrace Memory;
- concise captions that describe observable functionality without claiming certification or complete WCAG/EN 301 549 coverage.

## Final submission gate

Before uploading the production ZIP for 0.2.1:

1. Complete `npm run release:check:full` on the release candidate.
2. Confirm CI is green on the exact commit intended for `v0.2.1`.
3. Complete the manual WCAG 2.2 regression, native EN/ES browser i18n, Structure, multipage Report and FocusTrace Memory smoke items in `RELEASE_CHECKLIST.md`.
4. Smoke-test the unpacked production Chromium build.
5. Confirm production manifests contain only the intended required and optional permissions.
6. Confirm the public privacy-policy, support/contact and voluntary-support URLs resolve without authentication.
7. Review the final store declarations against `PRIVACY.md` and actual behavior, including target-geometry evidence, runtime status-message candidates, on-demand Structure evidence, bounded multipage-audit visual evidence and opt-in Memory previews/locators.
8. Tag the exact approved commit as `v0.2.1` only after the release candidate is accepted.
