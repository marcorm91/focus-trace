<p align="right"><strong>English</strong> · <a href="./README.es.md">Español</a></p>

# FocusTrace

**Debug accessibility focus like you debug JavaScript.**

FocusTrace is a local-first browser extension with its own WCAG 2.2 rule engine and a runtime debugger for keyboard focus, SPA navigation and dynamic UI behavior.

The project is in active early development. Automated results are intentionally separated into deterministic failures, contextual review signals and authoring warnings so the extension does not claim certainty it cannot support.

FocusTrace is free software licensed under **GNU GPL v3.0 only**. The source-code license and the FocusTrace project identity are intentionally separate; see [License and project identity](#license-and-project-identity).

## What makes it different?

FocusTrace combines complementary static, structural, runtime and historical workflows instead of treating accessibility as a single scan.

### Full-page and component analysis

The local rule engine evaluates observable WCAG/ARIA/HTML expectations and keeps diagnostic evidence such as accessible-name provenance and measured contrast ratios. A scan can cover the whole page or a selected component subtree while preserving document-wide context where a rule requires it, such as duplicate-ID uniqueness.

Rules are mapped to:

- WCAG 2.2 success criteria;
- W3C ACT Rules where an applicable testing rule exists;
- WAI-ARIA semantics and registry data;
- AccName / HTML-AAM naming behavior;
- HTML authoring requirements when they are useful as non-WCAG warnings;
- WAI-ARIA APG for runtime widget patterns.

FocusTrace uses its own local rule engine and does not require a third-party accessibility scanner.

### Runtime Trace

Trace records what the user did, what had focus, what changed in the page and where focus moved afterwards. Recorded evidence can be inspected as a journey, correlated interactions, a focus graph or a read-only replay.

The runtime debugger can derive deterministic causal explanations for patterns such as a focused node being removed, a modal opening without receiving focus or SPA navigation leaving focus behind. These explanations describe recorded evidence; they do not turn contextual behavior into an automatic WCAG conformance claim.

### Structure

Structure turns the current page DOM into a simplified, on-demand structural view rather than duplicating the browser's raw DOM inspector. The workspace groups four complementary views:

- **Map** — a compact tree of landmarks, semantic elements and relevant containers, with repeated siblings collapsed where useful;
- **Headings** — the existing H1–H6 outline, hierarchy signals and page-location overlay;
- **Semantics** — heuristic review suggestions for patterns such as generic elements used as controls, repeated groups that may form lists, navigation-like link groups, deep generic wrapper chains and high `div` density;
- **Metrics** — DOM composition context such as sampled elements, semantic elements, landmarks, lists, nesting depth and generic-container ratios.

Semantic observations are suggestions for review, **not automatic WCAG failures**. Whether a repeated group should really be a list, for example, still depends on the content's meaning.

Opening Structure does not scan or continuously observe the DOM. Map, Semantics and Metrics are generated only when the user explicitly chooses **Generate** or **Refresh**. The collector defaults to a 10,000-element sample limit and the visual tree is capped at 900 relevant nodes so very large pages cannot turn the feature into continuous background work.

### FocusTrace Memory

FocusTrace Memory is an optional, local history for repeated page and component scans. It is **disabled by default**. When the user enables **Remember accessibility history**, FocusTrace stores bounded local observations so later scans can identify persistent failures, changes, fixes that are no longer reproduced and regressions.

To keep resolved findings understandable, Memory can retain a compact locator such as an id or CSS selector. During an explicit scan, if a failing element is currently visible and the browser permits visible-tab capture, Memory may also save a small local JPEG crop of that element. If capture is unavailable, the locator remains as the fallback. Memory does not store page HTML, a full DOM snapshot or a full-page screenshot.

History is bounded to 8 observations per page/component scope, 200 observations total and 24 visual previews across remembered findings; observations older than 90 days are pruned when Memory storage is next read. Saved history and local evidence can be cleared from Settings even while Memory is disabled.

Memory is diagnostic history rather than proof of WCAG conformance. See [`PRIVACY.md`](PRIVACY.md) for the storage and opt-in model.

### Site Audit

Site Audit discovers same-origin pages from sitemaps, robots.txt, internal links and optional manually supplied URLs, groups repeated route families and runs the real FocusTrace page scanner on representative samples instead of blindly scanning every duplicate URL.

The current Site Audit safety limits are 500 discovered URLs, 30 scanned pages and 3 representative samples per route family. Template-wide findings are reported only when the same normalized target signal appears across every successfully scanned sample in that family. Representative sampling is not proof that every URL is identical, and runtime Trace is not automatically exercised across the whole site.

## Current rule engine

Current static coverage includes:

- page title;
- image accessible name / decorative treatment;
- button, form field and link accessible names;
- visible label contained in the accessible name;
- `aria-hidden="true"` content remaining in sequential focus navigation;
- page language presence and known primary language subtag;
- WCAG 1.4.3 text contrast with structured ratio/color evidence;
- conservative WCAG 1.4.11 non-text contrast coverage for deterministic visual cues;
- positive `tabindex`, placeholder-only labels and heading-level jumps as review signals;
- deprecated/prohibited ARIA authoring signals as warnings;
- duplicate non-empty HTML IDs as an authoring warning, without incorrectly reviving removed WCAG 2.2 SC 4.1.1.

For deterministic contrast failures, FocusTrace can show HEX/RGB values, copy recorded colors and suggest a small sRGB adjustment that reaches the required ratio. Complex visual composition remains REVIEW rather than being manufactured into a false failure.

Runtime recording currently observes:

- keyboard and pointer interactions;
- focus movement, backward navigation, loops and unexpected jumps;
- focused nodes removed or made hidden;
- SPA route changes;
- modal dialog initial focus, focus escape and restoration;
- relevant DOM mutations and dialog lifecycle evidence;
- accessibility breakpoints for selected deterministic runtime causes.

Trace also includes a read-only replay of recorded evidence. The session report combines static findings with runtime interaction stories and recommendations, while **Document structure** summarizes headings instead of duplicating the full outline. If Structure has already been generated, the sidepanel, PDF and TXT reports reuse its compact metrics and semantic suggestions without running another DOM collection or exporting the full DOM tree.

See [`docs/RULES.md`](docs/RULES.md) for methodology, sources and limitations and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the main runtime/data boundaries.

## Browser support

FocusTrace targets Manifest V3.

Currently supported release targets:

- Google Chrome 114+
- Microsoft Edge based on Chromium

Experimental pre-release target:

- Firefox 115+

The Firefox build is generated and validated in CI, but it remains experimental until the manual Firefox smoke checklist has been completed against the packaged build. The same sidepanel UI is generated as a Firefox sidebar by WXT.

## Extension permissions

FocusTrace intentionally keeps its production permission set narrow:

| Permission | Browser | Why it is needed |
| --- | --- | --- |
| `activeTab` | Chrome / Edge / Firefox | Analyze the page the user explicitly activates FocusTrace on and support visible-tab evidence for an explicit analysis when available. |
| `scripting` | Chrome / Edge / Firefox | Inject the local analysis/runtime instrumentation into the active page. |
| `storage` | Chrome / Edge / Firefox | Persist extension preferences, local state and optional bounded FocusTrace Memory evidence. |
| `sidePanel` | Chrome / Edge | Provide the FocusTrace debugging interface in the Chromium side panel. |

Firefox uses its native sidebar manifest integration instead of requesting the Chromium-only `sidePanel` permission.

Production builds do not require host access at installation. HTTP/HTTPS page access is declared as optional and requested from an explicit page action, such as **Analyze this page** or **Generate / Refresh Structure**. Requesting it before reading the active tab is required because Chromium can hide `Tab.url` from a newly installed extension until host access exists. The granted access remains controlled by the browser and can be revoked from the extension's site-access settings.

When Memory is enabled, an explicit scan may attempt a visible-tab capture to create a small local crop of a visible failing element. This Memory flow does not request persistent broad `<all_urls>` screenshot access; if visible-tab capture is unavailable, FocusTrace keeps the compact locator fallback instead.

Printable reports can optionally include visual evidence; when that option is used, FocusTrace requests the browser's `<all_urls>` screenshot capability from the Export PDF click because `tabs.captureVisibleTab()` requires `activeTab` or `<all_urls>`. That broad screenshot permission is removed after the export operation. A localhost host permission is enabled only for the end-to-end test build.

## Privacy

All analysis runs locally in the browser. FocusTrace does not send page content, DOM data, screenshots or recorded interactions to a FocusTrace server or third-party AI API.

Structure snapshots are generated only on explicit request and remain local to the current sidepanel session. Reports can reuse a compact subset of that evidence — metrics and semantic suggestions — but do not persist or export the full Structure tree.

FocusTrace Memory is opt-in and disabled by default. When enabled, it can retain bounded local history, a compact element locator and, when capture succeeds for a currently visible failing element, a small local screenshot crop. This evidence stays in the browser profile and can be cleared from Settings.

Visual evidence in printable reports is optional. Screenshot crops can contain visible page content, are prepared locally and are not transmitted by FocusTrace.

See [`PRIVACY.md`](PRIVACY.md) for the canonical project privacy policy and [`SECURITY.md`](SECURITY.md) for responsible vulnerability reporting.

## License and project identity

FocusTrace source code is distributed under the **GNU General Public License version 3 only (`GPL-3.0-only`)**. See [`LICENSE`](LICENSE).

The GPL allows users to run, study, modify and redistribute covered code under its terms. When a covered modified build is conveyed, the GPL's source-code and license obligations continue to apply.

The FocusTrace name, logo and project identity are not granted by the source-code license for use in a way that implies an unofficial fork is the official FocusTrace release. Forks are welcome, but materially modified distributions should use a distinct primary name and visual identity. See [`TRADEMARKS.md`](TRADEMARKS.md).

Contributions are welcome under the same project license. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

FocusTrace is intended to remain free to use. If voluntary sponsorship is introduced later, sponsorship should support continued development rather than silently changing the accessibility tool into a paywalled product.

## Try the latest development build

After the CI workflow succeeds for a push to `main`, GitHub Actions publishes development artifacts from that exact commit:

- `focustrace-chrome-dev`
- `focustrace-firefox-dev`

### Chrome

1. Open the repository **Actions** tab and choose **Dev Extension**.
2. Open the latest successful run and download `focustrace-chrome-dev`.
3. Unzip it to a local folder.
4. Open `chrome://extensions` and enable **Developer mode**.
5. Choose **Load unpacked** and select the folder that contains `manifest.json`.

To update an existing development installation, download the newest artifact, replace the local folder contents, then press **Reload** on the FocusTrace card in `chrome://extensions`.

### Firefox experimental build

1. Download and unzip `focustrace-firefox-dev` from the latest successful **Dev Extension** run.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on…**.
4. Select the build's `manifest.json`.
5. Open FocusTrace from the toolbar action and complete the Firefox smoke checklist before treating the build as supported.

Each artifact includes `FOCUSTRACE_BUILD.txt` with the source commit SHA and browser target. Development artifacts are unsigned preview builds and are retained for 14 days.

## Development

Requirements:

- Node.js 22
- npm

Install dependencies and start the default Chromium development build:

```bash
npm install
npm run dev
```

Firefox MV3 development build:

```bash
npm run dev:firefox
```

Production builds:

```bash
npm run build
npm run build:edge
npm run build:firefox
```

Package browser artifacts:

```bash
npm run zip
npm run zip:edge
npm run zip:firefox
```

Run the main validation suite:

```bash
npm run check
npm test
npm run standards:validate
```

Run the release gate, including Chrome, Edge and Firefox MV3 production builds:

```bash
npm run release:check
```

Run the complete gate including Chromium browser E2E tests:

```bash
npm run release:check:full
```

See [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) before tagging a release or changing repository visibility.
