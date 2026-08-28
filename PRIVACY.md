# FocusTrace Privacy Policy

FocusTrace is designed as a **local-first accessibility debugging tool**. Its default product architecture does not require a FocusTrace account or a FocusTrace-operated backend.

## What FocusTrace analyzes

When you explicitly run an analysis or Trace session, FocusTrace may inspect information from the active page that is necessary to provide the requested accessibility debugging feature, including:

- DOM structure and element attributes;
- accessible-name and role-related information;
- rendered color and contrast evidence;
- keyboard and pointer interactions recorded during Trace;
- focus transitions and selected DOM mutations;
- SPA route and dialog lifecycle evidence;
- page title, URL and other report context;
- optional visible-page screenshot crops when the user explicitly includes visual evidence in a printable report.

## Where that data goes

FocusTrace processes analysis and runtime evidence locally in the browser.

FocusTrace does not intentionally send inspected-page content, DOM evidence, screenshots or recorded interactions to a FocusTrace server or third-party AI service.

Session data and preferences may be stored using browser extension storage so the product can preserve state and user settings. Browser storage is controlled by the browser profile and browser platform.

## FocusTrace Memory

FocusTrace Memory is an optional local history feature for comparing accessibility observations over time. It is **disabled by default after installation** and does not begin remembering scan history until the user explicitly enables **Remember accessibility history** in Settings.

When enabled, Memory stores compact local observation data such as hashed scope/finding fingerprints, generic FocusTrace rule identifiers, result counts, rule-coverage counts and timestamps. The rule identifier lets the interface describe which known finding changed across remembered observations without storing the failing selector. Memory does not store page HTML, full DOM snapshots, failing selectors or screenshots as part of the history.

Memory is bounded so it cannot grow without limit. The current limits are:

- up to 8 observations for the same remembered page/component scope;
- up to 200 observations across the browser profile;
- observations older than 90 days are removed the next time FocusTrace reads Memory storage.

Turning Memory off stops new observations and comparisons. Existing local Memory history remains local until it is removed by the retention cleanup or the user explicitly clears it. **Clear saved history** remains available in Settings even while Memory is disabled.

Enabling Memory establishes the opt-in point and does not retroactively add an analysis that was already open before opt-in. Eligible observations are persisted when a scan is saved, independently of which FocusTrace results view the user opens afterwards.

Memory comparisons are diagnostic history, not a WCAG conformance claim. A previously recorded deterministic failure that is no longer reproduced can be reported as a historical change, but absence from a later scan does not by itself prove that the whole page or component conforms to WCAG.

## Visual evidence

Visual evidence in printable reports is optional and user initiated. When requested, FocusTrace may temporarily request the browser permission required to capture the visible page.

Screenshot crops can contain information visible on the inspected page. They are prepared locally for the report and are not intentionally transmitted by FocusTrace.

Users should review exported reports before sharing them with third parties.

## Permissions

FocusTrace uses extension permissions only for product functionality such as analyzing the active page, injecting local instrumentation and storing preferences/session state.

Production builds are designed not to require permanent global host access. Broader screenshot access, when required by the browser API, is requested from an explicit export action and removed after use.

The current permission model is documented in [`README.md`](README.md) and validated by the repository's browser-build checks.

## External links

FocusTrace may provide links to standards documentation, the project repository, contact pages or future voluntary project-support pages. Opening those destinations is governed by the privacy policies of the external service. FocusTrace does not treat use of those services as part of its local accessibility analysis.

## Donations and sponsorship

If voluntary sponsorship or donations are introduced later, payment processing will be handled by the selected external platform. FocusTrace itself is not intended to collect payment-card details.

A future sponsorship feature must not make accessibility functionality conditional on payment unless this policy and the project's public product commitments are explicitly changed.

## Telemetry and analytics

FocusTrace currently has no product analytics or behavioral telemetry pipeline. A contribution must not add telemetry or transmission of inspected-page data without an explicit privacy review and an update to this policy before release.

## Security

Security-sensitive privacy issues should be reported according to [`SECURITY.md`](SECURITY.md), not posted publicly with affected page data or exploit details.

## Changes to this policy

Material changes to FocusTrace data collection, external transmission, permissions or third-party services should update this document in the same pull request that introduces the behavior.

The repository history is the source of record for changes to this policy.
