# FocusTrace store submission

This document keeps the Chrome Web Store, Microsoft Edge Add-ons and Firefox release copy aligned with the actual extension behavior. It is not a substitute for the public privacy policy or the release checklist.

Current release candidate: **0.2.7**.

## Release positioning

- Product: FocusTrace
- Version: 0.2.7
- Supported targets: Chrome 114+ and Chromium-based Microsoft Edge
- Firefox: Firefox 115+ packaged target; keep the public support claim conservative until the manual Firefox packaged-build and DevTools smoke checklist in `RELEASE_CHECKLIST.md` has passed
- Architecture: Manifest V3, local-first, no required backend

FocusTrace should be positioned as an accessibility auditing and runtime debugging tool. Do not describe it as a certification tool and do not claim that a clean scan proves WCAG or EN 301 549 conformance.

## Suggested short description

Run local WCAG 2.2 checks, inspect document structure and debug keyboard focus, DOM targets and dynamic accessibility behavior.

## Suggested store description

FocusTrace helps developers investigate web accessibility with local static checks, standards traceability, document-structure inspection and runtime focus debugging.

Analyze a full page or a selected component, inspect deterministic failures and contextual review signals, add editable auditor notes, use Structure to understand the page's semantic organization, then use Trace to understand keyboard focus, SPA transitions, dialogs and dynamic DOM behavior as it happens. Replay and Report keep the recorded evidence understandable, while user-controllable FocusTrace Memory retains bounded local history and visual context for repeated checks by default.

FocusTrace separates deterministic failures from contextual review signals, semantic suggestions and authoring warnings. Its Standards Coverage view explains what WCAG 2.2 evidence the product can collect and maps Level A/AA criteria to the corresponding EN 301 549 V4.1.1 clause-9 numbering where applicable. That traceability is not a claim of complete criterion coverage, WCAG conformance, EN 301 549 conformity or certification.

Key capabilities include:

- local WCAG 2.2-oriented page and component analysis;
- a conservative Standards Coverage matrix distinguishing Automated, Review, Runtime, Site Audit, Manual and Not covered evidence;
- EN 301 549 V4.1.1 (2026-09) clause-9 traceability for WCAG 2.2 Level A/AA references without converting coverage into a conformance claim;
- accessible-name, language, text/non-text contrast, target-size/spacing, ARIA and HTML authoring checks;
- conservative WCAG review evidence for prerecorded media alternatives/captions, audio description/media alternatives, live captions, keyboard operability/traps, pointer cancellation, form error identification/suggestions, bypass mechanisms, explicit input purpose, language of parts and text spacing;
- on-demand Structure workspace with heading outline, concrete semantic suggestions and accessibility-oriented structural metrics prepared with the full-page analysis;
- compact affected-element location with separate **Highlight on page** and **Inspect in DOM** actions;
- a dedicated FocusTrace panel inside Chrome, Edge and Firefox Developer Tools that reuses the same Review, Structure, Trace and Report workspace;
- native DOM reveal from a finding to Chrome/Edge **Elements** or Firefox **Inspector** without moving keyboard focus on the inspected page;
- runtime keyboard-focus and interaction tracing;
- conservative runtime review evidence for completely obscured focus, dragging interactions, pointer/keyboard behavior, potentially unexposed status messages and real-keyboard focus visibility;
- SPA navigation and dialog lifecycle evidence;
- read-only replay and consolidated reports;
- editable and removable auditor notes on static findings and Trace events, included in local reports and structured exports;
- multipage audit history with bounded local visual context for recent reviewed pages;
- representative same-origin Site Audit sampling, including Consistent Help, Consistent Navigation and Consistent Identification review evidence;
- actionable English/Spanish remediation guidance for selected static, runtime and Site Audit findings;
- native English/Spanish WebExtension metadata for extension name, description and toolbar action title;
- default-enabled local accessibility history through FocusTrace Memory, including bounded element context and notes for remembered findings, with a Settings opt-out.

By default, inspected page data is processed locally in the browser. FocusTrace does not require an account or a FocusTrace backend to run its analysis.

## Single purpose

FocusTrace has one purpose: help developers audit, understand and debug accessibility behavior on web pages, including static accessibility signals, standards-linked review evidence, relevant document structure and runtime keyboard-focus behavior.

Analyze, Structure, Trace, Replay, Report, Site Audit, Memory and the DevTools surface are complementary workflows for that same accessibility-debugging purpose.

## Permission justifications

### `activeTab`

Used to access the current tab after an explicit user action such as Analyze or Trace. FocusTrace does not require permanent access to every website for normal single-page use. The same user-initiated analysis context may also be used for bounded local visual evidence when a full-page review is added to the multipage audit, for a small Memory preview while Memory is enabled, and for temporary Focus Visible comparison captures during a manually recorded real-Tab Trace.

### `scripting`

Used to run the local FocusTrace scanner, generate the bounded Structure snapshot that accompanies an explicit full-page analysis or Structure refresh, run runtime instrumentation in pages the user chooses to inspect, locate current report targets, and prepare bounded local visual context where the corresponding feature allows it.

### `storage`

Used for extension preferences, per-tab/session state, parent-linked auditor notes, multipage audit history and FocusTrace Memory.

A full-page analysis can add or replace one page in the active multipage audit. Audit storage is bounded by audit/page counts, a visual-evidence budget and an overall serialized-size budget. A reviewed page can retain up to three small local visual crops so its audit PDF can preserve context after navigation. When storage pressure requires pruning, older audit history or visual crops are removed before the newest active review.

Memory is enabled by default and can be disabled in Settings. While enabled, it can store bounded local diagnostic observations, auditor notes, compact element locators and small compressed visual previews for selected remembered failures. Observations do not expire by age; count/capacity limits replace the oldest evidence. It does not store page HTML, full DOM snapshots or full-page screenshots as Memory history.

Browser-managed extension storage persists only while FocusTrace remains installed in the current profile. Uninstalling FocusTrace automatically removes its local Memory, notes, preferences and saved audit history. Reinstallation starts with empty extension storage unless the user explicitly exported portable Memory JSON before uninstalling and imports it afterwards; exported files themselves remain outside extension storage.

A full-page Analyze action prepares the current bounded Structure snapshot in the active FocusTrace session. Structure can also be refreshed explicitly after the page changes. Reports can reuse compact Structure metrics and semantic suggestions; Structure does not persist a parallel DOM tree as report or Memory history.

Temporary Focus Visible PNG captures are decoded and compared in memory only. They are not written to session storage, FocusTrace Memory, reports or exports.

### `sidePanel` (Chromium)

Used to provide the regular FocusTrace interface alongside the page being inspected. The 0.2.7 DevTools panel is an additional developer-focused surface and does not replace the side panel or require `chrome.debugger`.

### Optional `devtools` (Firefox)

Firefox 115+ packages the FocusTrace DevTools entrypoint, but the `devtools` permission remains optional. It is requested only after the user explicitly selects **Enable DevTools integration** in FocusTrace Settings.

Granting it makes the **F12 → FocusTrace** workflow available and allows findings to reveal their exact node in Firefox's native Inspector. Declining or removing it does not break the normal Firefox sidebar, Analyze, Structure, Trace or Report workflows. It does not grant permanent host access to inspected websites.

### Optional `http://*/*` and `https://*/*` host access

Requested only from explicit user actions when functionality needs page access beyond the transient active-tab grant. This includes actions such as Analyze, Structure refresh and Site Audit. Site Audit requests access for the selected same-origin site so it can discover and analyze representative pages.

### Optional `<all_urls>` visual-capture access

Used when the user explicitly requests visual evidence for a printable single-page report or when browser capture authority is required for a user-initiated visual-evidence flow. Broader capture permission is not a required installation-time permission and is released after the operation when FocusTrace acquired it temporarily.

Multipage audit review crops and FocusTrace Memory previews do not add a persistent `<all_urls>` grant. They use the active-tab/page-access context already established for the explicit analysis and record an unavailable/fallback state when the browser cannot capture the visible tab. Focus Visible runtime comparison likewise omits its review when safe capture evidence cannot be established.

## DevTools and DOM-inspection boundary

Inside browser DevTools, FocusTrace can resolve a saved CSS selector in the inspected page and use the DevTools `inspect()` utility to select the node in Chrome/Edge **Elements** or Firefox **Inspector**.

This operation changes the developer-tools selection only. FocusTrace does not call `element.focus()` to reveal the node, does not intentionally change the page's keyboard-focus state, does not persist a new full-DOM copy, and does not use `chrome.debugger`.

Outside DevTools, **Inspect in DOM** remains visible but unavailable with guidance to open **F12 → FocusTrace**. Browsers do not expose a supported extension API that lets the regular side panel/sidebar programmatically open Developer Tools and activate a custom extension panel.

## Remote code

FocusTrace does not intentionally execute remotely hosted JavaScript or download executable code at runtime. Standards snapshots used by the scanner are generated at build/repository time and shipped with the extension.

## Data-use declaration basis

FocusTrace may inspect website content necessary to provide its user-facing accessibility analysis, such as DOM structure and attributes, accessible-name/role information, rendered contrast and target-geometry evidence, focus transitions, selected runtime mutations, media/form/keyboard-pointer evidence, status-message candidates, URL/title context and local visual evidence associated with the requested feature.

An explicit full-page analysis can generate a bounded Structure snapshot containing accessibility-oriented metrics plus selectors and evidence for concrete semantic review suggestions. Reports may reuse the compact metrics/suggestions subset; exporting a report does not trigger another Structure scan.

Standards Coverage metadata and EN 301 549 clause mappings are product/reference metadata shipped with FocusTrace; they do not represent a remote certification service or upload inspected-page data to a standards backend.

During an active manual Trace, a trusted real Tab/Shift+Tab transition can cause temporary visible-tab captures to be decoded and compared for bounded Focus Visible review evidence. Those temporary images are not retained after the comparison.

Multipage audits keep the latest saved full-page analysis for each normalized URL and may retain bounded local screenshot crops for recent reviews. Re-analyzing the same normalized URL replaces its prior scan and its saved audit visual evidence. Historical Trace and Structure snapshots are not persisted as part of a historical page review.

While FocusTrace Memory is enabled, bounded local history may include hashed finding/scope identities, generic rule identifiers, counts, timestamps, attached auditor notes, compact element locators and a limited number of small local visual previews. These values remain in extension storage within the current browser profile until FocusTrace prunes them for capacity, the user clears them or the browser removes them automatically when FocusTrace is uninstalled. Exporting or otherwise sharing a file copies selected data outside FocusTrace and does not remove the local original.

The default product is local-first. The submission declarations must remain consistent with `PRIVACY.md`; do not claim that FocusTrace accesses no website data, because inspecting the selected page is fundamental to the product.

FocusTrace currently has no product analytics or behavioral telemetry pipeline and does not require a FocusTrace account/backend for analysis.

## Voluntary support

FocusTrace exposes an optional external **Support FocusTrace** link in the About view and a compact footer across the side-panel views and Site Audit. The configured destination is the public GitHub Sponsors page:

`https://github.com/sponsors/marcorm91`

Core functionality remains available without payment. Sponsorship does not unlock features, remove limits or change analysis behavior. The destination opens externally in a new tab, and FocusTrace does not process payment-card or bank-account details itself. Support links are excluded from printed/exported reports.

## Publication blocker: public privacy URL

Before submitting an updated package to a browser store, provide a publicly accessible privacy-policy URL that contains the policy represented by `PRIVACY.md`.

A URL that requires authentication is not suitable as the store privacy-policy URL.

Record the final public URLs here before submission:

- Privacy policy URL: **TODO — public URL required**
- Voluntary support URL: `https://github.com/sponsors/marcorm91`
- Support/contact URL: **TODO — public contact destination required**

## Assets to prepare

- current extension icon/logo in the store-required sizes;
- screenshots showing Analyze, Structure and Trace as the primary workflows;
- add a 0.2.7 screenshot showing **F12 → FocusTrace → Inspect in DOM** in the native browser inspector;
- optionally one screenshot for Report, Site Audit or FocusTrace Memory;
- concise captions that describe observable functionality without claiming certification or complete WCAG/EN 301 549 coverage.

## Final submission gate

Before uploading the production ZIP for 0.2.7:

1. Complete `npm run release:check:full` on the release candidate.
2. Confirm CI is green on the exact commit intended for `v0.2.7`.
3. Complete the manual Standards Coverage/EN 301 549, WCAG 2.2 regression, native EN/ES browser i18n, Structure, DevTools DOM inspection, multipage Report and FocusTrace Memory smoke items in `RELEASE_CHECKLIST.md`.
4. Smoke-test the unpacked production Chrome and Edge builds, including the regular side panel and **F12 → FocusTrace → Inspect in DOM** flow.
5. Complete the Firefox 115+ packaged-build smoke, including the optional DevTools permission and native Inspector path, before making a broad Firefox support claim.
6. Confirm production manifests contain only the intended required and optional permissions and that Firefox `devtools` remains optional.
7. Confirm the public privacy-policy, support/contact and voluntary-support URLs resolve without authentication.
8. Review the final store declarations against `PRIVACY.md` and actual behavior, including standards traceability, media/form/keyboard-pointer review evidence, target-geometry evidence, Focus Visible temporary captures, runtime status-message candidates, auditor notes and their exports, unified Structure evidence, DevTools DOM selection, bounded multipage-audit visual evidence and default-enabled Memory notes/previews/locators.
9. Tag the exact approved commit as `v0.2.7` only after the release candidate is accepted.
