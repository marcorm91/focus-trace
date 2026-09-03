# FocusTrace Privacy Policy

FocusTrace is designed as a **local-first accessibility debugging tool**. Its default product architecture does not require a FocusTrace account or a FocusTrace-operated backend.

## What FocusTrace analyzes

When you explicitly run an analysis, generate Structure evidence or record a Trace session, FocusTrace may inspect information from the active page that is necessary to provide the requested accessibility debugging feature, including:

- DOM structure and element attributes;
- accessible-name and role-related information;
- rendered color and contrast evidence;
- keyboard and pointer interactions recorded during Trace;
- focus transitions and selected DOM mutations;
- SPA route and dialog lifecycle evidence;
- page title, URL and other report context;
- optional visible-element screenshot crops stored locally by FocusTrace Memory when Memory is enabled;
- optional visible-page screenshot crops when the user explicitly includes visual evidence in a printable report.

## Where that data goes

FocusTrace processes analysis, Structure and runtime evidence locally in the browser.

FocusTrace does not intentionally send inspected-page content, DOM evidence, screenshots or recorded interactions to a FocusTrace server or third-party AI service.

Session data and preferences may be stored using browser extension storage so the product can preserve state and user settings. Browser storage is controlled by the browser profile and browser platform.

## Structure evidence

Structure is an on-demand accessibility view of the current page. Opening the Structure workspace does not automatically traverse, observe or continuously recalculate the page DOM. Headings reuses the current page analysis; Semantics and Metrics are generated only after an explicit **Analyze structure** or **Refresh** action.

The resulting Structure snapshot is kept in the current sidepanel/sidebar session. It contains bounded accessibility-oriented counts plus the selectors, semantic roles, labels and evidence needed for the concrete semantic suggestions shown to the user. The collector applies a sampling safety limit on large pages and does not use a continuous MutationObserver for Structure.

When a session report is exported after Structure has already been analyzed, FocusTrace may reuse a compact report subset containing Structure metrics and semantic review suggestions. Generating or exporting a report does not trigger a second Structure collection automatically.

Structure evidence is diagnostic context, not a WCAG conformance claim. Suggestions such as replacing a generic interactive element with native HTML still require human review of the element's actual purpose.

## FocusTrace Memory

FocusTrace Memory is an optional local history feature for comparing accessibility observations over time. It is **disabled by default after installation** and does not begin remembering scan history until the user explicitly enables **Remember accessibility history** in Settings.

When enabled, Memory stores bounded local observation data such as hashed scope/finding fingerprints, generic FocusTrace rule identifiers, result counts, rule-coverage counts and timestamps. To make a historical finding understandable after it is no longer reproduced, Memory may also keep a compact locator for the affected element, such as an HTML id or CSS selector.

During an explicit page or component analysis, if an affected element is currently visible and the browser permits visible-tab capture, Memory may save a small JPEG screenshot crop around that element. The crop is generated locally and is intended only to identify which visible component the historical finding referred to. FocusTrace does not store a full-page screenshot for Memory. If a preview cannot be captured, the compact element locator is used as the fallback context.

Memory does not store page HTML or full DOM snapshots. A saved locator or screenshot crop can itself contain information derived from the inspected page, so users should enable Memory only when they are comfortable retaining this bounded evidence in the current browser profile.

Memory is bounded so it cannot grow without limit. The current limits are:

- up to 8 observations for the same remembered page/component scope;
- up to 200 observations across the browser profile;
- up to 24 visual previews across remembered findings, retaining only the newest preview for a given finding;
- observations older than 90 days are removed the next time FocusTrace reads Memory storage.

When a finding is no longer reproduced, the user can explicitly mark it as resolved. FocusTrace then removes that finding from the detailed remembered observations, including its stored locator and any saved visual preview, so it no longer appears in the normal finding history. To recognize the same finding if it returns later, FocusTrace keeps only a compact resolved marker containing the hashed scope/finding identity, the generic FocusTrace rule identifier when known, and the resolution timestamp. Resolved markers do not contain the failing locator, screenshot preview, page text, HTML or DOM snapshots. They are also pruned after 90 days and capped at 200 compact markers.

Turning Memory off stops new observations, locators, visual previews and comparisons. Existing local Memory history remains local until it is removed by the retention cleanup or the user explicitly clears it. **Clear saved history** remains available in Settings even while Memory is disabled and clears observation history, saved Memory evidence and resolved markers.

Enabling Memory establishes the opt-in point and does not retroactively add an analysis that was already open before opt-in. Eligible observations and their available local evidence are persisted when a scan is saved, independently of which FocusTrace results view the user opens afterwards.

Memory comparisons are diagnostic history, not a WCAG conformance claim. A previously recorded deterministic failure that is no longer reproduced can be reported as a historical change, but absence from a later scan does not by itself prove that the whole page or component conforms to WCAG.

## Visual evidence

FocusTrace has two local visual-evidence flows:

1. **Memory previews.** When Memory is enabled, an explicit analysis may retain a small crop of a currently visible failing element as described above. If capture is unavailable, Memory falls back to a compact locator.
2. **Printable-report evidence.** Visual evidence in printable reports is optional and user initiated. When requested, FocusTrace may temporarily request the browser permission required to capture the visible page.

Screenshot crops can contain information visible on the inspected page. They are prepared and stored locally for the feature that requested them and are not intentionally transmitted by FocusTrace.

Users should review exported reports before sharing them with third parties and should clear Memory history when retained local evidence is no longer appropriate for the browser profile.

## Permissions

FocusTrace uses extension permissions only for product functionality such as analyzing web pages selected by the user, generating an explicitly requested Structure snapshot, injecting local instrumentation and storing preferences/session state.

Production builds do not require host access at installation. On an explicit page action such as **Analyze this page** or **Generate / Refresh Structure**, FocusTrace may request optional HTTP/HTTPS page access before it can read the selected tab and inject or execute the required local runtime. Browsers can retain that optional grant until the user revokes it from the extension's site-access settings. The grant permits local inspection; it does not change the policy that inspected-page data is not intentionally transmitted by FocusTrace.

When Memory is enabled, FocusTrace may attempt a visible-tab capture during the explicit analysis to create a small local evidence crop. This Memory flow uses the active-tab/page-access context already established for the user-requested analysis and does not request persistent broad `<all_urls>` screenshot access. If capture is unavailable, Memory records only the compact locator fallback.

Broader `<all_urls>` screenshot access, when required by the browser API for printable-report visual evidence, is requested from an explicit export action and removed after use.

The current permission model is documented in [`README.md`](README.md) and validated by the repository's browser-build checks.

## External links

FocusTrace may provide links to standards documentation, the project repository, contact pages and voluntary project-support pages. Opening those destinations is governed by the privacy policies of the external service. FocusTrace does not treat use of those services as part of its local accessibility analysis.

## Voluntary sponsorship

FocusTrace provides optional links to the project's public GitHub Sponsors page at `https://github.com/sponsors/marcorm91` from interactive support surfaces such as About, the global side-panel footer and Site Audit. These support links do not appear in printed/exported reports.

Sponsorship is entirely optional. It does not unlock features, remove limits or change FocusTrace analysis behavior.

GitHub Sponsors and its payment-processing services handle the financial transaction. FocusTrace itself does not collect or process payment-card or bank-account details. Following a support link opens the external GitHub Sponsors service in a new tab, where GitHub's own terms and privacy policy apply.

## Telemetry and analytics

FocusTrace currently has no product analytics or behavioral telemetry pipeline. A contribution must not add telemetry or transmission of inspected-page data without an explicit privacy review and an update to this policy before release.

## Security

Security-sensitive privacy issues should be reported according to [`SECURITY.md`](SECURITY.md), not posted publicly with affected page data or exploit details.

## Changes to this policy

Material changes to FocusTrace data collection, external transmission, permissions or third-party services should update this document in the same pull request that introduces the behavior.

The repository history is the source of record for changes to this policy.
