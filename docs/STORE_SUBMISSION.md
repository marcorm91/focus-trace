# FocusTrace store submission

This document keeps the Chrome Web Store and Microsoft Edge Add-ons submission copy aligned with the actual extension behavior. It is not a substitute for the public privacy policy or the release checklist.

Current release candidate: **0.1.3**.

## Release positioning

- Product: FocusTrace
- Version: 0.1.3
- Supported targets: Chrome 114+ and Chromium-based Microsoft Edge
- Firefox: keep experimental until the manual Firefox smoke checklist in `RELEASE_CHECKLIST.md` has passed
- Architecture: Manifest V3, local-first, no required backend

FocusTrace should be positioned as an accessibility auditing and runtime debugging tool. Do not describe it as a certification tool and do not claim that a clean scan proves WCAG conformance.

## Suggested short description

Run local WCAG 2.2 checks and debug keyboard focus, SPA navigation, dialogs and dynamic accessibility behavior.

## Suggested store description

FocusTrace helps developers investigate web accessibility with local static checks and runtime focus debugging.

Analyze a full page or a selected component, inspect deterministic failures and review signals, then use Trace to understand keyboard focus, SPA transitions, dialogs and dynamic DOM behavior as it happens. Replay and Report keep the recorded evidence understandable, while optional FocusTrace Memory can retain bounded local history and visual context for repeated checks.

FocusTrace separates deterministic failures from contextual review signals and authoring warnings. It is designed to support accessibility debugging and review, not to certify that a page conforms to WCAG.

Key capabilities include:

- local WCAG 2.2-oriented page and component analysis;
- accessible-name, language, contrast, ARIA and HTML authoring checks;
- runtime keyboard-focus and interaction tracing;
- SPA navigation and dialog lifecycle evidence;
- read-only replay and consolidated reports;
- representative same-origin Site Audit sampling;
- optional local accessibility history through FocusTrace Memory, including bounded element context for remembered failures.

By default, inspected page data is processed locally in the browser. FocusTrace does not require an account or a FocusTrace backend to run its analysis.

## Single purpose

FocusTrace has one purpose: help developers audit and debug accessibility behavior on web pages, including static accessibility signals and runtime keyboard-focus behavior.

Analyze, Trace, Replay, Report, Site Audit and Memory are complementary workflows for that same accessibility-debugging purpose.

## Permission justifications

### `activeTab`

Used to access the current tab after an explicit user action such as Analyze or Trace. FocusTrace does not require permanent access to every website for normal single-page use. When Memory is explicitly enabled, the same user-initiated analysis context may also be used to create a small local crop of a currently visible failing element.

### `scripting`

Used to run the local FocusTrace scanner and runtime instrumentation in pages the user explicitly chooses to inspect, and to locate visible failing elements when optional Memory visual context is prepared.

### `storage`

Used for extension preferences, per-tab/session state and optional FocusTrace Memory. Memory is disabled by default. When enabled, it can store bounded local diagnostic observations, compact element locators and small compressed visual previews for selected remembered failures. It does not store page HTML, full DOM snapshots or full-page screenshots as Memory history.

### `sidePanel` (Chromium)

Used to provide the main FocusTrace interface alongside the page being inspected.

### Optional `http://*/*` and `https://*/*` host access

Requested only from explicit user actions when functionality needs page access beyond the transient active-tab grant. Site Audit requests access for the selected same-origin site so it can discover and analyze representative pages.

### Optional `<all_urls>` visual-capture access

Used when the user explicitly requests visual evidence for a printable report or Site Audit export and the browser requires broader screenshot capability. The broader capture permission is requested from the user action and is released after capture when FocusTrace did not already have it. FocusTrace Memory does not add a persistent `<all_urls>` grant for its small local previews; it uses the explicit active-tab analysis context and falls back to a compact locator when capture is unavailable.

## Remote code

FocusTrace does not intentionally execute remotely hosted JavaScript or download executable code at runtime. Standards snapshots used by the scanner are generated at build/repository time and shipped with the extension.

## Data-use declaration basis

FocusTrace may inspect website content necessary to provide its user-facing accessibility analysis, such as DOM structure and attributes, accessible-name/role information, rendered contrast evidence, focus transitions, selected runtime mutations, URL/title context and user-requested visual evidence.

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
- screenshots showing Analyze and Trace as the primary workflows;
- optionally one screenshot for Report, Site Audit or FocusTrace Memory;
- concise captions that describe observable functionality without claiming certification or complete WCAG coverage.

## Final submission gate

Before uploading the production ZIP for 0.1.3:

1. Complete `npm run release:check:full` on the release candidate.
2. Confirm CI is green on the exact commit intended for `v0.1.3`.
3. Complete the manual accessibility/self-audit and FocusTrace Memory smoke items in `RELEASE_CHECKLIST.md`.
4. Smoke-test the unpacked production Chromium build.
5. Confirm production manifests contain only the intended required and optional permissions.
6. Confirm the public privacy-policy, support/contact and voluntary-support URLs resolve without authentication.
7. Review the final store declarations against `PRIVACY.md` and actual behavior, including opt-in Memory previews and locators.
8. Tag the exact approved commit as `v0.1.3` only after the release candidate is accepted.
